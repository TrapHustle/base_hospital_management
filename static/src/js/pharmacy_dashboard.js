/** @odoo-module */
import { registry} from '@web/core/registry';
import { useRef } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
const { Component, onWillStart, useState} = owl
import { PharmacyOrderLines } from "./pharmacy_orderlines";
import { user } from "@web/core/user";

    var currency=0;
    var quantity=0;
    var amount=0;
    var sub_t=0;
    var sub_total=0;
    var product_lst=[];
    var uom_lst= [];
    var invoice=0;
    var invoice_id=0;
    var tax=0;
export class PharmacyDashboard extends Component {
//Initialize Pharmacy Dashboard
    setup() {
        super.setup(...arguments);
        this.ref = useRef('root')
        this.vaccine_div = useRef('vaccine_div')
        this.medicine_div = useRef('medicine_div')
        this.home_content = useRef('home_content')
        this.patient_name = useRef('PatientName');
        this.patient_email = useRef('Email');
        this.patient_search = useRef('PatientSearch');
        this.orders_div = useRef('orders_div')

        this.patientTitle = useRef("patientTitle");
        this.patientCode = useRef("patientCode");
        this.patientAge = useRef("patientAge");
        this.patientBlood = useRef("patientBlood");
        this.patientGender = useRef("patientGender");

        this.orm = useService('orm')
        this.user = user;
        this.actionService = useService("action");
        this.state = useState({
              product_lst :[],
              medicines :[],
              units :[],
              prescriptions: [],
              sub_total,
              vaccine :[],
              order_data:[],
              order_line: [],
              menu: 'home',
        });
        this.fetch_product();
        onWillStart(async () => {
            this.state.med = await this.orm.call('product.template','action_get_medicine_data',[],)})
    }
//  Fetch product details
    async fetch_product() {
        const domain = [['medicine_ok', '=', true]];
        const result = await this.orm.call('product.template', 'search_read', [domain]);
        this.state.product_lst = result;
        this.create_order();
    }
//  Method for creating sale order
    async create_order() {
        this.state.menu = 'home';
//        this.vaccine_div?.el?.classList.add("d-none");
//        this.medicine_div?.el?.classList.add("d-none");
//        this.home_content?.el?.classList.remove("d-none");
//        this.orders_div?.el?.classList.add("d-none");
// Fetch the company currency
        const result = await this.orm.call('hospital.pharmacy', 'company_currency');
        const currencySymbolElement = document.getElementById('symbol' + currency);
        if (currencySymbolElement) {
            currencySymbolElement.textContent = result || '';
        }
        const symbolElement = document.getElementById('symbol');
        if (symbolElement) {
            symbolElement.textContent = result || '';
        }
        this.state.medicines = await this.product_lst;
        this.state.units = await this.uom_lst;
    }
// To update the orderline of sale order
    updateOrderLine(line, id) {
        const orderline = this.state.order_line.filter(orderline => orderline.id === id)[0]
        orderline.product = line.product
        orderline.qty = parseInt(line.qty)
        orderline.uom = line.uom
        orderline.price = line.price
        orderline.sub_total = line.sub_total
    }
//  To add new row in the sale order line
//    addRow () {
//        const data = [...this.state.order_line, owl.reactive({id: new Date(), product: false, qty: 1, uom: 0, price: 0, sub_total: 0})]
//        this.state.order_line = data
//    }

    async addRow() {
        const units = await this.fetch_uom();
        this.state.units = units;
        const newLine = {
            id: new Date().getTime(),
            product: false,
            qty: 1,
            uom: this.state.units?.length ? this.state.units[0].id : false,  // Set default UOM if available
            price: 0,
            sub_total: 0
        };
        this.state.order_line = [...this.state.order_line, owl.reactive(newLine)];
        console.log("order_line-->>", this.state.order_line);
    }

    async fetch_uom (){
        var uom_lst= [];
        var result= await this.orm.call( 'uom.uom','search_read',)
        return result
    }
// To remove the line if not needed
    removeLine(id){
        const filteredData = this.state.order_line.filter(line => line.id != id)
        this.state.order_line = filteredData
    }
 //  Create sale order
    async create_sale_order () {
        const patientNameEl = this.patient_name?.el;
        const patientEmailEl = this.patient_email?.el;
        const patientPhoneEl = document.getElementById('patient-phone');
        const patientDobEl = document.getElementById('o_patient-dob');

        if (!patientNameEl || !patientNameEl.value || patientNameEl.value.trim() === "") {
            alert("Please enter the Name");
            return;
        }
        if (!patientEmailEl || !patientEmailEl.value || patientEmailEl.value.trim() === "") {
            alert("Please enter the Email");
            return;
        }

        const products = (this.state.order_line || [])
            .filter((l) => l && l.product && Number(l.qty) >= 1);

        const hasInvalidQty = (this.state.order_line || []).some((l) => l && l.product && Number(l.qty) < 1);
        if (hasInvalidQty) {
            alert("Medicine quantity must be greater than or equal to 1.");
            return;
        }
        if (!products.length) {
            alert("Please add at least one medicine line.");
            return;
        }

        const data = {
            name: patientNameEl.value.trim(),
            phone: patientPhoneEl && patientPhoneEl.value ? patientPhoneEl.value.trim() : null,
            email: patientEmailEl.value.trim(),
            dob: patientDobEl && patientDobEl.value ? patientDobEl.value.trim() : null,
            products: this.state.order_line || [],
        };

        this.orm.call('hospital.pharmacy', 'create_sale_order', [data]
        ).then(function (result) {
            alert('The sale order has been created with reference number ' + result.invoice);
            window.location.reload();
        });
    }
//  Fetch patient data
    async fetch_patient_data () {
        var self = this;
        await this.orm.call('res.partner', 'action_get_patient_data',
           [[this.patient_search.el.value]],
        ).then(function (result) {
            // Update patient data using vanilla JavaScript with null checks
            const patientTitle = document.getElementById('patient-title');
            if (patientTitle) patientTitle.textContent = result.name || '';
            
            const patientCode = document.getElementById('patient-code');
            if (patientCode) patientCode.textContent = result.unique || '';
            
            const patientAge = document.getElementById('patient-age');
            if (patientAge) patientAge.textContent = result.dob || '';
            
            const patientBlood = document.getElementById('patient-blood');
            if (patientBlood) patientBlood.textContent = result.blood_group || '';
            
            const patientGender = document.getElementById('patient-gender');
            if (patientGender) patientGender.textContent = result.gender || '';
            
            // Update patient image with null check
            const patientImage = document.getElementById('patient-image');
            if (patientImage) {
                if (result.image_1920) {
                    patientImage.src = 'data:image/png;base64,' + result.image_1920;
                } else {
                    patientImage.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
                }
            }
            
            // Clear history head if it exists
            if (result.name == 'Patient Not Found') {
                const histHead = document.getElementById('hist_head');
                if (histHead) histHead.innerHTML = '';
                if (patientImage) patientImage.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            }
            
            // Fetch prescriptions after patient info is loaded
            self.fetch_patient_prescriptions(self.patient_search.el.value);
        }).catch(function (error) {
            console.error('Patient search error:', error);
        })
    }

//  Fetch patient prescriptions
    async fetch_patient_prescriptions(patientSearchValue) {
        var self = this;
        if (!patientSearchValue) return;
        
        await this.orm.call('res.partner', 'get_patient_prescriptions',
           [[patientSearchValue]],
        ).then(function (result) {
            self.state.prescriptions = result.prescriptions || [];
            self.render_prescriptions();
            
            // Setup event listeners for prescriptions
            self.setup_prescription_listeners();
        }).catch(function (error) {
            console.error('Error fetching prescriptions:', error);
        })
    }

//  Render prescriptions table
    render_prescriptions() {
        const container = document.getElementById('prescriptions-container');
        const tbody = document.getElementById('prescriptions-tbody');
        
        if (!this.state.prescriptions || this.state.prescriptions.length === 0) {
            if (container) container.style.display = 'none';
            return;
        }
        
        if (container) container.style.display = 'block';
        
        if (tbody) {
            tbody.innerHTML = '';
            
            this.state.prescriptions.forEach((presc, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <input type="checkbox" class="prescription-checkbox" 
                               data-index="${index}" 
                               data-medicine-id="${presc.medicine_id}"
                               data-medicine-name="${presc.medicine_name}"
                               data-qty="${presc.quantity}">
                    </td>
                    <td>${presc.medicine_name}</td>
                    <td>${presc.quantity}</td>
                    <td>${presc.no_intakes}</td>
                    <td>${presc.op_reference}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }

//  Setup prescription event listeners
    setup_prescription_listeners() {
        var self = this;
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-prescriptions');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                document.querySelectorAll('.prescription-checkbox').forEach(cb => {
                    cb.checked = this.checked;
                });
            });
        }
        
        // Add selected prescriptions button
        const addBtn = document.getElementById('add-selected-prescriptions');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                self.add_selected_prescriptions();
            });
        }
    }

//  Add selected prescriptions to products
    async add_selected_prescriptions() {
        const checked = document.querySelectorAll('.prescription-checkbox:checked');
        if (!checked || checked.length === 0) {
            alert('Veuillez sélectionner au moins une prescription');
            return;
        }

        // Ensure we have UoM list for UI lines
        if (!this.state.units || !this.state.units.length) {
            const units = await this.fetch_uom();
            this.state.units = units || [];
        }
        const defaultUomId = this.state.units?.length ? this.state.units[0].id : false;

        let addedCount = 0;

        checked.forEach((checkbox) => {
            const medicineId = parseInt(checkbox.getAttribute('data-medicine-id'));
            const qty = parseInt(checkbox.getAttribute('data-qty')) || 0;
            if (!medicineId || qty <= 0) return;

            const medicine = (this.state.medicines || []).find((m) => m.id === medicineId);
            const price = medicine?.list_price ?? medicine?.listPrice ?? 0;

            const existing = (this.state.order_line || []).find((l) => l.product === medicineId);

            if (existing) {
                existing.qty = (parseInt(existing.qty) || 0) + qty;
                existing.price = price;
                existing.sub_total = existing.qty * existing.price;
                existing.uom = existing.uom || defaultUomId;
            } else {
                const newLine = {
                    id: Date.now() + addedCount,
                    product: medicineId,
                    qty: qty,
                    uom: defaultUomId,
                    price: price,
                    sub_total: qty * price,
                };
                this.state.order_line = [...(this.state.order_line || []), owl.reactive(newLine)];
            }

            addedCount++;
        });

        // Force reactive update for duplicated additions/merges
        this.state.order_line = [...(this.state.order_line || [])];

        alert(`${addedCount} médicament(s) ajouté(s) à la commande`);
        const selectAll = document.getElementById('select-all-prescriptions');
        if (selectAll) selectAll.checked = false;
        document.querySelectorAll('.prescription-checkbox').forEach(cb => cb.checked = false);
    }

//  Fetch medicine data while clicking Medicine button
    async fetch_medicine_data () {
        this.state.menu = 'medicines';
//        this.vaccine_div?.el?.classList.add("d-none");
//        this.home_content?.el?.classList.add("d-none");
//        this.medicine_div?.el?.classList.remove("d-none");
//        this.orders_div?.el?.classList.add("d-none");
    }
//  Fetch vaccine data
    async fetch_vaccine_data () {
        this.state.menu = 'vaccines';
//        this.vaccine_div?.el?.classList.remove("d-none");
//        this.home_content?.el?.classList.add("d-none");
//        this.medicine_div?.el?.classList.add("d-none");
//        this.orders_div?.el?.classList.add("d-none");
        this.state.vaccine = await this.orm.call('product.template','action_get_vaccine_data', [],)
    }
//  Method fo fetching all sale orders
    async fetch_sale_orders () {
        this.state.menu = 'orders';
//        this.vaccine_div?.el?.classList.add("d-none");
//        this.home_content?.el?.classList.add("d-none");
//        this.medicine_div?.el?.classList.add("d-none");
//        this.orders_div?.el?.classList.remove("d-none");
        this.state.order_data = await this.orm.call('sale.order', 'search_read',
            [[['partner_id.patient_seq','not in', ['New', 'Employee', 'User']]], ['name', 'create_date', 'partner_id', 'amount_total', 'state']],)

    }
//  Method for emptying the data
    async clear_data() {
        this.patient_search.el.value = '';
        const histHeadElement = document.getElementById('hist_head');
        if (histHeadElement) {
            histHeadElement.innerHTML = '';
        }
        document.getElementById('patient-title').textContent = '';
        document.getElementById('patient-code').textContent = '';
        document.getElementById('patient-gender').textContent = '';
        document.getElementById('patient-blood').textContent = '';
        const patientImage = document.getElementById('patient-image');
        if (patientImage) {
            patientImage.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
        }
    }

}
PharmacyDashboard.template = "PharmacyDashboard"
registry.category("actions").add('pharmacy_dashboard_tags', PharmacyDashboard);
PharmacyDashboard.components = { PharmacyOrderLines }
