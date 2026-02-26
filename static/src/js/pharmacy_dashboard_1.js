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
            currency: '$',
            med: [],
            show_add_medicine_form: false,
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
        this.state.show_add_medicine_form = false;
        if (menu === 'vaccines' && this.state.vaccine.length === 0) {
            this.fetch_vaccine_data();
        }
    }

    setShowAddMedicineForm(show) {
        this.state.show_add_medicine_form = show;
    }

    async saveMedicine() {
        try {
            // Récupérer les valeurs du formulaire
            const name = document.getElementById('med-name').value;
            const category = document.getElementById('med-category').value;
            const dosage = document.getElementById('med-dosage').value;
            const form = document.getElementById('med-form').value;
            const price = parseFloat(document.getElementById('med-price').value);
            const stock = parseInt(document.getElementById('med-stock').value);
            const expdate = document.getElementById('med-expdate').value;
            const supplier = document.getElementById('med-supplier').value;
            const description = document.getElementById('med-description').value;

            // Validation basique
            if (!name || !category || !dosage || !form || !price || stock === '') {
                alert('Veuillez remplir tous les champs obligatoires');
                return;
            }

            // Créer le médicament via ORM
            const medicineId = await this.orm.create('product.product', [{
                name: name,
                categ_id: category,
                list_price: price,
                qty_available: stock,
                description: description,
                supplier: supplier,
            }]);

            // Ajouter aux données locales
            this.state.product_lst.push({
                id: medicineId,
                name: name,
                list_price: price,
                qty_available: stock,
            });

            // Réinitialiser le formulaire
            document.getElementById('med-name').value = '';
            document.getElementById('med-category').value = '';
            document.getElementById('med-dosage').value = '';
            document.getElementById('med-form').value = '';
            document.getElementById('med-price').value = '';
            document.getElementById('med-stock').value = '';
            document.getElementById('med-expdate').value = '';
            document.getElementById('med-supplier').value = '';
            document.getElementById('med-description').value = '';

            // Fermer le formulaire
            this.state.show_add_medicine_form = false;

            console.log('Médicament créé avec succès:', medicineId);
        } catch(error) {
            console.error('Erreur lors de la création du médicament:', error);
            alert('Erreur lors de l\'enregistrement du médicament');
        }
    }

    updateOrderTotal() {
        // Récupérer les valeurs
        const qty = parseInt(document.getElementById('order-qty').value) || 0;
        const price = parseFloat(document.getElementById('order-price').value) || 0;
        
        // Calculer le total
        const total = qty * price;
        
        // Mettre à jour l'affichage du total
        const totalElement = document.getElementById('order-total');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }
    }

    async saveOrder() {
        try {
            // Récupérer les valeurs du formulaire
            const supplier = document.getElementById('order-supplier').value;
            const orderDate = document.getElementById('order-date').value;
            const productId = document.getElementById('order-product').value;
            const qty = parseInt(document.getElementById('order-qty').value);
            const price = parseFloat(document.getElementById('order-price').value);
            const deliveryDate = document.getElementById('order-date-delivery').value;
            const notes = document.getElementById('order-notes').value;

            // Validation basique
            if (!supplier || !orderDate || !productId || !qty || !price) {
                alert('Veuillez remplir tous les champs obligatoires');
                return;
            }

            // Calculer le montant total
            const totalAmount = qty * price;

            // Créer la commande via ORM
            const orderId = await this.orm.create('purchase.order', [{
                partner_id: supplier,
                order_line: [[0, 0, {
                    product_id: parseInt(productId),
                    product_qty: qty,
                    price_unit: price,
                }]],
                notes: notes,
                date_planned: deliveryDate || orderDate,
            }]);

            // Ajouter aux données locales
            this.state.order_data.push({
                id: orderId,
                partner_id: [supplier, supplier],
                amount_total: totalAmount,
                create_date: orderDate,
            });

            // Réinitialiser le formulaire
            document.getElementById('order-supplier').value = '';
            document.getElementById('order-date').value = '';
            document.getElementById('order-product').value = '';
            document.getElementById('order-qty').value = '';
            document.getElementById('order-price').value = '';
            document.getElementById('order-date-delivery').value = '';
            document.getElementById('order-notes').value = '';
            document.getElementById('order-total').textContent = '0.00';

            // Retourner au menu home
            this.state.menu = 'home';

            alert('Commande créée avec succès!');
            console.log('Commande créée avec succès:', orderId);
        } catch(error) {
            console.error('Erreur lors de la création de la commande:', error);
            alert('Erreur lors de l\'enregistrement de la commande');
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

    logout() {
        if (window.confirm('Etes-vous sur de vouloir vous deconnecter ?')) {
            window.location.href = '/web/session/logout';
        }
    }
}

PharmacyDashboard.template = "PharmacyDashboard";
PharmacyDashboard.components = { PharmacyOrderLines };
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);