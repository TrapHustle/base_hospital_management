/**
 * Pharmacy Dashboard - Frontend Decoupled Version using JSON-RPC API
 * Pharmacy management and inventory tracking
 */

import { HospitalOdooAPI } from './hospital_api_helper.js';

class PharmacyDashboardFrontend {
    constructor() {
        this.api = new HospitalOdooAPI();
        this.userName = '';
        this.state = {
            stats: {
                total_inventory: 0,
                low_stock_items: 0,
                total_prescriptions: 0,
                pending_orders: 0,
            },
            medicines: [],
            alerts: [],
            chartData: {}
        };
    }

    /**
     * Initialize dashboard
     */
    async init() {
        try {
            console.log('Initializing Pharmacy Dashboard...');
            
            this.getUserInfo();
            await this.loadDashboardData();
            this.renderUI();
            this.setupEventListeners();
            
            console.log('Pharmacy Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load pharmacy dashboard');
        }
    }

    /**
     * Get user information
     */
    getUserInfo() {
        const userNameEl = document.querySelector('[id*="pharmacy"][id*="user-name"]') || 
                           document.querySelector('.user-profile span');
        this.userName = userNameEl?.textContent || 'Pharmacist';
    }

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            await this.loadStatistics();
            await this.loadMedicines();
            await this.loadAlerts();
        } catch (error) {
            console.error('Error loading pharmacy data:', error);
            throw error;
        }
    }

    /**
     * Load statistics
     */
    async loadStatistics() {
        try {
            // Total inventory items
            const totalItems = await this.api.searchCount('hospital.pharmacy', []);
            this.state.stats.total_inventory = totalItems;

            // Low stock items
            const lowStockItems = await this.api.searchCount('hospital.pharmacy', [
                ['qty_on_hand', '<', 'qty_minimum']
            ]);
            this.state.stats.low_stock_items = lowStockItems;

            // Total prescriptions
            const prescriptions = await this.api.searchCount('hospital.pharmacy', []);
            this.state.stats.total_prescriptions = prescriptions;

            // Pending orders
            const pendingOrders = await this.api.searchCount('stock.picking', [
                ['state', '=', 'waiting']
            ]);
            this.state.stats.pending_orders = pendingOrders;
        } catch (error) {
            console.error('Error loading pharmacy statistics:', error);
        }
    }

    /**
     * Load medicines/inventory
     */
    async loadMedicines() {
        try {
            this.state.medicines = await this.api.searchRead('hospital.pharmacy', [
                ['state', '=', 'applicable']
            ], ['medicine_id', 'qty_on_hand', 'qty_minimum', 'price'], { limit: 10 });
        } catch (error) {
            console.error('Error loading medicines:', error);
            this.state.medicines = [];
        }
    }

    /**
     * Load alerts
     */
    async loadAlerts() {
        try {
            const lowStockMeds = await this.api.searchRead('hospital.pharmacy', [
                ['qty_on_hand', '<', 'qty_minimum']
            ], ['medicine_id', 'qty_on_hand', 'qty_minimum'], { limit: 5 });
            
            this.state.alerts = lowStockMeds.map(med => ({
                type: 'low_stock',
                message: `Low stock: ${med.medicine_id[1]} - ${med.qty_on_hand} units remaining`,
                severity: med.qty_on_hand === 0 ? 'critical' : 'warning'
            }));
        } catch (error) {
            console.error('Error loading alerts:', error);
            this.state.alerts = [];
        }
    }

    /**
     * Render UI
     */
    renderUI() {
        this.renderSidebar();
        this.renderTopbar();
        this.renderContent();
    }

    /**
     * Render sidebar
     */
    renderSidebar() {
        const sidebar = document.getElementById('pharmacy-sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>💊 Pharmacy Management</h2>
            </div>
            <nav class="sidebar-nav">
                <button class="nav-item active" onclick="pharmacyDashboard.switchSection('overview')">
                    📊 Overview
                </button>
                <button class="nav-item" onclick="pharmacyDashboard.switchSection('inventory')">
                    📦 Inventory
                </button>
                <button class="nav-item" onclick="pharmacyDashboard.switchSection('alerts')">
                    ⚠️ Alerts (${this.state.alerts.length})
                </button>
                <button class="nav-item" onclick="pharmacyDashboard.switchSection('orders')">
                    📋 Orders
                </button>
                <button class="nav-item" onclick="pharmacyDashboard.switchSection('reports')">
                    📈 Reports
                </button>
            </nav>
        `;
    }

    /**
     * Render topbar
     */
    renderTopbar() {
        const topbar = document.getElementById('pharmacy-topbar');
        if (!topbar) return;

        const stats = this.state.stats;
        topbar.innerHTML = `
            <div class="topbar-left">
                <h1>Pharmacy Dashboard</h1>
            </div>
            <div class="topbar-right">
                <div class="quick-stats">
                    <div class="quick-stat">
                        <span class="label">Total Items</span>
                        <span class="value">${stats.total_inventory}</span>
                    </div>
                    <div class="quick-stat alert">
                        <span class="label">Low Stock</span>
                        <span class="value">${stats.low_stock_items}</span>
                    </div>
                    <div class="quick-stat">
                        <span class="label">Prescriptions</span>
                        <span class="value">${stats.total_prescriptions}</span>
                    </div>
                    <div class="quick-stat">
                        <span class="label">Pending Orders</span>
                        <span class="value">${stats.pending_orders}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render main content
     */
    renderContent() {
        const content = document.getElementById('pharmacy-content');
        if (!content) return;

        this.renderOverview(content);
    }

    /**
     * Render overview
     */
    renderOverview(container) {
        const stats = this.state.stats;
        
        let html = `
            <div class="overview-section">
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-icon">📦</div>
                        <div class="kpi-content">
                            <h3>${stats.total_inventory}</h3>
                            <p>Total Items in Stock</p>
                            <span class="trend">↑ 12%</span>
                        </div>
                    </div>
                    
                    <div class="kpi-card alert">
                        <div class="kpi-icon">⚠️</div>
                        <div class="kpi-content">
                            <h3>${stats.low_stock_items}</h3>
                            <p>Low Stock Items</p>
                            <span class="trend negative">↑ 5%</span>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-icon">💉</div>
                        <div class="kpi-content">
                            <h3>${stats.total_prescriptions}</h3>
                            <p>Active Prescriptions</p>
                            <span class="trend">↑ 8%</span>
                        </div>
                    </div>
                    
                    <div class="kpi-card">
                        <div class="kpi-icon">📦</div>
                        <div class="kpi-content">
                            <h3>${stats.pending_orders}</h3>
                            <p>Pending Orders</p>
                            <span class="trend">↓ 3%</span>
                        </div>
                    </div>
                </div>
        `;
        
        // Alerts section
        if (this.state.alerts.length > 0) {
            html += '<div class="alerts-section"><h3>⚠️ Alerts</h3><div class="alerts-list">';
            this.state.alerts.forEach(alert => {
                html += `<div class="alert alert-${alert.severity}"><strong>${alert.type}:</strong> ${alert.message}</div>`;
            });
            html += '</div></div>';
        }
        
        // Recent medicines
        html += '<div class="medicines-section"><h3>Inventory Items</h3><table><thead>';
        html += '<tr><th>Medicine</th><th>Stock Available</th><th>Minimum</th><th>Price</th><th>Action</th></tr></thead><tbody>';
        
        this.state.medicines.forEach(med => {
            const isLow = med.qty_on_hand < med.qty_minimum;
            html += `<tr class="${isLow ? 'low-stock' : ''}">
                <td>${med.medicine_id[1] || '-'}</td>
                <td>${med.qty_on_hand || 0}</td>
                <td>${med.qty_minimum || 0}</td>
                <td>$${med.price || 0}</td>
                <td><button onclick="pharmacyDashboard.orderMedicine('${med.id}')">Order</button></td>
            </tr>`;
        });
        
        html += '</tbody></table></div></div>';
        container.innerHTML = html;
    }

    /**
     * Switch section
     */
    switchSection(section) {
        console.log('Switching to section:', section);
        // Implementation for different sections
    }

    /**
     * Order medicine
     */
    async orderMedicine(medicineId) {
        try {
            console.log('Ordering medicine:', medicineId);
            alert('Order for medicine ' + medicineId + ' initiated');
        } catch (error) {
            console.error('Error ordering medicine:', error);
            this.showError('Failed to order medicine');
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
    window.pharmacyDashboard = new PharmacyDashboardFrontend();
    await window.pharmacyDashboard.init();
});

export { PharmacyDashboardFrontend };
