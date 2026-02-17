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

        } catch (error) {
            console.error('Dashboard load error:', error);
        }
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
        if (menu === 'vaccines' && this.state.vaccine.length === 0) {
            this.fetch_vaccine_data();
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
}

PharmacyDashboard.template = "PharmacyDashboard";
PharmacyDashboard.components = { PharmacyOrderLines };
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);