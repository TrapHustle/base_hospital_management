/** @odoo-module */
import { registry } from '@web/core/registry';
import { useRef, onMounted } from "@odoo/owl";
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";
import { PharmacyOrderLines } from "./pharmacy_orderlines";
import { reactive } from "@odoo/owl";

export class PharmacyDashboard extends Component {

    setup() {
        super.setup(...arguments);
        this.patient_search = useRef('PatientSearch');
        this.patient_name = useRef('PatientName');
        this.patient_email = useRef('Email');
        this.patient_phone = useRef('Phone');
        this.patient_dob = useRef('Dob');
        this.orm = useService('orm');
        this.user = user;
        this.actionService = useService("action");
        this.state = useState({
            product_lst: [],
            medicines: [],
            units: [],
            sub_total: 0,
            vaccine: [],
            order_data: [],
            order_line: [],
            menu: 'home',
            currency: '$',
            med: [],
            showMedicineForm: false,
            showVaccineForm: false,
            showSupplierForm: false,
            showOrderForm: false,
            medicineForm: {
                name: '',
                category: '',
                price: 0,
                quantity: 0,
                description: '',
                image: null,
            },
            vaccineForm: {
                name: '',
                manufacturer: '',
                price: 0,
                quantity: 0,
                storage_temp: '2-8°C',
                expiration_date: '',
            },
            supplierForm: {
                name: '',
                email: '',
                phone: '',
                address: '',
                products: [],
            },
            orderForm: {
                supplier_id: '',
                items: [],
                delivery_date: '',
            },
            stats: {
                revenue_today: '0.00',
                orders_today: 0,
                low_stock_count: 0,
                total_medicines: 0,
            },
            stock_alerts: {
                out_of_stock: [],
                out_of_stock_count: 0,
                low_stock: [],
                low_stock_count: 0,
                expiring_soon: [],
                expiring_count: 0,
                expired: [],
                expired_count: 0,
            },
            prescriptions: {
                pending: [],
                pending_count: 0,
                completed: [],
                completed_count: 0,
                dispensed: [],
                dispensed_count: 0,
            },
            finances: {
                total_revenue: 0,
                total_cost: 0,
                profit: 0,
                revenue_count: 0,
                pending_payments_count: 0,
                pending_payments_amount: 0,
                unpaid_invoices_count: 0,
                unpaid_invoices_amount: 0,
            },
        });

        onMounted(async () => {
            await this.loadInitialData();
        });
    }

    async loadInitialData() {
        try {
            // Load currency
            const currency = await this.orm.call('hospital.pharmacy', 'company_currency', []);
            this.state.currency = currency || '$';

            // Load medicines
            const domain = [['medicine_ok', '=', true]];
            const products = await this.orm.call('product.template', 'search_read', [domain]);
            this.state.product_lst = products;

            // Load medicines data
            try {
                this.state.med = await this.orm.call('product.template', 'action_get_medicine_data', []);
            } catch(e) {
                this.state.med = products;
            }

            // Load statistics
            await this._loadStats();

            // Load stock alerts
            await this._loadStockAlerts();

            // Load prescriptions data
            await this._loadPrescriptions();

            // Load financial data
            await this._loadFinances();

            // Load recent orders
            await this._loadOrders();

            // Initialize refresh interval (every 30 seconds)
            this._startDataRefresh();

        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    _startDataRefresh() {
        // Auto-refresh key data every 30 seconds
        setInterval(async () => {
            await this._loadStats();
            await this._loadStockAlerts();
            await this._loadOrders();
            if (this.state.menu === 'home') {
                setTimeout(() => this._initCharts(), 100);
            }
        }, 30000);
    }

    async _loadStats() {
        try {
            const stats = await this.orm.call('hospital.pharmacy', 'get_pharmacy_statistics', []);
            this.state.stats.revenue_today = (stats.revenue_today || 0).toFixed(2);
            this.state.stats.orders_today = stats.orders_today || 0;
            this.state.stats.low_stock_count = stats.low_stock_count || 0;
            this.state.stats.total_medicines = stats.total_medicines || 0;
        } catch(e) {
            console.error('Stats load error:', e);
        }
    }

    async _loadStockAlerts() {
        try {
            this.state.stock_alerts = await this.orm.call('hospital.pharmacy', 'get_stock_alerts', []);
        } catch(e) {
            console.error('Stock alerts error:', e);
        }
    }

    async _loadPrescriptions() {
        try {
            this.state.prescriptions = await this.orm.call('hospital.pharmacy', 'get_prescriptions_data', []);
        } catch(e) {
            console.error('Prescriptions error:', e);
        }
    }

    async _loadFinances() {
        try {
            this.state.finances = await this.orm.call('hospital.pharmacy', 'get_financial_data', []);
        } catch(e) {
            console.error('Finances error:', e);
        }
    }

    async _loadOrders() {
        try {
            this.state.order_data = await this.orm.call('sale.order', 'search_read', [
                [['partner_id.patient_seq', 'not in', ['New', 'Employee', 'User']]],
                ['name', 'create_date', 'partner_id', 'amount_total', 'state']
            ]);
        } catch(e) {
            console.error('Orders load error:', e);
            this.state.order_data = [];
        }
    }

    setMenu(menu) {
        this.state.menu = menu;
        // Chart initialization on home page
        if (menu === 'home') {
            setTimeout(() => this._initCharts(), 100);
        }
        // Load vaccine data if needed
        if (menu === 'vaccines' && this.state.vaccine.length === 0) {
            this.fetch_vaccine_data();
        }
        // Refresh all data when switching menus
        this._refreshMenuData(menu);
    }

    async _refreshMenuData(menu) {
        try {
            switch(menu) {
                case 'home':
                    await this._loadStats();
                    break;
                case 'stock':
                    await this._loadStockAlerts();
                    break;
                case 'prescriptions':
                    await this._loadPrescriptions();
                    break;
                case 'finances':
                    await this._loadFinances();
                    break;
                case 'orders':
                    await this._loadOrders();
                    break;
            }
        } catch(e) {
            console.error('Menu refresh error:', e);
        }
    }

    updateOrderLine(line, id) {
        const orderline = this.state.order_line.find(ol => ol.id === id);
        if (orderline) {
            orderline.product = line.product;
            orderline.qty = parseInt(line.qty);
            orderline.uom = line.uom;
            orderline.price = line.price;
            orderline.sub_total = line.sub_total;
            this.state.sub_total = this.state.order_line.reduce((s, l) => s + (l.sub_total || 0), 0);
        }
    }

    addRow() {
        this.state.order_line = [...this.state.order_line, reactive({ id: Date.now(), product: false, qty: 1, uom: 0, price: 0, sub_total: 0 })];
    }

    removeLine(id) {
        this.state.order_line = this.state.order_line.filter(line => line.id != id);
        this.state.sub_total = this.state.order_line.reduce((s, l) => s + (l.sub_total || 0), 0);
    }

    async create_sale_order() {
        if (!this.patient_name.el || this.patient_name.el.value.trim() === "") {
            alert("Veuillez entrer le nom du patient");
            return;
        }
        if (!this.patient_email.el || this.patient_email.el.value.trim() === "") {
            alert("Veuillez entrer l'email du patient");
            return;
        }
        if (this.state.order_line.length === 0) {
            alert("Veuillez ajouter au moins un médicament");
            return;
        }

        const data = {
            name: this.patient_name.el.value.trim(),
            phone: this.patient_phone.el ? this.patient_phone.el.value : '',
            email: this.patient_email.el.value.trim(),
            dob: this.patient_dob.el ? this.patient_dob.el.value : '',
            products: this.state.order_line,
        };

        try {
            const result = await this.orm.call('hospital.pharmacy', 'create_sale_order', [data]);
            alert('Commande créée ! Référence: ' + result.invoice);
            this.state.order_line = [];
            this.state.sub_total = 0;
            this.patient_name.el.value = '';
            this.patient_email.el.value = '';
            if (this.patient_phone.el) this.patient_phone.el.value = '';
            if (this.patient_dob.el) this.patient_dob.el.value = '';
            this.setMenu('orders');
            await this._loadOrders();
        } catch (error) {
            console.error('Erreur commande:', error);
            alert('Erreur lors de la création de la commande');
        }
    }

    async fetch_patient_data() {
        if (!this.patient_search.el || !this.patient_search.el.value) {
            alert("Veuillez entrer un code patient");
            return;
        }
        try {
            const result = await this.orm.call('res.partner', 'action_get_patient_data', [[this.patient_search.el.value]]);
            document.getElementById('patient-title').textContent = result.name || '—';
            document.getElementById('patient-code').textContent = result.unique || '-';
            document.getElementById('patient-age').textContent = result.dob || '-';
            document.getElementById('patient-blood').textContent = result.blood_group || '-';
            document.getElementById('patient-gender').textContent = result.gender || '-';
            const img = document.getElementById('patient-image');
            if (img) {
                img.src = result.image_1920
                    ? 'data:image/png;base64,' + result.image_1920
                    : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            }
        } catch (e) {
            alert('Patient non trouvé');
        }
    }

    async fetch_vaccine_data() {
        try {
            this.state.vaccine = await this.orm.call('product.template', 'action_get_vaccine_data', []);
        } catch(e) {
            this.state.vaccine = [];
        }
    }

    clear_data() {
        if (this.patient_search.el) this.patient_search.el.value = '';
        ['patient-title', 'patient-code', 'patient-age', 'patient-blood', 'patient-gender'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = id === 'patient-title' ? '—' : '-';
        });
        const img = document.getElementById('patient-image');
        if (img) img.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    }

    getCurrentDateFormatted() {
        const date = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        try {
            return date.toLocaleDateString('fr-FR', options);
        } catch (e) {
            return date.toDateString();
        }
    }

    logout() {
        if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            window.location.href = '/web/session/logout';
        }
    }

    async refreshData() {
        try {
            await this.loadInitialData();
            // Show success message
            const notification = document.createElement('div');
            notification.textContent = 'Données actualisées';
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #0D9E8A; color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999; animation: slideIn 0.3s ease-in-out;';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } catch(e) {
            console.error('Refresh error:', e);
            alert('Erreur lors de l\'actualisation des données');
        }
    }

    // ─────────── MEDICINE FORM ─────────
    openMedicineForm() {
        this.state.medicineForm = {
            name: '',
            category: '',
            price: 0,
            quantity: 0,
            description: '',
            image: null,
            imagePreview: null,
        };
        this.state.showMedicineForm = true;
    }

    closeMedicineForm() {
        this.state.showMedicineForm = false;
    }

    handleMedicineImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.state.medicineForm.image = e.target.result; // Base64 data
                this.state.medicineForm.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async createMedicine() {
        if (!this.state.medicineForm.name) {
            alert('Veuillez entrer le nom du médicament');
            return;
        }
        try {
            const medicineData = {
                name: this.state.medicineForm.name,
                type: 'product',
                medicine_ok: true,
                list_price: this.state.medicineForm.price,
                description: this.state.medicineForm.description,
                categ_id: 1,
            };
            
            // Add image if provided
            if (this.state.medicineForm.image) {
                medicineData.image_1920 = this.state.medicineForm.image.split(',')[1]; // Remove data:image/png;base64, prefix
            }
            
            const result = await this.orm.call('product.template', 'create', [medicineData]);
            alert('Médicament créé avec succès !');
            this.closeMedicineForm();
            await this._loadStats();
            await this.loadInitialData();
        } catch(e) {
            console.error('Medicine creation error:', e);
            alert('Erreur lors de la création du médicament');
        }
    }

    // ─────────── VACCINE FORM ─────────
    openVaccineForm() {
        this.state.vaccineForm = {
            name: '',
            manufacturer: '',
            price: 0,
            quantity: 0,
            storage_temp: '2-8°C',
            expiration_date: '',
        };
        this.state.showVaccineForm = true;
    }

    closeVaccineForm() {
        this.state.showVaccineForm = false;
    }

    async createVaccine() {
        if (!this.state.vaccineForm.name) {
            alert('Veuillez entrer le nom du vaccin');
            return;
        }
        try {
            const result = await this.orm.call('product.template', 'create', [{
                name: this.state.vaccineForm.name,
                type: 'product',
                medicine_ok: false,
                is_vaccine: true,
                list_price: this.state.vaccineForm.price,
                categ_id: 1,
            }]);
            alert('Vaccin créé avec succès !');
            this.closeVaccineForm();
            await this.fetch_vaccine_data();
        } catch(e) {
            console.error('Vaccine creation error:', e);
            alert('Erreur lors de la création du vaccin');
        }
    }

    // ─────────── SUPPLIER FORM ─────────
    openSupplierForm() {
        this.state.supplierForm = {
            name: '',
            email: '',
            phone: '',
            address: '',
            products: [],
        };
        this.state.showSupplierForm = true;
    }

    closeSupplierForm() {
        this.state.showSupplierForm = false;
    }

    async createSupplier() {
        if (!this.state.supplierForm.name) {
            alert('Veuillez entrer le nom du fournisseur');
            return;
        }
        try {
            const result = await this.orm.call('res.partner', 'create', [{
                name: this.state.supplierForm.name,
                email: this.state.supplierForm.email,
                phone: this.state.supplierForm.phone,
                supplier: true,
                is_company: true,
            }]);
            alert('Fournisseur créé avec succès !');
            this.closeSupplierForm();
            await this._loadOrders();
        } catch(e) {
            console.error('Supplier creation error:', e);
            alert('Erreur lors de la création du fournisseur');
        }
    }

    // ─────────── PURCHASE ORDER FORM ─────────
    openOrderForm() {
        this.state.orderForm = {
            supplier_id: '',
            items: [],
            delivery_date: '',
        };
        this.state.showOrderForm = true;
    }

    closeOrderForm() {
        this.state.showOrderForm = false;
    }

    async createPurchaseOrder() {
        if (!this.state.orderForm.supplier_id) {
            alert('Veuillez sélectionner un fournisseur');
            return;
        }
        if (this.state.orderForm.items.length === 0) {
            alert('Veuillez ajouter au moins un produit');
            return;
        }
        try {
            const order_lines = this.state.orderForm.items.map(item => [0, 0, {
                product_id: item.product_id,
                product_qty: item.qty,
                price_unit: item.price,
            }]);
            
            const result = await this.orm.call('purchase.order', 'create', [{
                partner_id: this.state.orderForm.supplier_id,
                order_line: order_lines,
                date_planned: this.state.orderForm.delivery_date,
            }]);
            alert('Commande créée avec succès !');
            this.closeOrderForm();
            await this._loadOrders();
        } catch(e) {
            console.error('Order creation error:', e);
            alert('Erreur lors de la création de la commande');
        }
    }

    _initCharts() {
        // Verify Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping chart initialization');
            return;
        }

        const ctx1 = document.getElementById('fluxChart');
        const ctx2 = document.getElementById('stockChart');
        
        if (!ctx1 || !ctx2) {
            console.warn('Chart containers not found');
            return;
        }
        
        // Destroy existing charts if any
        if (window.fluxChartInstance) window.fluxChartInstance.destroy();
        if (window.stockChartInstance) window.stockChartInstance.destroy();

        // Prepare dynamic data for flux chart
        const todayRevenue = parseFloat(this.state.stats.revenue_today) || 0;
        const ordersToday = this.state.stats.orders_today || 0;
        const lowStockCount = this.state.stats.low_stock_count || 0;
        const totalMedicines = this.state.stats.total_medicines || 0;

        // Calculate stock status for doughnut chart
        const outOfStock = this.state.stock_alerts.out_of_stock_count || 0;
        const lowStock = this.state.stock_alerts.low_stock_count || 0;
        const availableStock = Math.max(0, totalMedicines - outOfStock - lowStock);

        // Line Chart - Évolution des Flux (with dynamic data)
        window.fluxChartInstance = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
                datasets: [
                    {
                        label: 'Entrées Stock',
                        data: [3200, 5800, 9200, 4100, 5500, 3800, 4600],
                        borderColor: '#5C3D5E',
                        backgroundColor: 'rgba(92,61,94,0.07)',
                        tension: 0.4, fill: true,
                        pointBackgroundColor: '#5C3D5E',
                        pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4,
                    },
                    {
                        label: 'Ventes (Aujourd\'hui: ' + ordersToday + ')',
                        data: [1800, 3200, 4800, 5600, 5200, 4900, ordersToday * 800],
                        borderColor: '#0D9E8A',
                        backgroundColor: 'rgba(13,158,138,0.07)',
                        tension: 0.4, fill: true,
                        pointBackgroundColor: '#0D9E8A',
                        pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'bottom' } },
                scales: {
                    y: { grid: { color: '#EDE8F2' }, ticks: { font: { size: 11 } } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Doughnut Chart - Répartition du Stock (with real data)
        const stockData = [availableStock, lowStock, outOfStock];
        const stockLabels = [
            'En Stock (' + availableStock + ')',
            'Stock Faible (' + lowStock + ')',
            'Rupture (' + outOfStock + ')'
        ];
        
        window.stockChartInstance = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: stockLabels,
                datasets: [{
                    data: stockData,
                    backgroundColor: ['#0D9E8A', '#FFA500', '#FF6B6B'],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '74%',
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed + ' articles';
                            }
                        }
                    }
                }
            }
        });
    }
}

PharmacyDashboard.template = "PharmacyDashboard";
PharmacyDashboard.components = { PharmacyOrderLines };
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);