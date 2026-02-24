/** @odoo-module */
import { registry} from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { useRef, useBus } from "@odoo/owl";
import { Component, useState, onWillStart, onMounted } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";

// Doctor dashboard component initialization
export class DoctorDashboard extends Component {
    setup() {
        super.setup(...arguments);
        this.ref = useRef('root')
        this.orm = useService('orm')
        this.user = user;
        this.actionService = useService("action");
        this.welcome = useRef("welcome");
        this.consultationsChartRef = useRef("consultationsChart");
        this.pathologiesChartRef = useRef("pathologiesChart");
        
        this.state = useState({
            patients : [],
            search_button : false,
            patients_search : [],
            activeSection: null,
            doctorName: '',
            doctorInitials: '',
            currentDate: '',
            consultationsCount: 0,
            consultationsSubtitle: '',
            patientsWaitingCount: 0,
            patientsSubtitle: '',
            surgeriesCount: 0,
            surgeriesSubtitle: '',
            alertsCount: 0,
            alertsSubtitle: '',
            notificationCount: 0,
            appointments: [],
            recent_patients: [],
            surgeries: [],
            consultationChartData: null,
            pathologiesChartData: null,
        });
        
        onWillStart(async () => await this.load_dashboard_data());
        onMounted(async () => await this.initialize_charts());
    }
    
    // Load real data from database
    async load_dashboard_data() {
        try {
            // Get doctor name and initials
            const doctorData = await this.orm.read('res.users', [this.user.id], ['name']);
            if (doctorData && doctorData.length > 0) {
                this.state.doctorName = doctorData[0].name;
                // Get initials
                const names = doctorData[0].name.split(' ');
                if (names.length > 0) {
                    this.state.doctorInitials = names.map(n => n[0]).join('').toUpperCase().substring(0, 2);
                }
            }
            
            // Set current date
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            this.state.currentDate = today.toLocaleDateString('fr-FR', options);
            
            const todayStr = today.toISOString().split('T')[0];

            const doctorEmployee = await this.orm.search_read(
                'hr.employee',
                [['user_id', '=', this.user.id], ['job_id.name', '=', 'Doctor']],
                ['id'],
                { limit: 1 }
            );
            const doctorEmployeeId = doctorEmployee.length ? doctorEmployee[0].id : false;

            const consultations = await this.orm.call('hospital.outpatient', 'search_count', [[
                ['op_date', '=', todayStr],
                ['doctor_id.doctor_id.user_id', '=', this.user.id],
                ['state', 'in', ['op', 'invoice']]
            ]]);
            this.state.consultationsCount = consultations || 0;
            this.state.consultationsSubtitle = consultations ? 'Consultations du jour' : 'Aucune consultation';
            
            const waitingPatients = await this.orm.call('hospital.outpatient', 'search_count', [[
                ['op_date', '=', todayStr],
                ['doctor_id.doctor_id.user_id', '=', this.user.id],
                ['state', '=', 'draft']
            ]]);
            this.state.patientsWaitingCount = waitingPatients || 0;
            this.state.patientsSubtitle = waitingPatients ? 'Patients en attente' : 'Aucun patient en attente';
            
            let surgeriesData = [];
            if (doctorEmployeeId) {
                surgeriesData = await this.orm.call('inpatient.surgery', 'get_doctor_slot', []);
            }

            const todayDate = new Date(todayStr);
            const upcomingSurgeries = [];
            if (surgeriesData && surgeriesData.length) {
                surgeriesData.forEach((rec) => {
                    let rawDate = null;
                    if (rec.planned_date) {
                        rawDate = new Date(rec.planned_date);
                    }
                    if (!rawDate || rawDate >= todayDate) {
                        upcomingSurgeries.push({
                            id: rec.id,
                            rawDate: rawDate,
                            planned_date: rec.planned_date,
                            patient_name: rec.patient_id,
                            surgery_name: rec.surgery_name,
                            state: rec.state,
                        });
                    }
                });
            }

            upcomingSurgeries.sort((a, b) => {
                if (!a.rawDate && !b.rawDate) {
                    return 0;
                }
                if (!a.rawDate) {
                    return 1;
                }
                if (!b.rawDate) {
                    return -1;
                }
                return a.rawDate - b.rawDate;
            });

            this.state.surgeriesCount = upcomingSurgeries.length;
            this.state.surgeriesSubtitle = upcomingSurgeries.length ? 'Chirurgies à venir' : 'Aucune chirurgie planifiée';

            this.state.surgeries = upcomingSurgeries.slice(0, 5).map((rec) => {
                let formatted = 'À planifier';
                if (rec.rawDate) {
                    formatted = rec.rawDate.toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                }
                return {
                    id: rec.id,
                    date: formatted,
                    patient_name: rec.patient_name,
                    name: rec.surgery_name,
                    state: rec.state,
                };
            });
            
            let alerts = 0;
            if (doctorEmployeeId) {
                alerts = await this.orm.call('hospital.inpatient', 'search_count', [[
                    ['attending_doctor_id', '=', doctorEmployeeId],
                    ['state', '=', 'admit']
                ]]);
            }
            this.state.alertsCount = alerts || 0;
            this.state.alertsSubtitle = alerts ? 'Patients hospitalisés' : 'Aucun patient hospitalisé';
            this.state.notificationCount = (alerts || 0) + (waitingPatients || 0);
            
            const appointmentsData = await this.orm.search_read('hospital.outpatient', [
                ['op_date', '=', todayStr],
                ['doctor_id.doctor_id.user_id', '=', this.user.id],
                ['state', '!=', 'cancel']
            ], ['op_reference', 'slot', 'state', 'patient_id'], { limit: 4, order: 'slot asc' });
            
            this.state.appointments = (appointmentsData || []).map(apt => ({
                time: typeof apt.slot === 'number' ? this._formatSlot(apt.slot) : '--:--',
                patient_name: apt.patient_id ? apt.patient_id[1] : 'Patient',
                type: apt.op_reference || 'Consultation',
                urgent: apt.state === 'draft'
            }));
            
            this.state.recent_patients = [];
            
            const yesterdayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthStart = yesterdayMonth.toISOString().split('T')[0];
            
            const monthConsultations = await this.orm.search_read('hospital.outpatient', [
                ['op_date', '>=', monthStart],
                ['op_date', '<=', todayStr],
                ['doctor_id.doctor_id.user_id', '=', this.user.id]
            ], ['op_date', 'state'], {});
            
            const consultationsByDay = {};
            
            if (monthConsultations && monthConsultations.length > 0) {
                monthConsultations.forEach(record => {
                    const dateVal = new Date(record.op_date);
                    const day = dateVal.getDate();
                    consultationsByDay[day] = (consultationsByDay[day] || 0) + 1;
                });
            }
            
            const statusCount = {};
            if (monthConsultations && monthConsultations.length > 0) {
                monthConsultations.forEach(record => {
                    const mapping = {
                        draft: 'Brouillon',
                        op: 'OP',
                        inpatient: 'Hospitalisé',
                        invoice: 'Facturé',
                        cancel: 'Annulé',
                    };
                    const label = mapping[record.state] || 'Autre';
                    statusCount[label] = (statusCount[label] || 0) + 1;
                });
            }
            
            this.state.consultationChartData = consultationsByDay;
            this.state.pathologiesChartData = statusCount;
            
        } catch (error) {
            console.error('Erreur chargement dashboard:', error);
        }
    }

    _formatSlot(slot) {
        const hours = Math.floor(slot);
        const minutes = Math.round((slot - hours) * 60);
        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        return `${h}:${m}`;
    }
    
    async initialize_charts() {
        try {
            // Check if Chart.js is loaded
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded, skipping chart initialization');
                return;
            }
            
            // Initialize consultations chart
            const consultationChartCanvas = this.consultationsChartRef.el;
            if (consultationChartCanvas && this.state.consultationChartData) {
                const days = Object.keys(this.state.consultationChartData).sort((a, b) => a - b);
                const values = days.map(day => this.state.consultationChartData[day]);
                
                new Chart(consultationChartCanvas, {
                    type: 'line',
                    data: {
                        labels: days.map(d => `Jour ${d}`),
                        datasets: [{
                            label: 'Consultations',
                            data: values,
                            borderColor: '#6b5b95',
                            backgroundColor: 'rgba(107, 91, 149, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 4,
                            pointBackgroundColor: '#6b5b95',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f5f5f7'
                                },
                                ticks: {
                                    color: '#86868b'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: '#86868b'
                                }
                            }
                        }
                    }
                });
            }
            
            // Initialize pathologies chart (donut)
            const pathologiesChartCanvas = this.pathologiesChartRef.el;
            if (pathologiesChartCanvas && Object.keys(this.state.pathologiesChartData).length > 0) {
                const labels = Object.keys(this.state.pathologiesChartData);
                const values = Object.values(this.state.pathologiesChartData);
                
                new Chart(pathologiesChartCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: values,
                            backgroundColor: [
                                '#6b5b95',
                                '#8b7ab8',
                                '#007aff',
                                '#5a6c7d',
                                '#a8a8a8'
                            ],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom'
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Erreur initialisation graphiques:', error);
        }
    }

    //Function for fetching patient data
    async list_patient_data(){
        this.actionService.doAction({
            name: _t('Patient details'),
            type: 'ir.actions.act_window',
            res_model: 'res.partner',
            view_mode: 'list,form',
            views: [[false, 'list'],[false, 'form']],
            domain: [['patient_seq', 'not in', ['New', 'Employee', 'User']]]
        });
        const patients = await this.orm.call('res.partner', 'fetch_patient_data', [],);
        this.state.patients = patients;
        this.state.activeSection = 'patient';
    }

    //  Method for generating list of inpatients
    action_list_inpatient() {
        this.actionService.doAction({
            name: _t('Inpatient details'),
            type: 'ir.actions.act_window',
            res_model: 'hospital.inpatient',
            view_mode: 'list,form',
            views: [[false, 'list'],[false, 'form']],
        });
        this.state.activeSection = 'inpatient';

    }

    //  Fetch surgery details
    fetch_doctors_schedule() {
         this.actionService.doAction({
            name: _t('Surgery details'),
            type: 'ir.actions.act_window',
            res_model: 'inpatient.surgery',
            view_mode: 'list,form',
            views: [[false, 'list'],[false, 'form']],
        });
        this.state.activeSection = 'surgery';
    }

    //  Fetch op details
    fetch_consultation(){
        this.actionService.doAction({
            name: _t('Outpatient Details'),
            type: 'ir.actions.act_window',
            res_model: 'hospital.outpatient',
            view_mode: 'list,form',
            views: [[false, 'list']],
        });
        this.state.activeSection = 'consultation';
    }

    //  Fetch allocation details
    fetch_allocation_lines() {
        this.actionService.doAction({
            name: _t('Doctor Allocation'),
            type: 'ir.actions.act_window',
            res_model: 'doctor.allocation',
            view_mode: 'list,form',
            views: [[false, 'list'],[false, 'form']]
        });
        this.state.activeSection = 'shift';
    }
}

DoctorDashboard.template = "DoctorDashboard"
registry.category("actions").add('doctor_dashboard_tags', DoctorDashboard);
