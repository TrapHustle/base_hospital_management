/** @odoo-module */
import { registry } from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { useRef, onMounted, onWillUnmount } from "@odoo/owl";
import { Component, useState } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";
import { loadJS } from "@web/core/assets";  // ✅ FIX: import correct pour charger Chart.js dans Odoo

export class DoctorDashboard extends Component {
    setup() {
        super.setup(...arguments);
        this.ref = useRef('root');
        this.orm = useService('orm');
        this.user = user;
        this.actionService = useService("action");

        // Chart canvas refs
        this.consultationsChartRef = useRef("consultationsChart");
        this.admissionsChartRef    = useRef("admissionsChart");
        this.weeklyChartRef        = useRef("weeklyChart");
        this.workloadChartRef      = useRef("workloadChart");

        this.state = useState({
            user_name: '',
            activeSection: null,
            stats: {
                total_patients      : 0,
                consultations_today : 0,
                active_inpatients   : 0,
                active_allocations  : 0,
                total_slots         : 0,
                patients_trend      : 12,
                consultations_trend : 8,
                inpatients_trend    : -3,
            },
            recent_activities: [],
        });

        // Chart instances (pour pouvoir les détruire proprement)
        this.charts = {
            consultations : null,
            admissions    : null,
            weekly        : null,
            workload      : null,
        };

        onMounted(async () => {
            await this.loadDashboardData();
            await this._loadCharts();   // ✅ Chargement Chart.js PUIS rendu
        });

        onWillUnmount(() => {
            Object.values(this.charts).forEach(c => c && c.destroy());
        });
    }

    // ─── Données ─────────────────────────────────────────────────────────────

    async loadDashboardData() {
        this.state.user_name = this.user.name || 'Doctor';
        await Promise.allSettled([
            this._loadStats(),
            this._loadRecentActivities(),
        ]);
    }

    async _loadStats() {
        try {
            const today = new Date().toISOString().split('T')[0];

            const [totalPatients, consultationsToday, activeInpatients, activeAllocations] =
                await Promise.all([
                    this.orm.call('res.partner', 'search_count',
                        [[['patient_seq', 'not in', ['New', 'Employee', 'User']]]]),
                    this.orm.call('hospital.outpatient', 'search_count',
                        [[['op_date', '=', today], ['state', '!=', 'cancel']]]),
                    this.orm.call('hospital.inpatient', 'search_count',
                        [[['state', '=', 'admit']]]),
                    this.orm.call('doctor.allocation', 'search_count',
                        [[['date', '=', today], ['state', '=', 'confirm']]]),
                ]);

            Object.assign(this.state.stats, {
                total_patients      : totalPatients,
                consultations_today : consultationsToday,
                active_inpatients   : activeInpatients,
                active_allocations  : activeAllocations,
            });
        } catch (e) {
            console.warn('Stats error (données fictives utilisées):', e);
        }
    }

    async _loadRecentActivities() {
        const activities = [];
        try {
            const [ops, admissions, discharges] = await Promise.all([
                this.orm.call('hospital.outpatient', 'search_read',
                    [[['state', '=', 'op']],
                     ['op_reference', 'patient_id', 'create_date'],
                     0, 3, 'create_date desc']),
                this.orm.call('hospital.inpatient', 'search_read',
                    [[['state', '=', 'admit']],
                     ['name', 'patient_id', 'hosp_date'],
                     0, 3, 'hosp_date desc']),
                this.orm.call('hospital.inpatient', 'search_read',
                    [[['state', '=', 'dis']],
                     ['name', 'patient_id', 'discharge_date'],
                     0, 2, 'discharge_date desc']),
            ]);

            ops.forEach(op => activities.push({
                id: `op_${op.id}`, type: 'consultation',
                title: `Consultation — ${op.patient_id[1]} (${op.op_reference})`,
                time: this._relativeTime(op.create_date),
            }));
            admissions.forEach(ip => activities.push({
                id: `ip_${ip.id}`, type: 'admission',
                title: `Admission — ${ip.patient_id[1]} (${ip.name})`,
                time: this._relativeTime(ip.hosp_date),
            }));
            discharges.forEach(ip => activities.push({
                id: `dis_${ip.id}`, type: 'discharge',
                title: `Sortie — ${ip.patient_id[1]} (${ip.name})`,
                time: this._relativeTime(ip.discharge_date),
            }));

            this.state.recent_activities = activities.slice(0, 6);
        } catch (e) {
            console.warn('Activities error:', e);
        }
    }

    // ─── Charts ───────────────────────────────────────────────────────────────

    async _loadCharts() {
        // ✅ FIX PRINCIPAL : charger Chart.js via le système d'assets Odoo
        try {
            await loadJS("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js");
        } catch (e) {
            console.error("Impossible de charger Chart.js :", e);
            return;
        }

        // Petite pause pour s'assurer que le DOM est prêt
        await new Promise(r => setTimeout(r, 100));

        this._initConsultationsChart();
        this._initAdmissionsChart();
        this._initWeeklyChart();
        this._initWorkloadChart();
    }

    _chartColors() {
        return {
            primary   : '#714B67',
            secondary : '#875A7B',
            accent    : '#D4A5C3',
            light     : '#F0E6ED',
            success   : '#28A745',
            danger    : '#DC3545',
        };
    }

    _initConsultationsChart() {
        const canvas = this.consultationsChartRef.el;
        if (!canvas) return;

        const c = this._chartColors();
        // Données fictives — remplacez par vos données réelles
        const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        const values = [165, 189, 201, 218, 234, 247];

        this.charts.consultations = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label       : 'Consultations',
                    data        : values,
                    borderColor : c.primary,
                    backgroundColor: c.accent + '55',
                    tension     : 0.4,
                    fill        : true,
                    pointBackgroundColor : c.primary,
                    pointBorderColor     : '#fff',
                    pointBorderWidth     : 2,
                    pointRadius          : 5,
                    pointHoverRadius     : 8,
                }],
            },
            options: {
                responsive          : true,
                maintainAspectRatio : false,
                plugins : { legend: { display: false } },
                scales  : {
                    y: { beginAtZero: true, grid: { color: c.light } },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    _initAdmissionsChart() {
        const canvas = this.admissionsChartRef.el;
        if (!canvas) return;

        const c = this._chartColors();

        this.charts.admissions = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels   : ['Urgence', 'Programmée'],
                datasets : [{
                    data            : [28, 72],
                    backgroundColor : [c.danger, c.success],
                    borderWidth     : 0,
                    hoverOffset     : 10,
                }],
            },
            options: {
                responsive          : true,
                maintainAspectRatio : false,
                plugins: {
                    legend: {
                        position : 'bottom',
                        labels   : { padding: 15, usePointStyle: true, font: { size: 11 } },
                    },
                },
            },
        });
    }

    _initWeeklyChart() {
        const canvas = this.weeklyChartRef.el;
        if (!canvas) return;

        const c = this._chartColors();

        this.charts.weekly = new Chart(canvas, {
            type: 'bar',
            data: {
                labels   : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                datasets : [{
                    label           : 'Admissions',
                    data            : [42, 38, 45, 52, 48, 35, 28],
                    backgroundColor : c.secondary,
                    borderRadius    : 8,
                    barThickness    : 28,
                }],
            },
            options: {
                responsive          : true,
                maintainAspectRatio : false,
                plugins : { legend: { display: false } },
                scales  : {
                    y: { beginAtZero: true, grid: { color: c.light } },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    _initWorkloadChart() {
        const canvas = this.workloadChartRef.el;
        if (!canvas) return;

        const c = this._chartColors();

        this.charts.workload = new Chart(canvas, {
            type: 'radar',
            data: {
                labels   : ['8h-10h', '10h-12h', '12h-14h', '14h-16h', '16h-18h', '18h-20h'],
                datasets : [{
                    label           : 'Charge (%)',
                    data            : [65, 85, 72, 88, 78, 55],
                    backgroundColor : c.accent + '55',
                    borderColor     : c.primary,
                    pointBackgroundColor : c.primary,
                    pointBorderColor     : '#fff',
                    pointBorderWidth     : 2,
                    pointRadius          : 4,
                }],
            },
            options: {
                responsive          : true,
                maintainAspectRatio : false,
                plugins : { legend: { display: false } },
                scales  : {
                    r: {
                        beginAtZero : true,
                        max         : 100,
                        ticks       : { stepSize: 20, font: { size: 10 } },
                        grid        : { color: c.light },
                    },
                },
            },
        });
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
        if (days  ===1) return "Hier";
        if (days  <  7) return `Il y a ${days} jours`;
        return new Date(dateStr).toLocaleDateString('fr-FR');
    }

    // ─── Actions boutons ──────────────────────────────────────────────────────

    fetch_consultation() {
        this.actionService.doAction({
            name      : _t('Outpatient Details'),
            type      : 'ir.actions.act_window',
            res_model : 'hospital.outpatient',
            view_mode : 'list,form',
            views     : [[false, 'list']],
        });
        this.state.activeSection = 'consultation';
    }

    list_patient_data() {
        this.actionService.doAction({
            name      : _t('Patient details'),
            type      : 'ir.actions.act_window',
            res_model : 'res.partner',
            view_mode : 'list,form',
            views     : [[false, 'list'], [false, 'form']],
            domain    : [['patient_seq', 'not in', ['New', 'Employee', 'User']]],
        });
        this.state.activeSection = 'patient';
    }

    action_list_inpatient() {
        this.actionService.doAction({
            name      : _t('Inpatient details'),
            type      : 'ir.actions.act_window',
            res_model : 'hospital.inpatient',
            view_mode : 'list,form',
            views     : [[false, 'list'], [false, 'form']],
        });
        this.state.activeSection = 'inpatient';
    }

    fetch_doctors_schedule() {
        this.actionService.doAction({
            name      : _t('Surgery details'),
            type      : 'ir.actions.act_window',
            res_model : 'inpatient.surgery',
            view_mode : 'list,form',
            views     : [[false, 'list'], [false, 'form']],
        });
        this.state.activeSection = 'surgery';
    }

    fetch_allocation_lines() {
        this.actionService.doAction({
            name      : _t('Doctor Allocation'),
            type      : 'ir.actions.act_window',
            res_model : 'doctor.allocation',
            view_mode : 'list,form',
            views     : [[false, 'list'], [false, 'form']],
        });
        this.state.activeSection = 'shift';
    }
}

DoctorDashboard.template = "DoctorDashboard";
registry.category("actions").add('doctor_dashboard_tags', DoctorDashboard);