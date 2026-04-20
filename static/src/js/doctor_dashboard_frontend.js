/**
 * Doctor Dashboard - Frontend Decoupled Version using JSON-RPC API
 * Communicates with Odoo backend via HTTP/JSON-RPC instead of OWL ORM
 */

import { HospitalOdooAPI } from './hospital_api_helper.js';

class DoctorDashboardFrontend {
    constructor() {
        this.api = new HospitalOdooAPI();
        this.userName = '';
        this.userEmail = '';
        this.charts = {};
        this.state = {
            stats: {
                total_patients: 0,
                consultations_today: 0,
                active_inpatients: 0,
                active_allocations: 0,
                patients_trend: 0,
                consultations_trend: 0,
                inpatients_trend: 0,
            },
            chart_data: {
                consultations_monthly: [],
                admissions_type: {},
                admissions_weekly: [],
                workload: [],
            },
            recent_activities: [],
        };
    }

    /**
     * Initialize dashboard on page load
     */
    async init() {
        try {
            console.log('Initializing Doctor Dashboard...');
            
            // Get user info from page
            this.getUserInfo();
            
            // Load all data
            await this.loadDashboardData();
            
            // Initialize charts
            this.initCharts();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Doctor Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load dashboard');
        }
    }

    /**
     * Get user information from page
     */
    getUserInfo() {
        const userNameEl = document.getElementById('user-name');
        const welcomeNameEl = document.getElementById('welcome-name');
        const userAvatarEl = document.getElementById('user-avatar');
        
        this.userName = userNameEl?.textContent || 'Doctor';
        
        // Extract initials for avatar
        const initials = this.userName.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        
        if (userAvatarEl) {
            userAvatarEl.textContent = initials || 'DR';
        }
        if (welcomeNameEl) {
            welcomeNameEl.textContent = this.userName;
        }
    }

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            // Load statistics
            await this.loadStatistics();
            
            // Load chart data
            await this.loadChartData();
            
            // Load recent activities
            await this.loadRecentActivities();
            
            // Render data
            this.renderStats();
            this.renderMainActions();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    /**
     * Load statistics from backend
     */
    async loadStatistics() {
        try {
            // Get total patients
            const totalPatients = await this.api.searchCount('res.partner', [
                ['patient_seq', 'not in', ['New', 'Employee', 'User']]
            ]);
            this.state.stats.total_patients = totalPatients;

            // Get consultations today
            const today = new Date().toISOString().split('T')[0];
            const consultationsToday = await this.api.searchCount('hospital.outpatient', [
                ['op_date', '=', today],
                ['state', '!=', 'cancel']
            ]);
            this.state.stats.consultations_today = consultationsToday;

            // Get active inpatients
            const activeInpatients = await this.api.searchCount('hospital.inpatient', [
                ['state', '=', 'admit']
            ]);
            this.state.stats.active_inpatients = activeInpatients;

            // Get active allocations
            const activeAllocations = await this.api.searchCount('doctor.allocation', [
                ['date', '=', today],
                ['state', '=', 'confirm']
            ]);
            this.state.stats.active_allocations = activeAllocations;

            // Set trends (can be calculated from backend if needed)
            this.state.stats.patients_trend = 12;
            this.state.stats.consultations_trend = 8;
            this.state.stats.inpatients_trend = -3;
        } catch (error) {
            console.error('Error loading statistics:', error);
            throw error;
        }
    }

    /**
     * Load chart data from backend
     */
    async loadChartData() {
        try {
            // Get consultations data for charts
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const consultations = await this.api.searchRead('hospital.outpatient', [
                ['op_date', '>=', sixMonthsAgo.toISOString().split('T')[0]],
                ['state', '!=', 'cancel']
            ], ['op_date', 'state']);
            
            // Group consultations by month
            this.state.chart_data.consultations_monthly = this.groupByMonth(consultations);
            
            // Get inpatient data
            const inpatients = await this.api.searchRead('hospital.inpatient', [], 
                ['admission_type', 'state']);
            this.state.chart_data.admissions_type = this.groupByType(inpatients);
            
            // Mock workload data
            this.state.chart_data.workload = [
                { day: 'Monday', patients: 25 },
                { day: 'Tuesday', patients: 35 },
                { day: 'Wednesday', patients: 30 },
                { day: 'Thursday', patients: 40 },
                { day: 'Friday', patients: 28 },
            ];
        } catch (error) {
            console.error('Error loading chart data:', error);
            // Use empty/default data
            this.state.chart_data = {
                consultations_monthly: [],
                admissions_type: {},
                admissions_weekly: [],
                workload: [],
            };
        }
    }

    /**
     * Load recent activities
     */
    async loadRecentActivities() {
        try {
            // Get recent consultations
            const recentConsultations = await this.api.searchRead('hospital.outpatient', 
                [['state', '!=', 'cancel']], 
                ['patient_id', 'op_date', 'state'],
                { limit: 5, order: 'op_date DESC' });
            
            this.state.recent_activities = recentConsultations.map(item => ({
                type: 'consultation',
                title: `Consultation: ${item.patient_id[1] || 'Unknown'}`,
                date: item.op_date,
                status: item.state
            }));
        } catch (error) {
            console.error('Error loading activities:', error);
            this.state.recent_activities = [];
        }
    }

    /**
     * Render statistics cards
     */
    renderStats() {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;

        const stats = this.state.stats;
        const statsHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #FF6B6B, #FF8E8E);">
                    👥
                </div>
                <div class="stat-content">
                    <h3>${stats.total_patients}</h3>
                    <p>Total Patients</p>
                    <span class="trend positive">↑ ${stats.patients_trend}%</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #4ECDC4, #44A08D);">
                    📋
                </div>
                <div class="stat-content">
                    <h3>${stats.consultations_today}</h3>
                    <p>Consultations Today</p>
                    <span class="trend positive">↑ ${stats.consultations_trend}%</span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #F7971E, #FFD200);">
                    🏥
                </div>
                <div class="stat-content">
                    <h3>${stats.active_inpatients}</h3>
                    <p>Active Inpatients</p>
                    <span class="trend ${stats.inpatients_trend > 0 ? 'negative' : 'positive'}">
                        ${stats.inpatients_trend > 0 ? '↑' : '↓'} ${Math.abs(stats.inpatients_trend)}%
                    </span>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                    👨‍⚕️
                </div>
                <div class="stat-content">
                    <h3>${stats.active_allocations}</h3>
                    <p>Active Allocations</p>
                    <span class="trend positive">↑ 5%</span>
                </div>
            </div>
        `;
        
        statsGrid.innerHTML = statsHTML;
    }

    /**
     * Render main action buttons
     */
    renderMainActions() {
        const mainActions = document.getElementById('main-actions');
        if (!mainActions) return;

        const actionsHTML = `
            <button class="action-btn primary" onclick="doctorDashboard.fetch_consultation()">
                📋 Fetch Consultations
            </button>
            <button class="action-btn" onclick="doctorDashboard.list_patient_data()">
                👥 List Patients
            </button>
            <button class="action-btn" onclick="doctorDashboard.action_list_inpatient()">
                🏥 List Inpatients
            </button>
            <button class="action-btn" onclick="doctorDashboard.fetch_doctors_schedule()">
                📅 Doctor Schedule
            </button>
            <button class="action-btn" onclick="doctorDashboard.fetch_allocation_lines()">
                ⏰ Allocation Lines
            </button>
        `;
        
        mainActions.innerHTML = actionsHTML;
    }

    /**
     * Initialize Chart.js charts
     */
    initCharts() {
        const chartsGrid = document.getElementById('charts-grid');
        if (!chartsGrid) return;

        chartsGrid.innerHTML = `
            <div class="chart-container">
                <h3>Monthly Consultations</h3>
                <canvas id="consultationsChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
                <h3>Admission Types</h3>
                <canvas id="admissionsChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
                <h3>Weekly Workload</h3>
                <canvas id="weeklyChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
                <h3>Patient Workload by Day</h3>
                <canvas id="workloadChart" width="400" height="200"></canvas>
            </div>
        `;

        // Wait for Chart.js to be loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        // Create charts
        this.createConsultationsChart();
        this.createAdmissionsChart();
        this.createWeeklyChart();
        this.createWorkloadChart();
    }

    /**
     * Create monthly consultations chart
     */
    createConsultationsChart() {
        const ctx = document.getElementById('consultationsChart');
        if (!ctx) return;

        const data = this.state.chart_data.consultations_monthly;
        const labels = data.map(d => d.month || 'N/A');
        const values = data.map(d => d.count || 0);

        this.charts.consultations = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Consultations',
                    data: values,
                    borderColor: '#714B67',
                    backgroundColor: 'rgba(113, 75, 103, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /**
     * Create admissions type chart
     */
    createAdmissionsChart() {
        const ctx = document.getElementById('admissionsChart');
        if (!ctx) return;

        const data = this.state.chart_data.admissions_type;
        const labels = Object.keys(data);
        const values = Object.values(data);

        this.charts.admissions = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#714B67',
                        '#875A7B',
                        '#D4A5C3',
                        '#F0E6ED'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    /**
     * Create weekly chart
     */
    createWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        const data = this.state.chart_data.workload;
        const labels = data.map(d => d.day);
        const values = data.map(d => d.patients);

        this.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Patients',
                    data: values,
                    backgroundColor: '#875A7B'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /**
     * Create workload chart
     */
    createWorkloadChart() {
        const ctx = document.getElementById('workloadChart');
        if (!ctx) return;

        this.charts.workload = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                datasets: [{
                    label: 'Workload',
                    data: [25, 35, 30, 40, 28],
                    backgroundColor: 'rgba(113, 75, 103, 0.2)',
                    borderColor: '#714B67',
                    pointBackgroundColor: '#875A7B'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add any additional event listeners here
    }

    /**
     * Button Click Handlers (Preserved from Original)
     */
    
    async fetch_consultation() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const consultations = await this.api.searchRead('hospital.outpatient', [
                ['op_date', '=', today]
            ], ['patient_id', 'symptoms', 'state']);
            
            console.log('Today Consultations:', consultations);
            alert(`Found ${consultations.length} consultations for today`);
        } catch (error) {
            console.error('Error fetching consultations:', error);
            this.showError('Failed to fetch consultations');
        }
    }

    async list_patient_data() {
        try {
            const patients = await this.api.searchRead('res.partner', [
                ['patient_seq', 'not in', ['New', 'Employee', 'User']]
            ], ['name', 'email', 'phone'], { limit: 10 });
            
            console.log('Patients:', patients);
            alert(`Found ${patients.length} patients`);
        } catch (error) {
            console.error('Error listing patients:', error);
            this.showError('Failed to list patients');
        }
    }

    async action_list_inpatient() {
        try {
            const inpatients = await this.api.searchRead('hospital.inpatient', [
                ['state', '=', 'admit']
            ], ['patient_id', 'admission_date', 'ward_id'], { limit: 10 });
            
            console.log('Inpatients:', inpatients);
            alert(`Found ${inpatients.length} active inpatients`);
        } catch (error) {
            console.error('Error listing inpatients:', error);
            this.showError('Failed to list inpatients');
        }
    }

    async fetch_doctors_schedule() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const schedule = await this.api.searchRead('doctor.allocation', [
                ['date', '=', today]
            ], ['doctor_id', 'slot_from', 'slot_to', 'state']);
            
            console.log('Doctor Schedule:', schedule);
            alert(`Found ${schedule.length} doctor allocations today`);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            this.showError('Failed to fetch schedule');
        }
    }

    async fetch_allocation_lines() {
        try {
            const allocations = await this.api.searchRead('doctor.slot', [], 
                ['doctor_id', 'start_time', 'end_time'], { limit: 10 });
            
            console.log('Allocation Lines:', allocations);
            alert(`Found ${allocations.length} doctor slots`);
        } catch (error) {
            console.error('Error fetching allocations:', error);
            this.showError('Failed to fetch allocations');
        }
    }

    /**
     * Helper Methods
     */

    groupByMonth(items) {
        const grouped = {};
        items.forEach(item => {
            const date = new Date(item.op_date);
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            grouped[month] = (grouped[month] || 0) + 1;
        });
        
        return Object.entries(grouped).map(([month, count]) => ({
            month: month,
            count: count
        }));
    }

    groupByType(items) {
        const grouped = {};
        items.forEach(item => {
            const type = item.admission_type || 'Unknown';
            grouped[type] = (grouped[type] || 0) + 1;
        });
        return grouped;
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger';
        alertDiv.textContent = message;
        document.body.prepend(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.doctorDashboard = new DoctorDashboardFrontend();
    await window.doctorDashboard.init();
});

export { DoctorDashboardFrontend };
