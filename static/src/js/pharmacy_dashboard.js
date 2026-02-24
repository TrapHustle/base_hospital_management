/** @odoo-module */
import { registry } from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { useRef } from "@odoo/owl";
import { Component, useState, onWillStart } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";

export class PharmacyDashboard extends Component {
    setup() {
        super.setup(...arguments);
        this.ref = useRef('root');
        this.orm = useService('orm');
        this.user = user;
        this.actionService = useService("action");

        this.state = useState({
            menu: 'home',
            currentDate: '',
            medicinesCount: 0,
            medicinesSubtitle: '',
            vaccinesCount: 0,
            vaccinesSubtitle: '',
            pendingOrdersCount: 0,
            ordersSubtitle: '',
            lowStockCount: 0,
            stockSubtitle: '',
            recent_orders: [],
            low_stock_items: [],
            order_line: [],
            vaccine: [],
            medicines: [],
        });

        onWillStart(async () => await this.load_pharmacy_data());
    }

    async load_pharmacy_data() {
        try {
            // Set current date
            const today = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            this.state.currentDate = today.toLocaleDateString('fr-FR', options);

            // Get medicines count
            const medicines = await this.orm.call('product.product', 'search_count', [[
                ['product_tmpl_id.pharmaceutical_form', '!=', False]
            ]]);
            this.state.medicinesCount = medicines || 0;
            this.state.medicinesSubtitle = 'En stock';

            // Get vaccines count
            const vaccines = await this.orm.call('product.product', 'search_count', [[
                ['product_tmpl_id.is_vaccine', '=', True]
            ]]);
            this.state.vaccinesCount = vaccines || 0;
            this.state.vaccinesSubtitle = 'Disponibles';

            // Get pending orders count
            const pendingOrders = await this.orm.call('sale.order', 'search_count', [[
                ['state', '=', 'draft']
            ]]);
            this.state.pendingOrdersCount = pendingOrders || 0;
            this.state.ordersSubtitle = 'À traiter';

            // Get low stock items
            const lowStockProducts = await this.orm.search_read('product.product', [
                ['qty_available', '<', 'product_tmpl_id.reorder_level']
            ], ['name', 'qty_available', 'product_tmpl_id'], { limit: 5 });

            this.state.lowStockCount = lowStockProducts ? lowStockProducts.length : 0;
            this.state.stockSubtitle = 'À commander';

            this.state.low_stock_items = (lowStockProducts || []).map(product => {
                let status = 'normal';
                let status_label = 'Normal';

                if (product.qty_available <= 0) {
                    status = 'critical';
                    status_label = 'Rupture';
                } else if (product.qty_available < 10) {
                    status = 'low';
                    status_label = 'Faible';
                }

                return {
                    name: product.name,
                    quantity: Math.floor(product.qty_available),
                    threshold: 10,
                    status: status,
                    status_label: status_label
                };
            });

            // Get recent orders
            const recentOrders = await this.orm.search_read('sale.order', [
                ['state', 'not in', ['draft', 'cancel']]
            ], ['name', 'amount_total', 'order_line', 'create_date'], { 
                limit: 5, 
                order: 'create_date DESC' 
            });

            this.state.recent_orders = (recentOrders || []).map(order => ({
                name: order.name,
                date: order.create_date ? new Date(order.create_date).toLocaleDateString('fr-FR') : 'N/A',
                product_qty: order.order_line ? order.order_line.length : 0,
                total_amount: (order.amount_total || 0).toFixed(2) + ' €',
                urgent: false
            }));

        } catch (error) {
            console.error('Erreur chargement pharmacy dashboard:', error);
        }
    }

    async create_order(menu) {
        this.state.menu = menu;
    }

    async fetch_medicine_data(menu) {
        this.state.menu = menu;
        try {
            const medicines = await this.orm.search_read('product.product', [
                ['product_tmpl_id.pharmaceutical_form', '!=', False]
            ], ['name', 'list_price', 'qty_available', 'image_1920', 'product_tmpl_id'], { limit: 20 });
            
            this.state.medicines = medicines || [];
        } catch (error) {
            console.error('Error fetching medicines:', error);
        }
    }

    async fetch_vaccine_data(menu) {
        this.state.menu = menu;
        try {
            const vaccines = await this.orm.search_read('product.product', [
                ['product_tmpl_id.is_vaccine', '=', True]
            ], ['name', 'list_price', 'qty_available', 'image_1920', 'product_tmpl_id'], { limit: 20 });
            
            this.state.vaccine = vaccines || [];
        } catch (error) {
            console.error('Error fetching vaccines:', error);
        }
    }

    async fetch_sale_orders(menu) {
        this.state.menu = menu;
        try {
            const orders = await this.orm.search_read('sale.order', [
                ['state', 'not in', ['draft', 'cancel']]
            ], ['name', 'amount_total', 'order_line', 'create_date', 'state'], { 
                limit: 20,
                order: 'create_date DESC'
            });
            
            // This would typically show the full orders view
            this.actionService.doAction({
                name: _t('Commandes'),
                type: 'ir.actions.act_window',
                res_model: 'sale.order',
                view_mode: 'list,form',
                views: [[false, 'list'], [false, 'form']],
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }
}

PharmacyDashboard.template = "PharmacyDashboard";
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);
