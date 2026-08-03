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
from odoo import fields, models


class PrescriptionLine(models.Model):
    """Class holding prescription line details"""
    _name = 'prescription.line'
    _description = 'Prescription Lines'
    _rec_name = 'medicine_id'

    medicine_id = fields.Many2one('product.template', domain=[
        '|', ('medicine_ok', '=', True), ('vaccine_ok', '=', True)],
                                  string='Medicine', required=True,
                                  help='Medicines or vaccines')
    forme_galenique = fields.Selection(
        [('comprime', 'Comprimé'), ('gelule', 'Gélule'), ('sirop', 'Sirop'),
         ('injectable', 'Injectable'), ('pommade', 'Pommade / Crème'),
         ('goutte', 'Gouttes'), ('suppositoire', 'Suppositoire'),
         ('sachet', 'Sachet'), ('spray', 'Spray'), ('autre', 'Autre')],
        string='Forme galénique',
        help="Forme galénique du médicament (comprimé, sirop, injectable...)")
    dosage = fields.Char(string='Dosage',
                         help="Dosage du médicament (ex : 500 mg, 1 g/5 ml)")
    posologie = fields.Char(string='Posologie',
                            help="Posologie / mode de prise "
                                 "(ex : 1 comprimé matin et soir pendant 7 j)")
    quantity = fields.Integer(string='Quantity', required=True,
                              help="The number of medicines for the time "
                                   "period")
    no_intakes = fields.Float(string='Intakes',
                              help="How much medicine want to take")
    time = fields.Selection(
        [('once', 'Once in a day'), ('twice', 'Twice in a Day'),
         ('thrice', 'Thrice in a day'), ('morning', 'In Morning'),
         ('noon', 'In Noon'), ('evening', 'In Evening')], string='Time',
        help='The interval for medicine intake')
    note = fields.Selection(
        [('before', 'Before Food'), ('after', 'After Food')],
        string='Before/ After Food',
        help='Whether the medicine to be taken before or after food')
    state = fields.Selection(
        [('draft', 'En attente'),
         ('confirmed', 'Confirmée'),
         ('completed', 'Traitée'),
         ('dispensed', 'Dispensée/Livrée')],
        string='Statut',
        default='draft',
        help='État de l\'ordonnance')
    inpatient_id = fields.Many2one('hospital.inpatient',
                                   string='Inpatient',
                                   help='The inpatient corresponds to the '
                                        'prescription line')
    outpatient_id = fields.Many2one('hospital.outpatient',
                                    string='Outpatient',
                                    help='The outpatient corresponds to the '
                                         'prescription line')
    res_partner_id = fields.Many2one('res.partner',
                                     string='Patient',
                                     help='The outpatient corresponds to the '
                                          'prescription line',
                                     related='outpatient_id.patient_id')
