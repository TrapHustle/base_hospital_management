/**
 * Self-hosted WebRTC teleconsultation room (standalone page).
 *
 * Config is read from the #tc-root data attributes. Signaling goes through the
 * Odoo JSON routes /teleconsultation/signal/*; the audio/video stream is
 * peer-to-peer (Google STUN for NAT traversal). The doctor is the caller and
 * the patient answers.
 */
(function () {
    "use strict";

    var root = document.getElementById('tc-root');
    if (!root) { return; }

    var TOKEN = root.dataset.token;
    var ROLE = root.dataset.role === 'doctor' ? 'doctor' : 'patient';
    var IS_CALLER = ROLE === 'doctor';
    var PEER = 'p_' + Math.random().toString(36).slice(2) + '_' +
        Date.now().toString(36);

    // Serveurs ICE (STUN + TURN). Le TURN relaie le flux quand le P2P direct
    // est bloqué (isolation du hotspot, pare-feu, NAT symétrique). Les
    // identifiants sont récupérés dynamiquement depuis Metered au démarrage
    // (voir fetchIceServers) ; on garde un STUN Google par défaut en secours.
    var METERED_ICE_URL = 'https://triumph_odoo.metered.live/api/v1/turn/' +
        'credentials?apiKey=ad8122fd770566b2bc893d7ae16e59b7fc1b';
    var RTC_CONFIG = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    function fetchIceServers() {
        return fetch(METERED_ICE_URL).then(function (r) {
            return r.json();
        }).then(function (servers) {
            if (Array.isArray(servers) && servers.length) {
                RTC_CONFIG.iceServers = servers;
                console.log('[TC] TURN Metered chargé :', servers.length,
                    'serveurs ICE');
            }
        }).catch(function (e) {
            console.warn('[TC] échec récupération TURN Metered, STUN seul', e);
        });
    }

    var localVideo = document.getElementById('tc-local');
    var remoteVideo = document.getElementById('tc-remote');
    var waitingEl = document.getElementById('tc-waiting');
    var statusEl = document.getElementById('tc-status');
    var errorEl = document.getElementById('tc-error');
    var errorTitle = document.getElementById('tc-error-title');
    var errorMsg = document.getElementById('tc-error-msg');

    var pc = null;
    var localStream = null;
    var lastId = 0;
    var remotePeer = null;
    var remoteSet = false;
    var offered = false;
    var pendingIce = [];
    var closed = false;

    function setStatus(t) { statusEl.textContent = t; }
    function showWaiting(show) { waitingEl.style.display = show ? 'flex' : 'none'; }
    function showError(title, msg) {
        errorTitle.textContent = title;
        errorMsg.textContent = msg;
        errorEl.classList.add('show');
    }

    function rpc(url, params) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0', method: 'call', params: params || {}
            })
        }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.error) { throw new Error(JSON.stringify(d.error)); }
            return d.result;
        });
    }

    function send(kind, payload, target) {
        return rpc('/teleconsultation/signal/send', {
            token: TOKEN, sender: PEER, role: ROLE,
            target: target || '', kind: kind, payload: payload
        }).catch(function (e) { console.error('signal send failed', e); });
    }

    function createPeer() {
        pc = new RTCPeerConnection(RTC_CONFIG);
        localStream.getTracks().forEach(function (t) {
            pc.addTrack(t, localStream);
        });
        pc.onicecandidate = function (ev) {
            if (ev.candidate) {
                var c = ev.candidate.candidate || '';
                var typ = (c.match(/typ (\w+)/) || [])[1] || '?';
                console.log('[TC] candidat local:', typ, c);
                send('ice', ev.candidate.toJSON(), remotePeer);
            } else {
                console.log('[TC] fin de collecte ICE');
            }
        };
        pc.oniceconnectionstatechange = function () {
            console.log('[TC] iceConnectionState =', pc && pc.iceConnectionState);
        };
        pc.onicegatheringstatechange = function () {
            console.log('[TC] iceGatheringState =', pc && pc.iceGatheringState);
        };
        pc.ontrack = function (ev) {
            remoteVideo.srcObject = ev.streams[0];
            showWaiting(false);
            setStatus('Connecté');
        };
        pc.onconnectionstatechange = function () {
            if (!pc) { return; }
            var s = pc.connectionState;
            console.log('[TC] connectionState =', s);
            if (s === 'connected') { showWaiting(false); }
            else if (s === 'failed') {
                setStatus('Connexion échouée');
                showWaiting(true);
            } else if (s === 'disconnected') {
                setStatus('Participant déconnecté');
            }
        };
    }

    function flushIce() {
        pendingIce.forEach(function (c) {
            pc.addIceCandidate(c).catch(function (e) {
                console.warn('addIceCandidate', e);
            });
        });
        pendingIce = [];
    }

    function handleMessage(m) {
        if (m.kind === 'join') {
            // Caller starts the offer as soon as a patient shows up.
            if (IS_CALLER && !offered && m.role === 'patient') {
                offered = true;
                remotePeer = m.sender;
                setStatus('Appel en cours…');
                return pc.createOffer().then(function (offer) {
                    return pc.setLocalDescription(offer).then(function () {
                        send('offer', { type: offer.type, sdp: offer.sdp },
                            remotePeer);
                    });
                });
            }
        } else if (m.kind === 'offer') {
            if (IS_CALLER) { return; }
            remotePeer = m.sender;
            return pc.setRemoteDescription(m.payload).then(function () {
                remoteSet = true;
                flushIce();
                return pc.createAnswer();
            }).then(function (answer) {
                return pc.setLocalDescription(answer).then(function () {
                    send('answer', { type: answer.type, sdp: answer.sdp },
                        remotePeer);
                    setStatus('Connexion…');
                });
            });
        } else if (m.kind === 'answer') {
            if (!IS_CALLER) { return; }
            return pc.setRemoteDescription(m.payload).then(function () {
                remoteSet = true;
                flushIce();
                setStatus('Connexion…');
            });
        } else if (m.kind === 'ice') {
            if (remoteSet) {
                return pc.addIceCandidate(m.payload).catch(function (e) {
                    console.warn('addIceCandidate', e);
                });
            }
            pendingIce.push(m.payload);
        } else if (m.kind === 'bye') {
            if (remoteVideo.srcObject) { remoteVideo.srcObject = null; }
            if (m.role === 'doctor' && !IS_CALLER) {
                // The doctor ended the consultation: leave the room too.
                setStatus('Le médecin a terminé la consultation');
                showWaiting(true);
                setTimeout(hangup, 2500);
                return;
            }
            setStatus('Le participant a quitté');
            showWaiting(true);
        }
    }

    function poll() {
        if (closed) { return; }
        rpc('/teleconsultation/signal/poll', {
            token: TOKEN, sender: PEER, after: lastId
        }).then(function (res) {
            lastId = res.last || lastId;
            var chain = Promise.resolve();
            (res.messages || []).forEach(function (m) {
                chain = chain.then(function () { return handleMessage(m); });
            });
            return chain;
        }).catch(function (e) {
            console.error('poll failed', e);
        }).then(function () {
            if (!closed) { setTimeout(poll, 900); }
        });
    }

    function hangup() {
        if (closed) { return; }
        closed = true;
        send('bye', null, remotePeer);
        if (pc) { try { pc.close(); } catch (e) {} pc = null; }
        if (localStream) {
            localStream.getTracks().forEach(function (t) { t.stop(); });
        }
        showWaiting(true);
        setStatus('Appel terminé');
        // window.close() only works when the tab was opened by script (the
        // doctor's backend button); on a phone the patient navigated here, so
        // fall back to a redirect out of the room.
        setTimeout(function () {
            try { window.close(); } catch (e) {}
            setTimeout(function () {
                window.location.href = IS_CALLER ? '/odoo' : '/my/appointments';
            }, 250);
        }, 300);
    }

    // ---- Controls -----------------------------------------------------------
    document.getElementById('tc-mic').addEventListener('click', function () {
        if (!localStream) { return; }
        var on = false;
        localStream.getAudioTracks().forEach(function (t) {
            t.enabled = !t.enabled; on = t.enabled;
        });
        this.classList.toggle('off', !on);
    });
    document.getElementById('tc-cam').addEventListener('click', function () {
        if (!localStream) { return; }
        var on = false;
        localStream.getVideoTracks().forEach(function (t) {
            t.enabled = !t.enabled; on = t.enabled;
        });
        this.classList.toggle('off', !on);
    });
    document.getElementById('tc-hangup').addEventListener('click', hangup);
    window.addEventListener('beforeunload', function () {
        if (!closed) { send('bye', null, remotePeer); }
    });

    // ---- Start --------------------------------------------------------------
    function start() {
        var secure = window.isSecureContext ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1';
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showError('Caméra indisponible',
                'Ce navigateur ne permet pas l\'accès à la caméra. ' +
                (secure ? '' : 'Ouvrez la page en HTTPS (ou sur localhost).'));
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(function (stream) {
                localStream = stream;
                localVideo.srcObject = localStream;
                createPeer();
                setStatus(IS_CALLER ? 'En attente du patient…'
                    : 'En attente du médecin…');
                return send('join', null);
            }).then(function () {
                poll();
            }).catch(function (e) {
                console.error('getUserMedia failed', e);
                showError('Accès caméra/micro refusé',
                    'Autorisez la caméra et le microphone. ' +
                    (secure ? 'Vérifiez les permissions du navigateur.'
                        : 'Sur téléphone, la caméra exige une adresse HTTPS ' +
                          '(un lien en http://192.168… est bloqué par le ' +
                          'navigateur).'));
            });
    }

    // Récupère les serveurs TURN avant d'ouvrir la connexion, puis démarre.
    fetchIceServers().then(start);
})();
