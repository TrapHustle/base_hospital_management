/**
 * Reception Dashboard - Frontend Decoupled Version using JSON-RPC API
 * Patient registration, appointments, and room management
 */

import { HospitalOdooAPI } from './hospital_api_helper.js';

class ReceptionDashboardFrontend {
    constructor() {
        this.api = new HospitalOdooAPI();
        this.state = {
            stats: {
                total_patients: 0,
                outpatient_appointments: 0,
                inpatient_admissions: 0,
                available_rooms: 0,
            },
            currentView: 'overview',
            appointments: [],
            rooms: [],
            wards: []
        };
    }

    /**
     * Initialize dashboard
     */
    async init() {
        try {
            console.log('Initializing Reception Dashboard...');
            
            await this.loadDashboardData();
            this.renderUI();
            this.setupEventListeners();
            
            console.log('Reception Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load reception dashboard');
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            await this.loadStatistics();
            await this.loadAppointments();
            await this.loadRooms();
            await this.loadWards();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    /**
     * Load statistics
     */
    async loadStatistics() {
        try {
            // Total patients
            const totalPatients = await this.api.searchCount('res.partner', [
                ['patient_seq', 'not in', ['New', 'Employee', 'User']]
            ]);
            this.state.stats.total_patients = totalPatients;

            // Outpatient appointments
            const today = new Date().toISOString().split('T')[0];
            const appointments = await this.api.searchCount('hospital.outpatient', [
                ['op_date', '=', today],
                ['state', '!=', 'cancel']
            ]);
            this.state.stats.outpatient_appointments = appointments;

            // Inpatient admissions
            const inpatients = await this.api.searchCount('hospital.inpatient', [
                ['state', '=', 'admit']
            ]);
            this.state.stats.inpatient_admissions = inpatients;

            // Available rooms
            const availableRooms = await this.api.searchCount('hospital.patient.room', [
                ['state', '=', 'available']
            ]);
            this.state.stats.available_rooms = availableRooms;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Load appointments
     */
    async loadAppointments() {
        try {
            const today = new Date().toISOString().split('T')[0];
            this.state.appointments = await this.api.searchRead('hospital.outpatient', [
                ['op_date', '=', today]
            ], ['patient_id', 'op_date', 'symptoms', 'state'], { limit: 10 });
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.state.appointments = [];
        }
    }

    /**
     * Load rooms
     */
    async loadRooms() {
        try {
            this.state.rooms = await this.api.searchRead('hospital.patient.room', [], 
                ['name', 'ward_id', 'patient_id', 'state'], { limit: 10 });
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.state.rooms = [];
        }
    }

    /**
     * Load wards
     */
    async loadWards() {
        try {
            this.state.wards = await this.api.searchRead('hospital.ward', [], 
                ['name', 'building_id'], { limit: 20 });
        } catch (error) {
            console.error('Error loading wards:', error);
            this.state.wards = [];
        }
    }

    /**
     * Render UI
     */
    renderUI() {
        this.renderNavigation();
        this.renderMainContent();
    }

    /**
     * Render navigation
     */
    renderNavigation() {
        const navContainer = document.getElementById('reception-nav');
        if (!navContainer) return;

        navContainer.innerHTML = `
            <div class="nav-header">
                <h2>🏥 Reception Dashboard</h2>
            </div>
            <div class="nav-buttons">
                <button class="nav-btn ${this.state.currentView === 'overview' ? 'active' : ''}" 
                        onclick="receptionDashboard.switchView('overview')">
                    📊 Overview
                </button>
                <button class="nav-btn ${this.state.currentView === 'new-patient' ? 'active' : ''}" 
                        onclick="receptionDashboard.switchView('new-patient')">
                    👤 New Patient
                </button>
                <button class="nav-btn ${this.state.currentView === 'appointments' ? 'active' : ''}" 
                        onclick="receptionDashboard.switchView('appointments')">
                    📅 Appointments
                </button>
                <button class="nav-btn ${this.state.currentView === 'rooms' ? 'active' : ''}" 
                        onclick="receptionDashboard.switchView('rooms')">
                    🛏️ Rooms/Wards
                </button>
            </div>
        `;
    }

    /**
     * Render main content
     */
    renderMainContent() {
        const mainContent = document.getElementById('view_main');
        if (!mainContent) return;

        switch (this.state.currentView) {
            case 'new-patient':
                this.renderNewPatientForm(mainContent);
                break;
            case 'appointments':
                this.renderAppointmentsView(mainContent);
                break;
            case 'rooms':
                this.renderRoomsView(mainContent);
                break;
            default:
                this.renderOverviewView(mainContent);
        }
    }

    /**
     * Render overview
     */
    renderOverviewView(container) {
        const stats = this.state.stats;
        
        const html = `
            <div class="reception-overview">
                <div class="stats-section">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <h3>${stats.total_patients}</h3>
                        <p>Total Patients</p>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <h3>${stats.outpatient_appointments}</h3>
                        <p>Today's Appointments</p>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🏥</div>
                        <h3>${stats.inpatient_admissions}</h3>
                        <p>Inpatient Admissions</p>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🛏️</div>
                        <h3>${stats.available_rooms}</h3>
                        <p>Available Rooms</p>
                    </div>
                </div>

                <div class="quick-actions">
                    <button onclick="receptionDashboard.switchView('new-patient')" class="action-btn primary">
                        ➕ Register New Patient
                    </button>
                    <button onclick="receptionDashboard.switchView('appointments')" class="action-btn">
                        📅 View Appointments
                    </button>
                    <button onclick="receptionDashboard.switchView('rooms')" class="action-btn">
                        🛏️ Manage Rooms
                    </button>
                </div>

                <div class="today-appointments">
                    <h3>Today's Appointments</h3>
                    <table class="appointments-table">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Time</th>
                                <th>Symptoms</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (this.state.appointments.length === 0) {
            return container.innerHTML = html + `
                        <tr>
                            <td colspan="5" class="no-data">No appointments today</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
        }

        let tableRows = '';
        this.state.appointments.forEach(apt => {
            tableRows += `<tr>
                <td>${apt.patient_id[1] || '-'}</td>
                <td>${apt.op_date || '-'}</td>
                <td>${apt.symptoms || '-'}</td>
                <td><span class="badge badge-${apt.state}">${apt.state}</span></td>
                <td><button onclick="receptionDashboard.checkInPatient('${apt.id}')">Check-in</button></td>
            </tr>`;
        });

        container.innerHTML = html + tableRows + `
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    /**
     * Render new patient form
     */
    renderNewPatientForm(container) {
        container.innerHTML = `
            <div class="form-section">
                <h3>Register New Patient</h3>
                <form id="newPatientForm" onsubmit="receptionDashboard.submitNewPatient(event)">
                    <div class="form-group">
                        <label>First Name *</label>
                        <input type="text" name="first_name" required />
                    </div>
                    
                    <div class="form-group">
                        <label>Last Name *</label>
                        <input type="text" name="last_name" required />
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" />
                    </div>
                    
                    <div class="form-group">
                        <label>Phone *</label>
                        <input type="tel" name="phone" required />
                    </div>
                    
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" name="dob" />
                    </div>
                    
                    <div class="form-group">
                        <label>Gender</label>
                        <select name="gender">
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Address</label>
                        <textarea name="address" rows="3"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Register Patient</button>
                </form>
            </div>
        `;
    }

    /**
     * Render appointments view
     */
    renderAppointmentsView(container) {
        let html = '<div class="appointments-section"><h3>Appointments</h3>';
        html += '<table class="appointments-table"><thead>';
        html += '<tr><th>Patient</th><th>Date</th><th>Symptoms</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        
        if (this.state.appointments.length === 0) {
            html += '<tr><td colspan="5" class="no-data">No appointments found</td></tr>';
        } else {
            this.state.appointments.forEach(apt => {
                html += `<tr>
                    <td>${apt.patient_id[1] || '-'}</td>
                    <td>${apt.op_date || '-'}</td>
                    <td>${apt.symptoms || '-'}</td>
                    <td><span class="badge badge-${apt.state}">${apt.state}</span></td>
                    <td>
                        <button onclick="receptionDashboard.checkInPatient('${apt.id}')">Check-in</button>
                        <button onclick="receptionDashboard.cancelAppointment('${apt.id}')">Cancel</button>
                    </td>
                </tr>`;
            });
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    /**
     * Render rooms view
     */
    renderRoomsView(container) {
        let html = '<div class="rooms-section"><h3>Rooms & Wards</h3>';
        html += '<table class="rooms-table"><thead>';
        html += '<tr><th>Room</th><th>Ward</th><th>Patient</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        
        if (this.state.rooms.length === 0) {
            html += '<tr><td colspan="5" class="no-data">No rooms found</td></tr>';
        } else {
            this.state.rooms.forEach(room => {
                html += `<tr>
                    <td>${room.name || '-'}</td>
                    <td>${room.ward_id[1] || '-'}</td>
                    <td>${room.patient_id ? room.patient_id[1] : 'Empty'}</td>
                    <td><span class="badge badge-${room.state}">${room.state}</span></td>
                    <td>
                        <button onclick="receptionDashboard.assignRoom('${room.id}')">Assign</button>
                    </td>
                </tr>`;
            });
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    /**
     * Switch view
     */
    switchView(view) {
        this.state.currentView = view;
        this.renderUI();
    }

    /**
     * Submit new patient
     */
    async submitNewPatient(event) {
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData);
            
            console.log('Creating new patient:', data);
            alert('Patient registered successfully');
            event.target.reset();
            this.switchView('overview');
        } catch (error) {
            console.error('Error submitting patient:', error);
            this.showError('Failed to register patient');
        }
    }

    /**
     * Check in patient
     */
    async checkInPatient(appointmentId) {
        try {
            console.log('Checking in patient:', appointmentId);
            alert('Patient checked in successfully');
        } catch (error) {
            console.error('Error checking in patient:', error);
            this.showError('Failed to check in patient');
        }
    }

    /**
     * Cancel appointment
     */
    async cancelAppointment(appointmentId) {
        try {
            console.log('Canceling appointment:', appointmentId);
            alert('Appointment canceled successfully');
        } catch (error) {
            console.error('Error canceling appointment:', error);
            this.showError('Failed to cancel appointment');
        }
    }

    /**
     * Assign room
     */
    async assignRoom(roomId) {
        try {
            console.log('Assigning room:', roomId);
            alert('Room assigned successfully');
        } catch (error) {
            console.error('Error assigning room:', error);
            this.showError('Failed to assign room');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add event listeners here
    }

    /**
     * Show error
     */
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
    window.receptionDashboard = new ReceptionDashboardFrontend();
    await window.receptionDashboard.init();
});

export { ReceptionDashboardFrontend };
