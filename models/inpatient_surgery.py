# -*- coding: utf-8 -*-
################################################################################
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2025-TODAY Cybrosys Technologies(<https://www.cybrosys.com>).
#    Author: Sreerag PM (odoo@cybrosys.com)
#
#    You can modify it under the terms of the GNU AFFERO
#    GENERAL PUBLIC LICENSE (AGPL v3), Version 3.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU AFFERO GENERAL PUBLIC LICENSE (AGPL v3) for more details.
#
#    You should have received a copy of the GNU AFFERO GENERAL PUBLIC LICENSE
#    (AGPL v3) along with this program.
#    If not, see <http://www.gnu.org/licenses/>.
#
################################################################################
from odoo import api, fields, models


class InpatientSurgery(models.Model):
    """Class holding Surgery details"""
    _name = 'inpatient.surgery'
    _inherit = ["mail.thread", "mail.activity.mixin"]
    _description = 'Inpatient Surgery'

    date = fields.Date(dafault=fields.date.today(), string='Date',
                       help='Date of adding surgery')
    planned_date = fields.Datetime(string='Planned Date',
                                   help='Planned date for surgery',
                                   required=True)
    name = fields.Char(string='Name', help='Name of the surgery',
                       required=True)
    doctor_id = fields.Many2one('hr.employee',
                                string="Operating Doctor",
                                domain=[('job_id.name', '=', 'Doctor')],
                                help='Doctor responsible for the surgery',
                                required=True)
    inpatient_id = fields.Many2one('hospital.inpatient',
                                   string='Inpatient', required=True,
                                   help='Inpatient to whom surgery is added')
    operation_theater_id = fields.Many2one(
        'hospital.operation.theater',
        string='Operation Theater',
        help='Operation theater where the surgery is scheduled')
    hours_to_take = fields.Float(string='Duration',
                                 help='Time duration for the surgery')
    asa_score = fields.Selection(
        [('i', 'ASA I'),
         ('ii', 'ASA II'),
         ('iii', 'ASA III'),
         ('iv', 'ASA IV'),
         ('v', 'ASA V')],
        string='ASA Score',
        help='ASA score from pre-anesthetic consultation')
    fasting_hours = fields.Integer(
        string='Fasting Hours',
        help='Number of fasting hours before surgery')
    anesthesia_risks = fields.Text(
        string='Anesthesia History',
        help='Anesthetic history and risk factors')
    preop_identity_ok = fields.Boolean(
        string='Identity Checked',
        help='Patient identity has been checked')
    preop_site_ok = fields.Boolean(
        string='Surgical Site Confirmed',
        help='Surgical site has been confirmed')
    preop_allergy_ok = fields.Boolean(
        string='Allergies Checked',
        help='Allergies have been checked')
    preop_consent_ok = fields.Boolean(
        string='Consent Signed',
        help='Surgical consent has been signed')
    preop_checklist_complete = fields.Boolean(
        string='Pre-op Checklist OK',
        help='All pre-operative checklist items are validated',
        compute='_compute_preop_checklist_complete',
        store=True)
    anesthetist_id = fields.Many2one(
        'hr.employee',
        string='Anesthetist',
        domain=[('job_id.name', '=', 'Doctor')],
        help='Anesthetist responsible for the surgery')
    anesthesia_sheet = fields.Text(
        string='Anesthesia Sheet',
        help='Per-operative anesthesia notes')
    protocol = fields.Text(
        string='Operative Protocol',
        help='Surgical operative report')
    team_line_ids = fields.One2many(
        'inpatient.surgery.team',
        'surgery_id',
        string='Medical Team',
        help='Full team involved in the surgery')
    consumable_line_ids = fields.One2many(
        'inpatient.surgery.consumable',
        'surgery_id',
        string='Consumables',
        help='Consumables and implants used during surgery')
    sspi_score = fields.Char(
        string='SSPI / Aldrete Score',
        help='Post-operative recovery score')
    postop_note = fields.Text(
        string='Post-operative Notes',
        help='Immediate and late post-operative notes')
    surgery_product_id = fields.Many2one(
        'product.product',
        string='Surgical Act',
        help='Product representing the surgical act for invoicing')
    ccam_code = fields.Char(
        string='CCAM / Procedure Code',
        help='Reference code for the surgical procedure')
    company_id = fields.Many2one('res.company', string='Company',
                                 default=lambda self: self.env.company.id)
    state = fields.Selection([('draft', 'Draft'), ('confirmed', 'Confirmed'),
                              ('done', 'Done'), ('cancel', 'Cancel'),
                              ], default='draft',
                             string='State', help='State of the slot')

    def action_confirm(self):
        """Function for confirming a surgery"""
        self.sudo().write({
            'state': 'confirmed'
        })

    def action_cancel(self):
        """Function for cancelling a surgery"""
        self.sudo().write({
            'state': 'cancel'
        })

    def action_done(self):
        """Function for change the state to surgery"""
        self.sudo().write({
            'state': 'done'
        })

    @api.model
    def get_doctor_slot(self):
        """Function for returning surgery details to doctor's dashboard"""
        data_list = []
        state = {'confirmed': 'Confirmed',
                 'cancel': 'Cancel',
                 'done': 'Done',
                 'draft': 'Draft'}
        for rec in self.sudo().search(
                [('doctor_id.user_id', '=', self.env.user.id)]):
            data_list.append({
                'id': rec.id,
                'planned_date': rec.planned_date,
                'patient_id': rec.inpatient_id.patient_id.name,
                'surgery_name': rec.name,
                'state': state[rec.state]
            })
        return data_list

    @api.depends('preop_identity_ok', 'preop_site_ok',
                 'preop_allergy_ok', 'preop_consent_ok')
    def _compute_preop_checklist_complete(self):
        for rec in self:
            rec.preop_checklist_complete = all([
                rec.preop_identity_ok,
                rec.preop_site_ok,
                rec.preop_allergy_ok,
                rec.preop_consent_ok
            ])


class HospitalOperationTheater(models.Model):
    _name = 'hospital.operation.theater'
    _description = 'Operation Theater'

    name = fields.Char(string='Name', required=True,
                       help='Name of the operation theater')
    building_id = fields.Many2one(
        'hospital.building',
        string='Building',
        help='Building where the theater is located')
    ward_id = fields.Many2one(
        'hospital.ward',
        string='Ward',
        help='Ward associated with the theater')
    capacity = fields.Integer(
        string='Capacity',
        help='Maximum number of simultaneous surgeries')
    state = fields.Selection(
        [('waiting', 'Waiting'),
         ('preparation', 'Preparation'),
         ('in_progress', 'In Progress'),
         ('cleaning', 'Cleaning'),
         ('available', 'Available')],
        string='Status',
        default='available',
        help='Current availability status of the theater')
    active = fields.Boolean(
        string='Active',
        default=True,
        help='Active operation theater')
    surgery_ids = fields.One2many(
        'inpatient.surgery',
        'operation_theater_id',
        string='Surgeries',
        help='Surgeries scheduled in this theater')


class InpatientSurgeryTeam(models.Model):
    _name = 'inpatient.surgery.team'
    _description = 'Inpatient Surgery Team'

    surgery_id = fields.Many2one(
        'inpatient.surgery',
        string='Surgery',
        required=True,
        ondelete='cascade',
        help='Related surgery')
    employee_id = fields.Many2one(
        'hr.employee',
        string='Staff Member',
        required=True,
        help='Medical staff participating in the surgery')
    role = fields.Selection(
        [('surgeon', 'Surgeon'),
         ('assistant', 'Assistant'),
         ('anesthetist', 'Anesthetist'),
         ('iade', 'IADE'),
         ('ibode', 'IBODE'),
         ('porter', 'Porter')],
        string='Role',
        required=True,
        help='Role of the staff member during surgery')


class InpatientSurgeryConsumable(models.Model):
    _name = 'inpatient.surgery.consumable'
    _description = 'Inpatient Surgery Consumable'

    surgery_id = fields.Many2one(
        'inpatient.surgery',
        string='Surgery',
        required=True,
        ondelete='cascade',
        help='Related surgery')
    product_id = fields.Many2one(
        'product.product',
        string='Product',
        required=True,
        help='Consumable or implant used')
    quantity = fields.Float(
        string='Quantity',
        default=1.0,
        help='Quantity used during surgery')
    lot_id = fields.Many2one(
        'stock.lot',
        string='Lot/Serial',
        help='Lot or serial number for implant traceability')
    is_implant = fields.Boolean(
        string='Implant',
        help='Indicates if the product is an implant (DMI)')
