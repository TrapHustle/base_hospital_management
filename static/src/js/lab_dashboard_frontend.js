/**
 * Lab Dashboard - Frontend Decoupled Version using JSON-RPC API
 * Laboratory management dashboard for test processing and analytics
 */

import { HospitalOdooAPI } from './hospital_api_helper.js';

class LabDashboardFrontend {
    constructor() {
        this.api = new HospitalOdooAPI();
        this.userName = '';
        this.state = {
            stats: {
                pending_tests: 0,
                completed_today: 0,
                processed_samples: 0,
                pending_results: 0,
            },
            views: {
                current: 'main',
                testLines: [],
                publishedResults: [],
                analytics: []
            }
        };
    }

    /**
     * Initialize dashboard
     */
    async init() {
        try {
            console.log('Initializing Lab Dashboard...');
            
            this.getUserInfo();
            await this.loadDashboardData();
            this.setupEventListeners();
            
            console.log('Lab Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load lab dashboard');
        }
    }

    /**
     * Get user information
     */
    getUserInfo() {
        const userNameEl = document.getElementById('lab-user-name');
        const welcomeEl = document.getElementById('lab-welcome-name');
        const avatarEl = document.getElementById('lab-user-avatar');
        
        this.userName = userNameEl?.textContent || 'Lab Technician';
        
        if (welcomeEl) {
            welcomeEl.textContent = this.userName;
        }
        
        if (avatarEl) {
            const initials = this.userName.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
            avatarEl.textContent = initials || 'LT';
        }
    }

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            await this.loadStatistics();
            await this.loadTestLines();
            this.renderUI();
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
            // Pending tests
            const pendingTests = await this.api.searchCount('patient.lab.test', [
                ['state', '=', 'pending']
            ]);
            this.state.stats.pending_tests = pendingTests;

            // Completed today
            const today = new Date().toISOString().split('T')[0];
            const completedToday = await this.api.searchCount('patient.lab.test', [
                ['state', '=', 'completed'],
                ['create_date', '>=', today]
            ]);
            this.state.stats.completed_today = completedToday;

            // Processed samples
            const processedSamples = await this.api.searchCount('lab.test.line', [
                ['state', '=', 'done']
            ]);
            this.state.stats.processed_samples = processedSamples;

            // Pending results
            const pendingResults = await this.api.searchCount('lab.test.line', [
                ['state', '=', 'in_process']
            ]);
            this.state.stats.pending_results = pendingResults;
        } catch (error) {
            console.error('Error loading lab statistics:', error);
        }
    }

    /**
     * Load test lines
     */
    async loadTestLines() {
        try {
            this.state.views.testLines = await this.api.searchRead('lab.test.line', [], [
                'name', 'patient_id', 'test_id', 'state', 'create_date'
            ], { limit: 20, order: 'create_date DESC' });
        } catch (error) {
            console.error('Error loading test lines:', error);
            this.state.views.testLines = [];
        }
    }

    /**
     * Render UI
     */
    renderUI() {
        this.renderStats();
        this.renderSidebar();
        this.renderMainContent();
    }

    /**
     * Render statistics
     */
    renderStats() {
        const statsGrid = document.getElementById('lab-stats-grid');
        if (!statsGrid) return;

        const stats = this.state.stats;
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">🧪</div>
                <div class="stat-content">
                    <h3>${stats.pending_tests}</h3>
                    <p>Pending Tests</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-content">
                    <h3>${stats.completed_today}</h3>
                    <p>Completed Today</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <h3>${stats.processed_samples}</h3>
                    <p>Processed Samples</p>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-content">
                    <h3>${stats.pending_results}</h3>
                    <p>Pending Results</p>
                </div>
            </div>
        `;
    }

    /**
     * Render sidebar menu
     */
    renderSidebar() {
        const sidebar = document.getElementById('lab-sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="sidebar-menu">
                <button class="menu-item ${this.state.views.current === 'main' ? 'active' : ''}" 
                        onclick="labDashboard.switchView('main')">
                    📋 Main View
                </button>
                <button class="menu-item ${this.state.views.current === 'process' ? 'active' : ''}" 
                        onclick="labDashboard.switchView('process')">
                    🔄 In Process
                </button>
                <button class="menu-item ${this.state.views.current === 'published' ? 'active' : ''}" 
                        onclick="labDashboard.switchView('published')">
                    📤 Published Results
                </button>
                <button class="menu-item ${this.state.views.current === 'analytics' ? 'active' : ''}" 
                        onclick="labDashboard.switchView('analytics')">
                    📈 Analytics
                </button>
            </div>
        `;
    }

    /**
     * Render main content area
     */
    renderMainContent() {
        const contentArea = document.getElementById('lab-content-area');
        if (!contentArea) return;

        switch (this.state.views.current) {
            case 'process':
                this.renderProcessView(contentArea);
                break;
            case 'published':
                this.renderPublishedView(contentArea);
                break;
            case 'analytics':
                this.renderAnalyticsView(contentArea);
                break;
            default:
                this.renderMainView(contentArea);
        }
    }

    /**
     * Render main view
     */
    renderMainView(container) {
        const testLines = this.state.views.testLines;
        
        let html = '<div class="test-lines-table"><table><thead>';
        html += '<tr><th>Test Name</th><th>Patient</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>';
        
        testLines.forEach(line => {
            html += `<tr>
                <td>${line.name || '-'}</td>
                <td>${line.patient_id[1] || '-'}</td>
                <td><span class="badge badge-${line.state}">${line.state}</span></td>
                <td>${line.create_date?.split(' ')[0] || '-'}</td>
                <td><button onclick="labDashboard.processTest('${line.id}')">Process</button></td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    /**
     * Render process view
     */
    renderProcessView(container) {
        container.innerHTML = '<div class="view-section"><h3>Tests in Process</h3><p>Processing test data...</p></div>';
    }

    /**
     * Render published view
     */
    renderPublishedView(container) {
        container.innerHTML = '<div class="view-section"><h3>Published Results</h3><p>Published results view...</p></div>';
    }

    /**
     * Render analytics view
     */
    renderAnalyticsView(container) {
        container.innerHTML = `
            <div class="view-section">
                <h3>Laboratory Analytics</h3>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h4>Daily Throughput</h4>
                        <canvas id="dailyThroughputChart" width="300" height="150"></canvas>
                    </div>
                    <div class="analytics-card">
                        <h4>Test Types Distribution</h4>
                        <canvas id="testTypesChart" width="300" height="150"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Switch view
     */
    switchView(viewName) {
        this.state.views.current = viewName;
        this.renderUI();
    }

    /**
     * Process test
     */
    async processTest(testId) {
        try {
            console.log('Processing test:', testId);
            alert('Processing test ' + testId);
        } catch (error) {
            console.error('Error processing test:', error);
            this.showError('Failed to process test');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add event listeners here
    }

    /**
     * Show error message
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
    window.labDashboard = new LabDashboardFrontend();
    await window.labDashboard.init();
});

export { LabDashboardFrontend };
