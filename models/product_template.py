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

# Inventaire du 05/03/2026 (colonne « Quantité restant ») — xml_id : quantité.
# Chargé UNE SEULE FOIS (cf. _csf_load_consumable_stock) : ensuite les stocks
# vivent dans Odoo et ne doivent plus être écrasés par un upgrade.
CSF_CONSUMABLE_STOCK = {
    'prod_tube_violet': 130,
    'prod_tube_rouge': 80,
    'prod_tube_vert': 84,
    'prod_tube_gris': 121,
    'prod_tube_bleu': 94,
    'prod_aiguille_prelevement': 35,
    'prod_cassette_psa': 50,
    'prod_cassette_malaria': 15,
    'prod_cassette_hbs': 0,
}
CSF_STOCK_LOADED_PARAM = 'base_hospital_management.consumable_stock_loaded'


class ProductTemplate(models.Model):
    """Inherited to add more fields and functions"""
    _inherit = 'product.template'

    medicine_ok = fields.Boolean(string='Medicine', help='True for medicines')
    vaccine_ok = fields.Boolean(string="Vaccine", help='True for vaccines')
    pharmacy_id = fields.Many2one('hospital.pharmacy',
                                  string='Pharmacy',
                                  help='Name of the pharmacy')
    medicine_brand_id = fields.Many2one('medicine.brand',
                                        string='Brand',
                                        help='Indicates the brand of medicine '
                                             'or vaccine')
    medicine_category_id = fields.Many2one('medicine.category',
                                           string='Catégorie médicament',
                                           help='Catégorie du médicament '
                                                '(ex : Antibiotiques, '
                                                'Antalgiques)')
    cotation_code = fields.Char(string='Cotation',
                                help="Code de cotation de l'acte de biologie "
                                     "(ex : B18, B60). Utilisé pour le calcul "
                                     "du tarif assurance.")

    @api.model
    def _csf_load_consumable_stock(self):
        """Loads the 05/03/2026 paper inventory into stock, once.

        Called from data/hospital_consumable_data.xml. Creates a real
        inventory adjustment so the moves are traceable. Protected by an
        ir.config_parameter flag: a later upgrade will not reset quantities
        that have since been consumed.
        """
        params = self.env['ir.config_parameter'].sudo()
        if params.get_param(CSF_STOCK_LOADED_PARAM):
            return
        location = self.env['stock.location'].search([
            ('usage', '=', 'internal'),
            ('company_id', 'in', [False, self.env.company.id]),
        ], limit=1)
        if not location:
            return
        quant_model = self.env['stock.quant'].with_context(inventory_mode=True)
        for xml_id, quantity in CSF_CONSUMABLE_STOCK.items():
            if quantity <= 0:
                continue
            template = self.env.ref(
                'base_hospital_management.%s' % xml_id,
                raise_if_not_found=False)
            product = template.product_variant_id if template else False
            if not product:
                continue
            if self.env['stock.quant'].search_count([
                    ('product_id', '=', product.id),
                    ('location_id', '=', location.id)]):
                continue
            quant = quant_model.create({
                'product_id': product.id,
                'location_id': location.id,
                'inventory_quantity': quantity,
            })
            quant.action_apply_inventory()
        params.set_param(CSF_STOCK_LOADED_PARAM, 'True')

    @api.model
    def action_get_medicine_data(self):
        """Returns medicine list to the pharmacy dashboard"""
        medicines = []
        for rec in self.env['product.template'].sudo().search(
                [('medicine_ok', '=', True)]):
            medicines.append(
                [rec.name, rec.list_price, rec.qty_available, rec.image_1920, rec.id])
        return medicines

    @api.model
    def action_get_vaccine_data(self):
        """Returns vaccine list to the pharmacy dashboard"""
        vaccines = []
        for rec in self.env['product.template'].sudo().search(
                [('vaccine_ok', '=', True)]):
            vaccines.append(
                [rec.name, rec.list_price, rec.qty_available, rec.image_1920])
        return vaccines
