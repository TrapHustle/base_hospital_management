/** @odoo-module */
import { registry } from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { useRef, onMounted } from "@odoo/owl";
import { Component, useState } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";

export class ReceptionDashboard extends Component {
    setup() {
        super.setup(...arguments);
        this.ref              = useRef('root');
        this.patient_creation = useRef('patient_creation');
        this.out_patient      = useRef('out-patient');
        this.inpatient        = useRef('inpatient');
        this.room_ward        = useRef('room_ward');
        this.ward             = useRef('ward');
        this.room             = useRef('room');
        this.rd_buttons       = useRef('rd_buttons');

        this.orm           = useService('orm');
        this.user          = user;
        this.actionService = useService("action");

        this.state = useState({
            activeSection    : null,
            patient_lst      : [],
            ward_data        : [],
            room_data        : [],
            recent_activities: [],
            stats: {
                total_patients          : 0,
                outpatient_appointments : 0,
                inpatient_admissions    : 0,
                available_rooms         : 0,
            },
        });

        onMounted(async () => {
            await this._loadStats();
            await this._loadPatientList();
            await this._loadRecentActivities();
            await this._loadDoctors();
        });
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    async _loadStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [totalPatients, appointments, inpatients, rooms] = await Promise.all([
                this.orm.call('res.partner', 'search_count',
                    [[['patient_seq', 'not in', ['New', 'Employee', 'User']]]]),
                this.orm.call('hospital.outpatient', 'search_count',
                    [[['op_date', '=', today], ['state', '!=', 'cancel']]]),
                this.orm.call('hospital.inpatient', 'search_count',
                    [[['state', '=', 'admit']]]),
                this.orm.call('hospital.patient.room', 'search_count',
                    [[['state', '=', 'available']]]),
            ]);
            Object.assign(this.state.stats, {
                total_patients          : totalPatients,
                outpatient_appointments : appointments,
                inpatient_admissions    : inpatients,
                available_rooms         : rooms,
            });
        } catch (e) {
            console.warn('Stats error:', e);
        }
    }

    // ─── Data Loaders ────────────────────────────────────────────────────────

    async _loadPatientList() {
        try {
            this.state.patient_lst = await this.orm.call(
                'res.partner', 'search_read',
                [[['patient_seq', 'not in', ['New', 'Employee', 'User']]],
                 ['id', 'name']]
            );
        } catch (e) { console.warn('Patient list error:', e); }
    }

    async _loadDoctors() {
        try {
            const doctors = await this.orm.call(
                'res.partner', 'search_read',
                [[['is_doctor', '=', true]], ['id', 'name']]
            );
            // Populate doctor selects
            ['sl_dr', 'attending_doctor_id'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.innerHTML = '';
                doctors.forEach(doc => {
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.textContent = doc.name;
                    el.appendChild(opt);
                });
            });

            // Populate inpatient patient select
            const ipSelect = document.getElementById('sl_patient_id');
            if (ipSelect) {
                ipSelect.innerHTML = '';
                this.state.patient_lst.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name;
                    ipSelect.appendChild(opt);
                });
            }
        } catch (e) { console.warn('Doctors error:', e); }
    }

    async _loadRecentActivities() {
        const activities = [];
        try {
            const [recentOPs, recentAdmissions] = await Promise.all([
                this.orm.call('hospital.outpatient', 'search_read',
                    [[['state', '!=', 'cancel']],
                     ['op_reference', 'patient_id', 'create_date'],
                     0, 4, 'create_date desc']),
                this.orm.call('hospital.inpatient', 'search_read',
                    [[['state', '=', 'admit']],
                     ['name', 'patient_id', 'hosp_date'],
                     0, 3, 'hosp_date desc']),
            ]);

            recentOPs.forEach(op => activities.push({
                id    : `op_${op.id}`,
                type  : 'outpatient',
                title : `Consultation — ${op.patient_id[1]} (${op.op_reference})`,
                time  : this._relativeTime(op.create_date),
            }));

            recentAdmissions.forEach(ip => activities.push({
                id    : `ip_${ip.id}`,
                type  : 'inpatient',
                title : `Admission — ${ip.patient_id[1]} (${ip.name})`,
                time  : this._relativeTime(ip.hosp_date),
            }));

            this.state.recent_activities = activities.slice(0, 6);
        } catch (e) { console.warn('Activities error:', e); }
    }

    // ─── Navigation ──────────────────────────────────────────────────────────

    _hideAll() {
        [this.patient_creation, this.out_patient,
         this.inpatient, this.room_ward].forEach(ref => {
            ref.el?.classList.add('d-none');
        });
    }

    createPatient() {
        this._hideAll();
        this.state.activeSection = 'patient';
        this.patient_creation.el?.classList.remove('d-none');
    }

    fetchAppointmentData() {
        this._hideAll();
        this.state.activeSection = 'outpatient';
        this.out_patient.el?.classList.remove('d-none');
    }

    createInPatient() {
        this._hideAll();
        this.state.activeSection = 'inpatient';
        this.inpatient.el?.classList.remove('d-none');
    }

    fetchRoomWard() {
        this._hideAll();
        this.state.activeSection = 'roomward';
        this.room_ward.el?.classList.remove('d-none');
        // Hide sub-sections until user clicks
        this.ward.el?.classList.add('d-none');
        this.room.el?.classList.add('d-none');
    }

    async fetchRoom() {
        this.ward.el?.classList.add('d-none');
        this.room.el?.classList.remove('d-none');
        try {
            this.state.room_data = await this.orm.call(
                'hospital.patient.room', 'search_read',
                [[], ['display_name', 'bed_type', 'rent', 'state']]
            );
        } catch (e) { console.warn('Room error:', e); }
    }

    async fetchWard() {
        this.room.el?.classList.add('d-none');
        this.ward.el?.classList.remove('d-none');
        try {
            this.state.ward_data = await this.orm.call(
                'hospital.ward', 'search_read',
                [[], ['display_name', 'building_id', 'floor_no', 'bed_count']]
            );
        } catch (e) { console.warn('Ward error:', e); }
    }

    // ─── Patient Card toggle ──────────────────────────────────────────────────

    patient_card() {
        const select = document.getElementById('select_type');
        const label  = document.getElementById('patient_label');
        const sl     = document.getElementById('sl_patient');
        if (!select || !label || !sl) return;
        const show = select.value === 'have_card';
        label.style.display = show ? 'block' : 'none';
        sl.style.display    = show ? 'block' : 'none';
    }

    async fetch_patient_id() {
        const select = document.getElementById('sl_patient');
        if (!select?.value) return;
        try {
            const result = await this.orm.call(
                'res.partner', 'read',
                [[parseInt(select.value)], ['name', 'phone', 'email', 'dob', 'blood_group']]
            );
            if (!result?.length) return;
            const p = result[0];
            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };
            set('o_patient-name',  p.name);
            set('o_patient-phone', p.phone);
            set('o_patient-dob',   p.dob);
            const bg = document.getElementById('o_patient_bloodgroup');
            if (bg && p.blood_group) bg.value = p.blood_group.toLowerCase();
        } catch (e) { console.warn('fetch_patient_id error:', e); }
    }

    // ─── Save handlers ────────────────────────────────────────────────────────

    async savePatient() {
        const name = document.getElementById('patient-name')?.value;
        if (!name) { alert('Veuillez saisir le nom du patient.'); return; }

        const fileInput = document.getElementById('patient-img');
        let imageBase64 = '';
        if (fileInput?.files?.length) {
            imageBase64 = await this._fileToBase64(fileInput.files[0]);
        }

        const data = {
            name,
            phone       : document.getElementById('patient-phone')?.value || '',
            email       : document.getElementById('patient-mail')?.value  || '',
            dob         : document.getElementById('patient-dob')?.value   || '',
            blood_group : document.getElementById('patient-bloodgroup')?.value || '',
            gender      : document.querySelector('input[name="gender"]:checked')?.value || '',
            marital     : document.getElementById('patient-m-status')?.value || '',
            rh_type     : document.querySelector('input[name="rhtype"]:checked')?.value || '+',
            image_1920  : imageBase64,
        };

        try {
            await this.orm.call('res.partner', 'create_patient_from_reception', [data]);
            alert('Patient enregistré avec succès !');
            this.state.activeSection = null;
            this._hideAll();
            await this._loadStats();
            await this._loadPatientList();
            await this._loadRecentActivities();
        } catch (e) {
            alert('Erreur lors de la création du patient.');
            console.error(e);
        }
    }

    async save_out_patient_data() {
        const opDate = document.getElementById('op_date')?.value;
        const name   = document.getElementById('o_patient-name')?.value;
        if (!opDate) { alert('Veuillez saisir la date OP.'); return; }
        if (!name)   { alert('Veuillez saisir le nom du patient.'); return; }

        const data = {
            patient_name : name,
            phone        : document.getElementById('o_patient-phone')?.value || '',
            dob          : document.getElementById('o_patient-dob')?.value   || '',
            blood_group  : document.getElementById('o_patient_bloodgroup')?.value || '',
            gender       : document.querySelector('input[name="op_gender"]:checked')?.value || '',
            op_date      : opDate,
            reason       : document.getElementById('reason')?.value || '',
            slot         : document.getElementById('slot')?.value   || '',
            doctor_id    : document.getElementById('sl_dr')?.value  || false,
            partner_id   : document.getElementById('sl_patient')?.value || false,
        };

        try {
            await this.orm.call('hospital.outpatient', 'create_outpatient_from_reception', [data]);
            alert('Outpatient enregistré avec succès !');
            this.state.activeSection = null;
            this._hideAll();
            await this._loadStats();
            await this._loadRecentActivities();
        } catch (e) {
            alert('Erreur lors de la création du rendez-vous.');
            console.error(e);
        }
    }

    async save_in_patient_data() {
        const patientId = document.getElementById('sl_patient_id')?.value;
        const doctorId  = document.getElementById('attending_doctor_id')?.value;
        if (!patientId) { alert('Veuillez sélectionner un patient.'); return; }
        if (!doctorId)  { alert('Veuillez sélectionner un médecin.'); return; }

        const data = {
            patient_id    : parseInt(patientId),
            reason        : document.getElementById('reason_of_admission')?.value || '',
            admission_type: document.getElementById('admission_type')?.value || 'routine',
            doctor_id     : parseInt(doctorId),
        };

        try {
            await this.orm.call('hospital.inpatient', 'create_inpatient_from_reception', [data]);
            alert('Inpatient enregistré avec succès !');
            this.state.activeSection = null;
            this._hideAll();
            await this._loadStats();
            await this._loadRecentActivities();
        } catch (e) {
            alert('Erreur lors de la création de l\'inpatient.');
            console.error(e);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    _relativeTime(dateStr) {
        if (!dateStr) return '';
        const diff  = Date.now() - new Date(dateStr).getTime();
        const mins  = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days  = Math.floor(diff / 86400000);
        if (mins  <  1) return "À l'instant";
        if (mins  < 60) return `Il y a ${mins} min`;
        if (hours < 24) return `Il y a ${hours}h`;
        if (days  === 1) return "Hier";
        if (days  <  7) return `Il y a ${days} jours`;
        return new Date(dateStr).toLocaleDateString('fr-FR');
    }

    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

ReceptionDashboard.template = "ReceptionDashboard";
registry.category("actions").add('reception_dashboard_tags', ReceptionDashboard);