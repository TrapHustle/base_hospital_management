/**
 * Hospital Portal - Frontend Decoupled Version using JSON-RPC API
 * Patient self-service portal for medical records and appointments
 */

import { HospitalOdooAPI } from './hospital_api_helper.js';

class HospitalPortalFrontend {
    constructor() {
        this.api = new HospitalOdooAPI();
        this.state = {
            currentSection: 'overview',
            patientData: {
                name: '',
                email: '',
                phone: '',
                date_of_birth: '',
            },
            appointments: [],
            labResults: [],
            prescriptions: [],
            medicalRecords: []
        };
    }

    /**
     * Initialize portal
     */
    async init() {
        try {
            console.log('Initializing Hospital Portal...');
            
            await this.loadPortalData();
            this.renderUI();
            this.setupEventListeners();
            
            console.log('Hospital Portal initialized successfully');
        } catch (error) {
            console.error('Error initializing portal:', error);
            this.showError('Failed to load hospital portal');
        }
    }

    /**
     * Load portal data
     */
    async loadPortalData() {
        try {
            // Get current user/patient data
            const currentUser = await this.api.call('res.users', 'read', [[this.api.sessionId]], 
                ['partner_id']);
            
            if (currentUser && currentUser[0]) {
                const partnerId = currentUser[0].partner_id;
                const patientData = await this.api.read('res.partner', [partnerId[0]], 
                    ['name', 'email', 'phone', 'birthdate_date']);
                
                if (patientData && patientData[0]) {
                    this.state.patientData = patientData[0];
                }
            }

            // Load appointments
            await this.loadAppointments();
            
            // Load lab results
            await this.loadLabResults();
            
            // Load prescriptions
            await this.loadPrescriptions();
            
            // Load medical records
            await this.loadMedicalRecords();
        } catch (error) {
            console.error('Error loading portal data:', error);
        }
    }

    /**
     * Load appointments
     */
    async loadAppointments() {
        try {
            // Get partner ID from current user
            this.state.appointments = await this.api.searchRead('hospital.outpatient', 
                [['patient_seq', '=', this.state.patientData.id]], 
                ['op_date', 'symptoms', 'state', 'doctor_id'], 
                { limit: 10, order: 'op_date DESC' });
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.state.appointments = [];
        }
    }

    /**
     * Load lab results
     */
    async loadLabResults() {
        try {
            this.state.labResults = await this.api.searchRead('patient.lab.test', 
                [['patient_id', '=', this.state.patientData.id]], 
                ['name', 'test_date', 'state', 'lab_technician_id'], 
                { limit: 10, order: 'test_date DESC' });
        } catch (error) {
            console.error('Error loading lab results:', error);
            this.state.labResults = [];
        }
    }

    /**
     * Load prescriptions
     */
    async loadPrescriptions() {
        try {
            this.state.prescriptions = await this.api.searchRead('clinic.patient.prescription', 
                [['patient_id', '=', this.state.patientData.id]], 
                ['name', 'prescription_date', 'medication_line_ids'], 
                { limit: 10, order: 'prescription_date DESC' });
        } catch (error) {
            console.error('Error loading prescriptions:', error);
            this.state.prescriptions = [];
        }
    }

    /**
     * Load medical records
     */
    async loadMedicalRecords() {
        try {
            this.state.medicalRecords = await this.api.searchRead('hospital.patient.record', 
                [['patient_id', '=', this.state.patientData.id]], 
                ['name', 'record_date', 'description', 'medical_professional_id'], 
                { limit: 20, order: 'record_date DESC' });
        } catch (error) {
            console.error('Error loading medical records:', error);
            this.state.medicalRecords = [];
        }
    }

    /**
     * Render UI
     */
    renderUI() {
        this.renderNavigation();
        this.renderContent();
    }

    /**
     * Render navigation
     */
    renderNavigation() {
        const navContainer = document.getElementById('portal-nav');
        if (!navContainer) return;

        const patientName = this.state.patientData.name || 'Patient';
        
        navContainer.innerHTML = `
            <div class="portal-nav-header">
                <h1>Welcome, ${patientName}</h1>
                <p>Your Health Portal</p>
            </div>
            <nav class="portal-nav-menu">
                <button class="nav-item ${this.state.currentSection === 'overview' ? 'active' : ''}" 
                        onclick="hospitalPortal.switchSection('overview')">
                    📊 Overview
                </button>
                <button class="nav-item ${this.state.currentSection === 'appointments' ? 'active' : ''}" 
                        onclick="hospitalPortal.switchSection('appointments')">
                    📅 Appointments (${this.state.appointments.length})
                </button>
                <button class="nav-item ${this.state.currentSection === 'lab-results' ? 'active' : ''}" 
                        onclick="hospitalPortal.switchSection('lab-results')">
                    🧪 Lab Results (${this.state.labResults.length})
                </button>
                <button class="nav-item ${this.state.currentSection === 'prescriptions' ? 'active' : ''}" 
                        onclick="hospitalPortal.switchSection('prescriptions')">
                    💊 Prescriptions (${this.state.prescriptions.length})
                </button>
                <button class="nav-item ${this.state.currentSection === 'medical-records' ? 'active' : ''}" 
                        onclick="hospitalPortal.switchSection('medical-records')">
                    📋 Medical Records
                </button>
                <button class="nav-item ${this.state.currentSection === 'profile' ? 'active' : ''}" 
                        onclick="hospitalPortal.switchSection('profile')">
                    👤 Profile
                </button>
            </nav>
        `;
    }

    /**
     * Render content area
     */
    renderContent() {
        const contentContainer = document.getElementById('portal-content');
        if (!contentContainer) return;

        switch (this.state.currentSection) {
            case 'appointments':
                this.renderAppointments(contentContainer);
                break;
            case 'lab-results':
                this.renderLabResults(contentContainer);
                break;
            case 'prescriptions':
                this.renderPrescriptions(contentContainer);
                break;
            case 'medical-records':
                this.renderMedicalRecords(contentContainer);
                break;
            case 'profile':
                this.renderProfile(contentContainer);
                break;
            default:
                this.renderOverview(contentContainer);
        }
    }

    /**
     * Render overview
     */
    renderOverview(container) {
        const { appointments, labResults, prescriptions, medicalRecords } = this.state;
        
        let html = `
            <div class="portal-overview">
                <div class="welcome-card">
                    <h2>Welcome to Your Health Portal</h2>
                    <p>Access your medical information and manage your healthcare</p>
                </div>

                <div class="quick-actions">
                    <button class="action-card" onclick="hospitalPortal.switchSection('appointments')">
                        <div class="card-icon">📅</div>
                        <div class="card-content">
                            <h3>Appointments</h3>
                            <p>${appointments.length} upcoming</p>
                        </div>
                    </button>
                    
                    <button class="action-card" onclick="hospitalPortal.switchSection('lab-results')">
                        <div class="card-icon">🧪</div>
                        <div class="card-content">
                            <h3>Lab Results</h3>
                            <p>${labResults.length} available</p>
                        </div>
                    </button>
                    
                    <button class="action-card" onclick="hospitalPortal.switchSection('prescriptions')">
                        <div class="card-icon">💊</div>
                        <div class="card-content">
                            <h3>Prescriptions</h3>
                            <p>${prescriptions.length} on file</p>
                        </div>
                    </button>
                    
                    <button class="action-card" onclick="hospitalPortal.switchSection('medical-records')">
                        <div class="card-icon">📋</div>
                        <div class="card-content">
                            <h3>Medical Records</h3>
                            <p>${medicalRecords.length} records</p>
                        </div>
                    </button>
                </div>

                <div class="info-section">
                    <h3>Recent Activities</h3>
                    <div class="activity-list">
                        ${appointments.length > 0 ? `
                            <div class="activity-item">
                                <span class="activity-date">${new Date(appointments[0].op_date).toLocaleDateString()}</span>
                                <span class="activity-text">Appointment scheduled</span>
                            </div>
                        ` : ''}
                        ${labResults.length > 0 ? `
                            <div class="activity-item">
                                <span class="activity-date">Recently</span>
                                <span class="activity-text">Lab results available</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Render appointments
     */
    renderAppointments(container) {
        if (this.state.appointments.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No appointments found</p></div>';
            return;
        }

        let html = '<div class="appointments-section"><h3>Your Appointments</h3><div class="appointments-list">';
        
        this.state.appointments.forEach(apt => {
            const date = new Date(apt.op_date);
            html += `
                <div class="appointment-card">
                    <div class="appointment-date">
                        <span class="month">${date.toLocaleDateString('default', { month: 'short' })}</span>
                        <span class="day">${date.getDate()}</span>
                    </div>
                    <div class="appointment-details">
                        <h4>Doctor Appointment</h4>
                        <p><strong>Doctor:</strong> ${apt.doctor_id ? apt.doctor_id[1] : 'Not assigned'}</p>
                        <p><strong>Symptoms:</strong> ${apt.symptoms || 'N/A'}</p>
                        <p><strong>Status:</strong> <span class="badge badge-${apt.state}">${apt.state}</span></p>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    /**
     * Render lab results
     */
    renderLabResults(container) {
        if (this.state.labResults.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No lab results available</p></div>';
            return;
        }

        let html = '<div class="lab-results-section"><h3>Lab Results</h3><div class="results-list">';
        
        this.state.labResults.forEach(result => {
            html += `
                <div class="result-card">
                    <h4>${result.name}</h4>
                    <p><strong>Date:</strong> ${new Date(result.test_date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="badge badge-${result.state}">${result.state}</span></p>
                    <button onclick="hospitalPortal.viewLabResult('${result.id}')">View Details</button>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    /**
     * Render prescriptions
     */
    renderPrescriptions(container) {
        if (this.state.prescriptions.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No prescriptions found</p></div>';
            return;
        }

        let html = '<div class="prescriptions-section"><h3>Your Prescriptions</h3><div class="prescriptions-list">';
        
        this.state.prescriptions.forEach(prescription => {
            html += `
                <div class="prescription-card">
                    <h4>${prescription.name}</h4>
                    <p><strong>Date:</strong> ${new Date(prescription.prescription_date).toLocaleDateString()}</p>
                    <button onclick="hospitalPortal.downloadPrescription('${prescription.id}')">Download PDF</button>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    /**
     * Render medical records
     */
    renderMedicalRecords(container) {
        if (this.state.medicalRecords.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No medical records found</p></div>';
            return;
        }

        let html = '<div class="records-section"><h3>Medical Records</h3><div class="records-list">';
        
        this.state.medicalRecords.forEach(record => {
            html += `
                <div class="record-card">
                    <h4>${record.name}</h4>
                    <p><strong>Date:</strong> ${new Date(record.record_date).toLocaleDateString()}</p>
                    <p><strong>Professional:</strong> ${record.medical_professional_id ? record.medical_professional_id[1] : 'N/A'}</p>
                    <p>${record.description || 'No description'}</p>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
    }

    /**
     * Render profile
     */
    renderProfile(container) {
        const { patientData } = this.state;
        
        const html = `
            <div class="profile-section">
                <h3>Your Profile</h3>
                <div class="profile-card">
                    <div class="profile-field">
                        <label>Name</label>
                        <p>${patientData.name || '-'}</p>
                    </div>
                    <div class="profile-field">
                        <label>Email</label>
                        <p>${patientData.email || '-'}</p>
                    </div>
                    <div class="profile-field">
                        <label>Phone</label>
                        <p>${patientData.phone || '-'}</p>
                    </div>
                    <div class="profile-field">
                        <label>Date of Birth</label>
                        <p>${patientData.birthdate_date ? new Date(patientData.birthdate_date).toLocaleDateString() : '-'}</p>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Switch section
     */
    switchSection(section) {
        this.state.currentSection = section;
        this.renderUI();
    }

    /**
     * View lab result details
     */
    async viewLabResult(resultId) {
        try {
            console.log('Viewing lab result:', resultId);
            alert('Lab result details for ' + resultId);
        } catch (error) {
            console.error('Error viewing lab result:', error);
            this.showError('Failed to load lab result');
        }
    }

    /**
     * Download prescription
     */
    async downloadPrescription(prescriptionId) {
        try {
            console.log('Downloading prescription:', prescriptionId);
            alert('Downloading prescription ' + prescriptionId);
        } catch (error) {
            console.error('Error downloading prescription:', error);
            this.showError('Failed to download prescription');
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
    window.hospitalPortal = new HospitalPortalFrontend();
    await window.hospitalPortal.init();
});

export { HospitalPortalFrontend };
