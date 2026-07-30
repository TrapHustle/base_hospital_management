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
import base64
import uuid
from odoo import api, fields, models
from odoo.exceptions import ValidationError


class HospitalOutpatient(models.Model):
    """Class holding Outpatient details"""
    _name = 'hospital.outpatient'
    _description = 'Hospital Outpatient'
    _rec_name = 'op_reference'
    _inherit = 'mail.thread'
    _order = 'op_date desc'

    op_reference = fields.Char(string="OP Reference", readonly=True,
                               default='New',
                               help='Op reference number of the patient')
    patient_id = fields.Many2one('res.partner',
                                 domain=[('patient_seq', 'not in',
                                          ['New', 'Employee', 'User'])],
                                 string='Patient ID', help='Id of the patient',
                                 required=True)
    doctor_id = fields.Many2one('doctor.allocation',
                                string='Doctor',
                                help='Select the doctor',
                                required=True,
                                domain=[('slot_remaining', '>', 0),
                                        ('date', '=', fields.date.today()),
                                        ('state', '=', 'confirm')])
    op_date = fields.Date(default=fields.Date.today(), string='Date',
                          help='Date of OP')
    reason = fields.Text(string='Reason', help='Reason for visiting hospital')
    # Antécédents du patient, en lecture seule : le médecin consulte le dossier
    # depuis sa consultation sans avoir à ouvrir la fiche patient.
    patient_risk = fields.Text(
        related='patient_id.risk', readonly=True,
        string='Risques génétiques', help='Risques génétiques du patient')
    patient_family_doctor_id = fields.Many2one(
        related='patient_id.doctor_id', readonly=True,
        string='Médecin traitant', help='Médecin traitant du patient')
    patient_insurance_id = fields.Many2one(
        related='patient_id.insurance_id', readonly=True,
        string='Assurance', help='Assurance du patient')
    patient_family_ids = fields.One2many(
        related='patient_id.family_ids', readonly=True,
        string='Antécédents familiaux',
        help='Antécédents familiaux du patient')
    patient_prescription_ids = fields.One2many(
        related='patient_id.prescription_ids', readonly=True,
        string='Ordonnances passées',
        help='Historique des ordonnances du patient')
    patient_lab_test_ids = fields.One2many(
        related='patient_id.lab_test_ids', readonly=True,
        string='Examens passés',
        help='Historique des examens de laboratoire du patient')
    test_count = fields.Integer(string='Test Created',
                                help='Number of tests created for the patient',
                                compute='_compute_test_count')
    test_ids = fields.One2many('lab.test.line', 'op_id',
                               string='Tests',
                               help='Tests for the patient')
    state = fields.Selection(
        [('draft', 'Draft'), ('op', 'OP'), ('inpatient', 'In Patient'),
         ('done', 'Terminée'), ('invoice', 'Invoiced'), ('cancel', 'Canceled')],
        default='draft', string='State', help='State of the outpatient')
    prescription_ids = fields.One2many('prescription.line',
                                       'outpatient_id',
                                       string='Prescription',
                                       help='Prescription for the patient')
    invoiced = fields.Boolean(default=False, string='Invoiced',
                              help='True for invoiced')
    invoice_id = fields.Many2one('account.move', copy=False,
                                 string='Invoice',
                                 help='Invoice of the patient')
    attachment_id = fields.Many2one('ir.attachment',
                                    string='Attachment',
                                    help='Attachments related to the'
                                         ' outpatient')
    active = fields.Boolean(string='Active', help='True for active patients',
                            default=True)
    slot = fields.Float(string='Slot', help='Slot for the patient',
                        copy=False, readonly=True)
    is_sale_created = fields.Boolean(string='Sale Created',
                                     help='True if sale order created')
    is_teleconsultation = fields.Boolean(
        string='Téléconsultation',
        help='Consultation à distance par appel vidéo')
    video_call_token = fields.Char(string='Video Call Token', copy=False,
                                   readonly=True,
                                   help='Jeton secret rendant le lien de la '
                                        'salle vidéo non devinable')
    video_call_url = fields.Char(string='Lien visioconférence',
                                 compute='_compute_video_call_url',
                                 help='Lien de la salle vidéo (Jitsi Meet)')
    video_call_ended = fields.Datetime(
        string='Visio terminée le', copy=False, readonly=True,
        help="Renseigné quand le médecin raccroche ; la salle est alors "
             "fermée côté portail")
    internal_video_url = fields.Char(
        string='Lien visio interne',
        compute='_compute_internal_video_url',
        help='Lien de la salle vidéo hébergée par Odoo (WebRTC)')

    @api.depends('is_teleconsultation', 'video_call_token', 'op_reference')
    def _compute_video_call_url(self):
        """Construit le lien de la salle Jitsi Meet du rendez-vous."""
        base_url = self.env['ir.config_parameter'].sudo().get_param(
            'base_hospital_management.jitsi_base_url', 'https://meet.jit.si')
        for rec in self:
            if rec.is_teleconsultation and rec.video_call_token:
                ref = (rec.op_reference or 'OP').replace(' ', '')
                rec.video_call_url = (f"{base_url.rstrip('/')}/"
                                      f"SIH-{ref}-{rec.video_call_token}")
            else:
                rec.video_call_url = False

    @api.depends('is_teleconsultation', 'video_call_token')
    def _compute_internal_video_url(self):
        """Salle vidéo WebRTC hébergée par Odoo (pas de service externe)."""
        base_url = self.env['ir.config_parameter'].sudo().get_param(
            'web.base.url', '')
        for rec in self:
            if rec.is_teleconsultation and rec.video_call_token:
                rec.internal_video_url = (
                    f"{base_url.rstrip('/')}/teleconsultation/room/"
                    f"{rec.video_call_token}")
            else:
                rec.internal_video_url = False

    def _ensure_video_call_token(self):
        """Génère le jeton secret de la salle vidéo s'il n'existe pas."""
        for rec in self.filtered(
                lambda r: r.is_teleconsultation and not r.video_call_token):
            rec.video_call_token = uuid.uuid4().hex[:10]

    def write(self, vals):
        res = super().write(vals)
        if vals.get('is_teleconsultation'):
            self._ensure_video_call_token()
        return res

    def action_join_video_call(self):
        """Ouvre la salle de visioconférence dans un nouvel onglet."""
        self.ensure_one()
        if not self.video_call_url:
            raise ValidationError(
                "Ce rendez-vous n'est pas une téléconsultation.")
        return {
            'type': 'ir.actions.act_url',
            'url': self.video_call_url,
            'target': 'new',
        }

    def action_join_internal_video_call(self):
        """Ouvre la salle vidéo interne (WebRTC, côté médecin)."""
        self.ensure_one()
        if not self.internal_video_url:
            raise ValidationError(
                "Ce rendez-vous n'est pas une téléconsultation.")
        return {
            'type': 'ir.actions.act_url',
            'url': f"{self.internal_video_url}?role=doctor",
            'target': 'new',
        }

    @api.model
    def create(self, vals):
        """Op number generator"""
        if vals.get('op_reference', 'New') == 'New':
            last_op = self.search([
                ('doctor_id', '=', vals.get('doctor_id')),
                ('op_reference', '!=', 'New'),
            ], order='create_date desc', limit=1)
            if last_op:
                last_number = int(last_op.op_reference[2:])
                new_number = last_number + 1
                vals['op_reference'] = f'OP{str(new_number).zfill(3)}'
            else:
                vals['op_reference'] = 'OP001'
        if self.search([
            ('patient_id', '=', vals['patient_id']),
            ('doctor_id', '=', vals['doctor_id'])
        ]):
            raise ValidationError(
                'An OP already exists for this patient under the specified '
                'allocation')
        record = super().create(vals)
        record._ensure_video_call_token()
        return record

    @api.depends('test_ids')
    def _compute_test_count(self):
        """Computes the value of test count"""
        self.test_count = len(self.test_ids.ids)

    @api.onchange('op_date')
    def _onchange_op_date(self):
        """Method for updating the doamil of doctor_id"""
        self.doctor_id = False
        return {'domain': {'doctor_id': [('slot_remaining', '>', 0),
                                         ('date', '=', self.op_date),
                                         ('state', '=', 'confirm'), (
                                             'patient_type', 'in',
                                             [False, 'outpatient'])]}}

    @api.model
    def action_row_click_data(self, op_reference):
        """Returns data to be displayed on clicking op row"""
        op_record = self.env['hospital.outpatient'].sudo().search(
            [('op_reference', '=', op_reference),
             ('active', 'in', [True, False])])
        op_data = [op_reference, op_record.patient_id.patient_seq,
                   op_record.patient_id.name, str(op_record.op_date),
                   op_record.slot, op_record.reason,
                   op_record.doctor_id.doctor_id.name,
                   op_record.is_sale_created]
        medicines = []
        for rec in op_record.prescription_ids:
            medicines.append(
                [rec.medicine_id.name, rec.no_intakes, rec.time, rec.note,
                 rec.quantity, rec.medicine_id.id])
        return {
            'op_data': op_data,
            'medicines': medicines
        }

    @api.model
    def create_medicine_sale_order(self, order_id):
        """Method for creating sale order for medicines"""
        order = self.sudo().search([('op_reference', 'ilike', order_id)])
        sale_order = self.env['sale.order'].sudo().create({
            'partner_id': order.patient_id.id,
        })
        for i in order.prescription_ids:
            self.env['sale.order.line'].sudo().create({
                'product_id': i.medicine_id.id,
                'product_uom_qty': i.quantity,
                'order': sale_order.id,
            })
            self.create_invoice()

    def _prescription_report_data(self):
        """Données du PDF d'ordonnance (libellés en français).

        Utilisé par le bouton Imprimer du médecin, le dashboard et le
        téléchargement depuis le portail patient : une seule source de
        vérité pour le contenu du document.
        """
        self.ensure_one()
        time_labels = {
            'once': '1 fois par jour', 'twice': '2 fois par jour',
            'thrice': '3 fois par jour', 'morning': 'Le matin',
            'noon': 'Le midi', 'evening': 'Le soir',
        }
        note_labels = {'before': 'Avant les repas', 'after': 'Après les repas'}
        gender_labels = {'male': 'Masculin', 'female': 'Féminin',
                         'other': 'Autre'}
        patient = self.patient_id
        age = ''
        if patient.date_of_birth:
            age = (fields.Date.today() - patient.date_of_birth).days // 365
        company = self.env.company
        doctor = self.doctor_id.doctor_id
        return {
            'datas': [{
                'medicine': line.medicine_id.name,
                'intake': line.no_intakes,
                'time': time_labels.get(line.time, line.time or ''),
                'quantity': line.quantity,
                'note': note_labels.get(line.note, ''),
            } for line in self.prescription_ids],
            'date': self.op_date.strftime('%d/%m/%Y') if self.op_date else '',
            'op_reference': self.op_reference or '',
            'diagnosis': self.reason or '',
            'patient_name': patient.name or '',
            'patient_seq': patient.patient_seq or '',
            'patient_age': age,
            'patient_gender': gender_labels.get(patient.gender, ''),
            'doctor_name': doctor.name or '',
            'doctor_dept': doctor.department_id.name or '',
            'company_name': company.name or '',
            'company_street': company.street or '',
            'company_city': company.city or '',
            'company_phone': company.phone or '',
            'company_email': company.email or '',
        }

    @api.model
    def create_file(self, rec_id):
        """Method for creating prescription"""
        record = self.env['hospital.outpatient'].sudo().browse(rec_id)
        data = record._prescription_report_data()
        pdf = self.env['ir.actions.report'].sudo()._render_qweb_pdf(
            'base_hospital_management.action_report_patient_prescription',
            rec_id, data=data)
        record.attachment_id = self.env['ir.attachment'].sudo().create({
            'datas': base64.b64encode(pdf[0]),
            'name': "Prescription",
            'type': 'binary',
            'res_model': 'hospital.outpatient',
            'res_id': rec_id,
        })
        return {
            'url': f'/web/content'
                   f'/{record.attachment_id.id}?download=true&amp'
                   f';access_token=',
        }

    @api.model
    def create_new_out_patient(self, kw):
        """Create out patient from receptionist dashboard"""
        if kw['id']:
            partner = self.env['res.partner'].sudo().search(
                ['|', ('barcode', '=', kw['id']),
                 ('phone', '=', kw['op_phone'])])
            self.sudo().create({
                'patient_id': partner.id,
                'op_date': kw['date'],
                'reason': kw['reason'],
                'slot': kw['slot'],
                'doctor_id': kw['doctor'],
            })

    def action_create_lab_test(self):
        """Button action for creating a lab test"""
        return {
            'name': 'Create Lab Test',
            'res_model': 'lab.test.line',
            'view_mode': 'form',
            'views': [[False, 'form']],
            'target': 'current',
            'type': 'ir.actions.act_window',
            'context': {
                'default_patient_id': self.patient_id.id,
                'default_doctor_id': self.doctor_id.id,
                'default_patient_type': 'outpatient',
                'default_op_id': self.id
            }
        }

    def action_view_test(self):
        """Method for viewing all lab tests"""
        return {
            'name': 'Created Tests',
            'res_model': 'lab.test.line',
            'view_mode': 'list,form',
            'target': 'current',
            'type': 'ir.actions.act_window',
            'domain': [
                ('patient_type', '=', 'outpatient'),
                ('op_id', '=', self.id)
            ]
        }

    def action_convert_to_inpatient(self):
        """Converts an outpatient to inpatient"""
        self.state = 'inpatient'
        return {
            'name': 'Convert to Inpatient',
            'res_model': 'hospital.inpatient',
            'view_mode': 'form',
            'target': 'current',
            'type': 'ir.actions.act_window',
            'context': {
                'default_patient_id': self.patient_id.id,
                'default_attending_doctor_id': self.doctor_id.doctor_id.id,
            }
        }

    def action_op_cancel(self):
        """Button action for cancelling an op"""
        self.state = 'cancel'

    def action_close_consultation(self):
        """Clôture la consultation : passe l'état à « Terminée ».

        Utilisé par le médecin quand il a fini de voir le patient.
        Le portail affiche alors la consultation comme terminée.
        """
        for rec in self:
            if rec.state == 'op':
                rec.state = 'done'

    @api.model
    def _current_doctor(self):
        """hr.employee (médecin) lié à l'utilisateur connecté, sinon vide."""
        return self.env['hr.employee'].sudo().search(
            [('user_id', '=', self.env.uid), ('doctor', '=', True)], limit=1)

    @api.model
    def get_doctor_queue(self):
        """File d'attente du jour du médecin connecté, par ordre d'arrivée.

        Renvoie les consultations à l'état « op » (en attente d'être vues),
        du créneau le plus tôt au plus tard. Si l'utilisateur n'est pas un
        médecin (ex. admin), renvoie la file de tous les médecins.
        """
        today = fields.Date.today()
        doctor = self._current_doctor()
        domain = [('op_date', '=', today), ('state', '=', 'op')]
        if doctor:
            domain.append(('doctor_id.doctor_id', '=', doctor.id))
        ops = self.search(domain, order='slot asc, id asc')
        queue = []
        for i, op in enumerate(ops, start=1):
            queue.append({
                'id': op.id,
                'order': i,
                'op_reference': op.op_reference,
                'patient_name': op.patient_id.name or '',
                'patient_seq': op.patient_id.patient_seq or '',
                'reason': op.reason or '',
                'is_teleconsultation': op.is_teleconsultation,
            })
        return queue

    def action_confirm(self):
        """Button action for confirming an op"""
        if self.doctor_id.latest_slot == 0:
            self.slot = self.doctor_id.work_from
        else:
            self.slot = self.doctor_id.latest_slot + self.doctor_id.time_avg
        self.doctor_id.latest_slot = self.slot
        self.state = 'op'

    def create_invoice(self):
        """Method for creating invoice"""
        self.state = 'invoice'
        self.invoice_id = self.env['account.move'].sudo().create({
            'move_type': 'out_invoice',
            'date': fields.Date.today(),
            'invoice_date': fields.Date.today(),
            'partner_id': self.patient_id.id,
            'invoice_line_ids': [(
                0, 0, {
                    'name': 'Consultation fee',
                    'quantity': 1,
                    'price_unit': self.doctor_id.doctor_id.consultancy_charge,
                }
            )]
        })
        self.invoiced = True

    def action_view_invoice(self):
        """Method for viewing invoice"""
        return {
            'name': 'Invoice',
            'domain': [('id', '=', self.invoice_id.id)],
            'type': 'ir.actions.act_window',
            'res_model': 'account.move',
            'view_mode': 'list,form',
            'context': {'create': False},
        }

    def action_print_prescription(self):
        """Method for printing prescription"""
        return self.env.ref(
            'base_hospital_management.action_report_patient_prescription'). \
            report_action(self, data=self._prescription_report_data())
