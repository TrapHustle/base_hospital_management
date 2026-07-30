# -*- coding: utf-8 -*-
"""Self-hosted WebRTC teleconsultation.

Two peers (doctor and patient) open the same room page identified by the
appointment's secret ``video_call_token``. They negotiate a peer-to-peer
WebRTC connection by exchanging small signaling messages through the two JSON
routes below; the audio/video stream itself flows directly browser-to-browser
(a public Google STUN server is used for NAT traversal). No external video
service is involved.
"""
import json

from odoo import fields, http
from odoo.http import request


class Teleconsultation(http.Controller):

    def _room_op(self, token):
        """Return the teleconsultation appointment for a room token, or None."""
        if not token:
            return None
        op = request.env['hospital.outpatient'].sudo().search(
            [('video_call_token', '=', token),
             ('is_teleconsultation', '=', True)], limit=1)
        return op or None

    @http.route(['/teleconsultation/room/<string:token>'],
                type='http', auth='public', website=False, sitemap=False)
    def teleconsultation_room(self, token, role='patient', **kw):
        """Render the standalone WebRTC room page for a given room token."""
        op = self._room_op(token)
        if not op:
            return request.not_found()
        role = 'doctor' if role == 'doctor' else 'patient'
        values = {
            'token': token,
            'role': role,
            'op_reference': op.op_reference or '',
            'doctor_name': op.doctor_id.doctor_id.name or 'Médecin',
            'patient_name': op.patient_id.name or 'Patient',
        }
        html = request.env['ir.qweb'].sudo()._render(
            'base_hospital_management.teleconsultation_room', values)
        return request.make_response(
            '<!DOCTYPE html>' + str(html),
            headers=[('Content-Type', 'text/html; charset=utf-8')])

    @http.route(['/teleconsultation/signal/send'],
                type='json', auth='public', csrf=False)
    def teleconsultation_signal_send(self, token=None, sender=None, role=None,
                                     target=None, kind=None, payload=None):
        """Store one signaling message for the room."""
        op = self._room_op(token)
        if not op or not sender or not kind:
            return {'ok': False}
        if kind == 'join' and role == 'patient':
            self._notify_doctor_incoming_call(op)
        elif kind == 'join' and role == 'doctor' and op.video_call_ended:
            op.write({'video_call_ended': False})  # le médecin rouvre la salle
        elif kind == 'bye' and role == 'doctor':
            op.write({'video_call_ended': fields.Datetime.now()})
        request.env['hospital.teleconsult.signal'].sudo().create({
            'room': token,
            'sender': sender,
            'role': role or '',
            'target': target or '',
            'kind': kind,
            'payload': json.dumps(payload) if payload is not None else '',
        })
        return {'ok': True}

    def _notify_doctor_incoming_call(self, op):
        """Tell the doctor's web client that the patient entered the room.

        Falls back to the admin user when the doctor employee has no linked
        Odoo user (demo setup).
        """
        doctor_user = (op.doctor_id.doctor_id.user_id
                       or request.env.ref('base.user_admin', False))
        if not doctor_user:
            return
        request.env['bus.bus'].sudo()._sendone(
            doctor_user.partner_id, 'teleconsult_incoming_call', {
                'op_reference': op.op_reference or '',
                'patient_name': op.patient_id.name or 'Patient',
                'url': '/teleconsultation/room/%s?role=doctor'
                       % op.video_call_token,
            })

    @http.route(['/teleconsultation/signal/poll'],
                type='json', auth='public', csrf=False)
    def teleconsultation_signal_poll(self, token=None, sender=None, after=0):
        """Return recent messages for the room not sent by the caller.

        Only messages either broadcast (no target) or addressed to the caller
        are returned, in id order, so the client can process them as a stream.
        """
        if not self._room_op(token):
            return {'messages': [], 'last': after}
        Signal = request.env['hospital.teleconsult.signal'].sudo()
        cutoff = request.env['hospital.teleconsult.signal']._signal_cutoff()
        records = Signal.search([
            ('room', '=', token),
            ('id', '>', int(after or 0)),
            ('sender', '!=', sender or ''),
            ('create_date', '>=', cutoff),
        ], order='id asc')
        messages = []
        last = int(after or 0)
        for rec in records:
            last = rec.id
            if rec.target and rec.target != sender:
                continue
            messages.append({
                'id': rec.id,
                'sender': rec.sender,
                'role': rec.role,
                'target': rec.target,
                'kind': rec.kind,
                'payload': json.loads(rec.payload) if rec.payload else None,
            })
        return {'messages': messages, 'last': last}
