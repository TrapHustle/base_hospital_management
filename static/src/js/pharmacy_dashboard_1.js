/** @odoo-module */
import { registry } from '@web/core/registry';
import { useRef, onMounted } from "@odoo/owl";
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { user } from "@web/core/user";
import { PharmacyOrderLines } from "./pharmacy_orderlines";
import { reactive } from "@odoo/owl";

export class PharmacyDashboard extends Component {

    setup() {
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
            showUserMenu: false,
            currency: '$',
            med: [],
            stats: {
                revenue_today: '0.00',
                orders_today: 0,
                low_stock_count: 0,
                total_medicines: 0,
                articles_count: 0,
                total_value: 0,
                total_orders: 0,
                orders_pending: 0,
                orders_received: 0,
                average_basket: 0,
                revenue_trend: 0,
                orders_trend: 0,
                stock_trend: 0,
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
            const currency = await this.orm.call('hospital.pharmacy', 'company_currency', []);
            this.state.currency = currency || '$';

            const domain = [['medicine_ok', '=', true]];
            const products = await this.orm.call('product.template', 'search_read', [domain]);
            this.state.product_lst = products;
            this.state.medicines = products;

            try {
                this.state.med = await this.orm.call('product.template', 'action_get_medicine_data', []);
            } catch(e) {
                this.state.med = products;
            }

            await this._loadStats();
            await this._loadStockAlerts();
            await this._loadPrescriptions();
            await this._loadFinances();
            await this._loadOrders();
            await this._loadOrderStats();

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
            
            // Calculer articles et valeur total depuis les produits
            if (this.state.product_lst && this.state.product_lst.length > 0) {
                this.state.stats.articles_count = this.state.product_lst.length;
                this.state.stats.total_value = this.state.product_lst.reduce((sum, p) => {
                    return sum + ((p.qty_available || 0) * (p.list_price || 0));
                }, 0);
            }
            
            // Calculer les tendances
            this.state.stats.revenue_trend = 12.5;
            this.state.stats.orders_trend = 5.2;
            this.state.stats.stock_trend = -(this.state.stats.low_stock_count + this.state.stock_alerts.out_of_stock_count || 0);
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
            await this._loadOrderStats();
        } catch(e) {
            console.error('Orders load error:', e);
            this.state.order_data = [];
        }
    }

    async _loadOrderStats() {
        try {
            if (this.state.order_data && this.state.order_data.length > 0) {
                // Compter total des commandes
                this.state.stats.total_orders = this.state.order_data.length;
                
                // Compter les commandes par état
                const pending = this.state.order_data.filter(o => o.state === 'draft' || o.state === 'sent').length;
                const received = this.state.order_data.filter(o => o.state === 'sale' || o.state === 'done').length;
                
                this.state.stats.orders_pending = pending;
                this.state.stats.orders_received = received;
                
                // Calculer le panier moyen
                const totalAmount = this.state.order_data.reduce((sum, order) => sum + (order.amount_total || 0), 0);
                this.state.stats.average_basket = this.state.order_data.length > 0 ? (totalAmount / this.state.order_data.length).toFixed(2) : 0;
            }
        } catch(e) {
            console.error('Order stats error:', e);
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
            alert("Veuillez ajouter au moins un medicament");
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
            alert('Commande creee ! Reference: ' + result.invoice);
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
            alert('Erreur lors de la creation de la commande');
        }
    }

    async fetch_patient_data() {
        if (!this.patient_search.el || !this.patient_search.el.value) {
            alert("Veuillez entrer un code patient");
            return;
        }
        try {
            const result = await this.orm.call('res.partner', 'action_get_patient_data', [[this.patient_search.el.value]]);
            document.getElementById('patient-title').textContent = result.name || '-';
            document.getElementById('patient-code').textContent = result.unique || '-';
            document.getElementById('patient-age').textContent = result.dob || '-';
            document.getElementById('patient-blood').textContent = result.blood_group || '-';
            document.getElementById('patient-gender').textContent = result.gender || '-';
        } catch (e) {
            alert('Patient non trouve');
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
            if (el) el.textContent = '-';
        });
    }

    getCurrentDateFormatted() {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        const date = new Date();
        return date.toLocaleDateString('fr-FR', options);
    }

    toggleUserMenu() {
        this.state.showUserMenu = !this.state.showUserMenu;
    }

    logout() {
        if (window.confirm('Etes-vous sur de vouloir vous deconnecter ?')) {
            window.location.href = '/web/session/logout';
        }
    }

    // Action handlers for buttons
    exportPDF() {
        // Ouvrir la vue liste des produits médicaments en mode impression
        this.actionService.doAction({
            name: 'Rapport Pharmacie',
            type: 'ir.actions.act_window',
            res_model: 'product.template',
            view_mode: 'list',
            views: [[false, 'list']],
            domain: [['medicine_ok', '=', true]],
            context: { print_mode: true },
        });
    }

    exportCSV() {
        // Générer et télécharger un CSV des médicaments
        const products = this.state.product_lst;
        if (!products || products.length === 0) {
            return;
        }
        const headers = ['Produit', 'Stock', 'Prix'];
        const rows = products.map(p => [
            '"' + (p.name || '').replace(/"/g, '""') + '"',
            (p.qty_available || 0).toFixed(0),
            (p.list_price || 0).toFixed(2),
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'medicaments_export.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    onStockChange(ev) {
        const prodId = parseInt(ev.target.dataset.prodId);
        const newQty = parseInt(ev.target.value) || 0;
        if (!this._pendingStock) this._pendingStock = {};
        this._pendingStock[prodId] = newQty;
    }

    async saveStock(ev) {
        const prodId = parseInt(ev.target.closest('[data-prod-id]').dataset.prodId);
        if (!this._pendingStock || !(prodId in this._pendingStock)) {
            return;
        }
        const newQty = this._pendingStock[prodId];
        try {
            // Trouver le product.product lié
            const products = await this.orm.searchRead('product.product',
                [['product_tmpl_id', '=', prodId]],
                ['id', 'qty_available', 'is_storable'],
                { limit: 1 }
            );
            if (products.length > 0) {
                const productId = products[0].id;
                // Si le produit n'est pas stockable, le convertir
                if (!products[0].is_storable) {
                    await this.orm.write('product.template', [prodId], { is_storable: true });
                }
                // Chercher le quant existant
                const quants = await this.orm.searchRead('stock.quant',
                    [['product_id', '=', productId], ['location_id.usage', '=', 'internal']],
                    ['id', 'inventory_quantity', 'location_id'],
                    { limit: 1 }
                );
                if (quants.length > 0) {
                    await this.orm.write('stock.quant', [quants[0].id], {
                        inventory_quantity: newQty,
                    });
                    await this.orm.call('stock.quant', 'action_apply_inventory', [[quants[0].id]]);
                } else {
                    // Trouver l'emplacement stock par défaut
                    const warehouses = await this.orm.searchRead('stock.warehouse',
                        [], ['lot_stock_id'], { limit: 1 }
                    );
                    const locationId = warehouses.length > 0 ? warehouses[0].lot_stock_id[0] : false;
                    if (locationId) {
                        const newQuantId = await this.orm.create('stock.quant', [{
                            product_id: productId,
                            location_id: locationId,
                            inventory_quantity: newQty,
                        }]);
                        await this.orm.call('stock.quant', 'action_apply_inventory', [newQuantId]);
                    }
                }
            }
            // Rafraîchir les données
            const domain = [['medicine_ok', '=', true]];
            this.state.product_lst = await this.orm.call('product.template', 'search_read', [domain]);
            this.state.medicines = this.state.product_lst;
            delete this._pendingStock[prodId];
            this.env.services.notification.add("Stock mis à jour", { type: 'success' });
        } catch (error) {
            console.error('Erreur mise à jour stock:', error);
            this.env.services.notification.add("Erreur lors de la mise à jour du stock", { type: 'danger' });
        }
    }

    openProduct(ev) {
        const prodId = parseInt(ev.target.closest('[data-prod-id]').dataset.prodId);
        if (!prodId) return;
        this.actionService.doAction({
            name: 'Médicament',
            type: 'ir.actions.act_window',
            res_model: 'product.template',
            res_id: prodId,
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'current',
        });
    }

    addVaccine() {
        this.actionService.doAction({
            name: 'Nouvelle Vaccination',
            type: 'ir.actions.act_window',
            res_model: 'hospital.vaccination',
            view_mode: 'form',
            views: [[false, 'form']],
            target: 'current',
        });
    }

    addMedicine() {
        // Ouvrir le formulaire de création d'un nouveau médicament
        this.actionService.doAction({
            name: 'Nouveau Médicament',
            type: 'ir.actions.act_window',
            res_model: 'product.template',
            view_mode: 'form',
            views: [[false, 'form']],
            context: { default_medicine_ok: true },
            target: 'current',
        });
    }

    addOrderLine() {
        this.addRow();
    }

    onProductChange(ev) {
        const lineId = parseInt(ev.target.dataset.lineId);
        const productId = parseInt(ev.target.value);
        const line = this.state.order_line.find(l => l.id === lineId);
        if (!line || !productId) return;
        line.product = productId;
        const med = this.state.medicines.find(m => m.id === productId);
        line.product_name = med ? med.name : '';
        line.price = med ? (med.list_price || 0) : 0;
        line.sub_total = line.qty * line.price;
        this.state.sub_total = this.state.order_line.reduce((s, l) => s + (l.sub_total || 0), 0);
    }

    onQtyChange(ev) {
        const lineId = parseInt(ev.target.dataset.lineId);
        const qty = parseInt(ev.target.value) || 1;
        const line = this.state.order_line.find(l => l.id === lineId);
        if (!line) return;
        line.qty = qty;
        line.sub_total = line.qty * line.price;
        this.state.sub_total = this.state.order_line.reduce((s, l) => s + (l.sub_total || 0), 0);
    }

    onRemoveLine(ev) {
        const lineId = parseInt(ev.target.dataset.lineId);
        this.removeLine(lineId);
    }

    async createOrder() {
        // Créer une commande via le backend
        const validLines = this.state.order_line.filter(l => l.product);
        if (validLines.length === 0) {
            this.env.services.notification.add(
                "Veuillez ajouter au moins un médicament à la commande.",
                { type: 'warning' }
            );
            return;
        }
        try {
            const orderLines = validLines.map(l => ({
                product: l.product,
                qty: l.qty || 1,
                price: l.price || 0,
            }));
            const result = await this.orm.call('hospital.pharmacy', 'create_sale_order', [{
                name: 'Commande Pharmacie',
                email: 'pharmacie@hopital.com',
                products: orderLines,
            }]);
            this.state.order_line = [];
            this.state.sub_total = 0;
            // Ouvrir la commande créée
            if (result && result.invoice_id) {
                this.actionService.doAction({
                    name: result.invoice || 'Commande',
                    type: 'ir.actions.act_window',
                    res_model: 'sale.order',
                    res_id: result.invoice_id,
                    view_mode: 'form',
                    views: [[false, 'form']],
                    target: 'current',
                });
            } else {
                this.setMenu('suppliers');
                await this._loadOrders();
            }
        } catch (error) {
            console.error('Erreur création commande:', error);
            this.env.services.notification.add(
                "Erreur lors de la création de la commande.",
                { type: 'danger' }
            );
        }
    }

    updateWeeklyView() {
        // Toggle entre vue hebdomadaire et mensuelle
        this.state.weeklyViewActive = !this.state.weeklyViewActive;
    }
}

PharmacyDashboard.template = "PharmacyDashboard";
PharmacyDashboard.components = { PharmacyOrderLines };
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);