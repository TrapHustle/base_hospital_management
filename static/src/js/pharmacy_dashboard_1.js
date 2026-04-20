/** @odoo-module */
import { registry } from '@web/core/registry';
import { useRef } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
const { Component, onWillStart, useState } = owl;
import { PharmacyOrderLines } from "./pharmacy_orderlines";
import { user } from "@web/core/user";

var sub_total = 0;

export class PharmacyDashboard extends Component {

    setup() {
        super.setup(...arguments);
        this.ref             = useRef('root');
        this.vaccine_div     = useRef('vaccine_div');
        this.medicine_div    = useRef('medicine_div');
        this.home_content    = useRef('home_content');
        this.orders_div      = useRef('orders_div');
        this.patient_name    = useRef('PatientName');
        this.patient_email   = useRef('Email');
        this.patient_search  = useRef('PatientSearch');

        // ⚠️ FIX: ces refs manquaient dans l'ancien JS mais sont utilisés dans create_sale_order
        this.patient_phone   = useRef('PatientPhone');
        this.patient_dob     = useRef('PatientDob');

        this.orm           = useService('orm');
        this.user          = user;
        this.actionService = useService("action");

        this.state = useState({
            user_name    : '',
            product_lst  : [],
            medicines    : [],
            units        : [],
            sub_total,
            vaccine      : [],
            order_data   : [],
            order_line   : [],
            menu         : 'home',
            // Stats cards
            stats: {
                total_medicines : 0,
                total_vaccines  : 0,
                total_orders    : 0,
                revenue         : 0,
            },
            recent_activities: [],
        });

        this.fetch_product();

        onWillStart(async () => {
            // Nom de l'utilisateur connecté
            this.state.user_name = user.name || '';

            // Médicaments
            this.state.med = await this.orm.call(
                'product.template', 'action_get_medicine_data', [], {}
            );

            // Stats pour les cartes
            await this._load_stats();

            // Activités récentes
            await this._load_recent_activities();
        });
    }

    // ─── Stats ───────────────────────────────────────────────────────────────

    async _load_stats() {
        try {
            // Médicaments
            const medicines = await this.orm.call(
                'product.template', 'search_read',
                [[['medicine_ok', '=', true]], ['id']],
                { limit: 0 }
            );
            this.state.stats.total_medicines = medicines.length;

            // Vaccins
            const vaccines = await this.orm.call(
                'product.template', 'action_get_vaccine_data', [], {}
            );
            this.state.stats.total_vaccines = vaccines.length;

            // Commandes
            const orders = await this.orm.call(
                'sale.order', 'search_read',
                [
                    [['partner_id.patient_seq', 'not in', ['New', 'Employee', 'User']]],
                    ['id', 'amount_total']
                ],
                { limit: 0 }
            );
            this.state.stats.total_orders = orders.length;
            this.state.stats.revenue = orders
                .reduce((acc, o) => acc + (o.amount_total || 0), 0)
                .toFixed(0);

        } catch (e) {
            console.warn('Stats loading error:', e);
        }
    }

    // ─── Activités récentes ───────────────────────────────────────────────────

    async _load_recent_activities() {
        try {
            const orders = await this.orm.call(
                'sale.order', 'search_read',
                [
                    [['partner_id.patient_seq', 'not in', ['New', 'Employee', 'User']]],
                    ['name', 'create_date', 'partner_id', 'amount_total', 'state']
                ],
                { limit: 8, order: 'create_date desc' }
            );
            this.state.recent_activities = orders.map((o, i) => ({
                id    : o.id || i,
                type  : o.state === 'sale' ? 'confirmed' : 'order',
                title : `Commande ${o.name} — ${o.partner_id ? o.partner_id[1] : ''}`,
                time  : o.create_date ? o.create_date.substring(0, 16).replace('T', ' ') : '',
            }));
        } catch (e) {
            console.warn('Recent activities error:', e);
        }
    }

    // ─── Produits ─────────────────────────────────────────────────────────────

    async fetch_product() {
        const domain = [['medicine_ok', '=', true]];
        const result = await this.orm.call('product.template', 'search_read', [domain]);
        this.state.product_lst = result;
        this.create_order('home');
    }

    // ─── Navigation ──────────────────────────────────────────────────────────

    async create_order(menu = 'home') {
        this.state.menu = 'home';

        // Devise de la société
        try {
            const result = await this.orm.call('hospital.pharmacy', 'company_currency');
            const el = document.getElementById('symbol');
            if (el) el.textContent = result || '';
        } catch (e) { /* ignore */ }

        this.state.medicines = this.state.product_lst;
    }

    async fetch_medicine_data(menu = 'medicines') {
        this.state.menu = 'medicines';
    }

    async fetch_vaccine_data(menu = 'vaccines') {
        this.state.menu = 'vaccines';
        this.state.vaccine = await this.orm.call(
            'product.template', 'action_get_vaccine_data', [], {}
        );
    }

    async fetch_sale_orders(menu = 'orders') {
        this.state.menu = 'orders';
        this.state.order_data = await this.orm.call(
            'sale.order', 'search_read',
            [
                [['partner_id.patient_seq', 'not in', ['New', 'Employee', 'User']]],
                ['name', 'create_date', 'partner_id', 'amount_total', 'state']
            ],
            {}
        );
    }

    // ─── Order lines ─────────────────────────────────────────────────────────

    updateOrderLine(line, id) {
        const orderline = this.state.order_line.find(ol => ol.id === id);
        if (!orderline) return;
        orderline.product   = line.product;
        orderline.qty       = parseInt(line.qty);
        orderline.uom       = line.uom;
        orderline.price     = line.price;
        orderline.sub_total = line.sub_total;
    }

    addRow() {
        this.state.order_line = [
            ...this.state.order_line,
            owl.reactive({ id: new Date(), product: false, qty: 1, uom: 0, price: 0, sub_total: 0 })
        ];
    }

    removeLine(id) {
        this.state.order_line = this.state.order_line.filter(line => line.id != id);
    }

    // ─── Créer commande ───────────────────────────────────────────────────────

    async create_sale_order() {
        // Validations
        if (!this.patient_name.el?.value) {
            alert("Veuillez saisir le nom du patient.");
            return;
        }
        if (!this.patient_email.el?.value) {
            alert("Veuillez saisir l'email du patient.");
            return;
        }
        if (!this.state.order_line.length) {
            alert("Veuillez ajouter au moins un médicament.");
            return;
        }

        const data = {
            name    : this.patient_name.el.value,
            // ⚠️ FIX: utilisation des bonnes refs (manquaient dans l'original)
            phone   : this.patient_phone.el?.value || '',
            email   : this.patient_email.el.value,
            dob     : this.patient_dob.el?.value || '',
            gender  : document.querySelector('input[name="gender"]:checked')?.value || '',
            products: this.state.order_line,
        };

        try {
            const result = await this.orm.call('hospital.pharmacy', 'create_sale_order', [data]);
            alert(`Commande créée avec le numéro : ${result.invoice}`);
            window.location.reload();
        } catch (e) {
            alert("Erreur lors de la création de la commande.");
            console.error(e);
        }
    }

    // ─── Patient ──────────────────────────────────────────────────────────────

    async fetch_patient_data() {
        if (!this.patient_search.el?.value) return;

        try {
            const result = await this.orm.call(
                'res.partner', 'action_get_patient_data',
                [[this.patient_search.el.value]], {}
            );

            document.getElementById('patient-title').textContent  = result.name        || '';
            document.getElementById('patient-code').textContent   = result.unique      || '';
            document.getElementById('patient-age').textContent    = result.dob         || '';
            document.getElementById('patient-blood').textContent  = result.blood_group || '';
            document.getElementById('patient-gender').textContent = result.gender      || '';

            const img = document.getElementById('patient-image');
            img.src = result.image_1920
                ? 'data:image/png;base64,' + result.image_1920
                : 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

            // ⚠️ FIX: vérification sécurisée de l'élément hist_head
            if (result.name === 'Patient Not Found') {
                const histHead = document.getElementById('hist_head');
                if (histHead) histHead.innerHTML = '';
                img.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            }
        } catch (e) {
            console.error('Patient search error:', e);
        }
    }

    async clear_data() {
        if (this.patient_search.el) this.patient_search.el.value = '';

        const histHead = document.getElementById('hist_head');
        if (histHead) histHead.innerHTML = '';

        ['patient-title', 'patient-code', 'patient-gender',
         'patient-blood', 'patient-age'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });

        const img = document.getElementById('patient-image');
        if (img) {
            img.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
        }
    }
}

PharmacyDashboard.template    = "PharmacyDashboard";
PharmacyDashboard.components  = { PharmacyOrderLines };
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);