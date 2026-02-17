/** @odoo-module */
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PharmacyOrderLines extends Component {

    setup() {
        this.orm = useService('orm');
        this.state = useState({
            product: this.props.line.product,
            qty: this.props.line.qty,
            uom: this.props.line.uom,
            price: this.props.line.price,
            sub_total: this.props.line.sub_total,
        });
    }

    async _onChange_prod_price(product_id) {
        this.state.product = product_id;
        const result = await this.orm.call(
            'product.template',
            'get_medicine_price',
            [product_id]
        );
        this.state.price = result.price || 0;
        this.state.uom = result.uom || 0;
        this._updateLine();
    }

    _onChange_prod_qty() {
        this.state.qty = parseInt(this.lineState.qty) || 1;
        this.state.sub_total = this.state.qty * this.state.price;
        this._updateLine();
    }

    _updateLine() {
        this.state.sub_total = this.state.qty * this.state.price;
        this.props.updateOrderLine(
            {
                product: this.state.product,
                qty: this.state.qty,
                uom: this.state.uom,
                price: this.state.price,
                sub_total: this.state.sub_total,
            },
            this.props.line.id
        );
    }

    remove_line() {
        this.props.removeLine(this.props.line.id);
    }

    get lineState() {
        return this.props.line;
    }

    get state() {
        return this.__owl__.component ? this.__owl__.component.state : this._state;
    }
}

PharmacyOrderLines.template = "PharmacyOrderLines";
PharmacyOrderLines.props = {
    line: Object,
    state: Object,
    updateOrderLine: Function,
    removeLine: Function,
};