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


class MedicineCategory(models.Model):
    """Model holding the categories of medicines (therapeutic classes)."""
    _name = 'medicine.category'
    _description = 'Medicine Category'
    _order = 'name'

    name = fields.Char(string="Catégorie", required=True,
                       help="Nom de la catégorie de médicament "
                            "(ex : Antibiotiques, Antalgiques)")
    description = fields.Text(string="Description",
                             help="Description de la catégorie de médicament")
    active = fields.Boolean(string="Actif", default=True,
                            help="Décocher pour archiver la catégorie")
    medicine_ids = fields.One2many('product.template',
                                   'medicine_category_id',
                                   string='Médicaments',
                                   help='Médicaments appartenant à cette '
                                        'catégorie')
    medicine_count = fields.Integer(string="Nombre de médicaments",
                                    compute='_compute_medicine_count',
                                    help="Nombre de médicaments dans la "
                                         "catégorie")

    _sql_constraints = [
        ('name_uniq', 'unique(name)',
         'Une catégorie de médicament avec ce nom existe déjà.'),
    ]

    def _compute_medicine_count(self):
        """Compute the number of medicines linked to each category."""
        for category in self:
            category.medicine_count = len(category.medicine_ids)
