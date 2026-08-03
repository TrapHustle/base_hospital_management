# -*- coding: utf-8 -*-
"""Marge assurance CSF.

Le prix de base des produits/actes est le tarif NON ASSURE. Le tarif assuré
est calculé par la liste de prix « Assurance », via une règle globale.

Odoo raisonne en `price_discount` (une REMISE) : une majoration de 20 % s'écrit
donc `price_discount = -20`, ce qui est contre-intuitif. Ce champ expose la
valeur dans le sens naturel pour la clinique :

    20   -> tarif assuré = tarif de base + 20 %
    -10  -> tarif assuré = tarif de base - 10 %
"""
from odoo import api, fields, models


class ProductPricelist(models.Model):
    """Inherited to expose the CSF insurance margin in a readable way"""
    _inherit = 'product.pricelist'

    csf_insurance_margin = fields.Float(
        string='Marge assurance (%)',
        compute='_compute_csf_insurance_margin',
        inverse='_inverse_csf_insurance_margin',
        store=True, readonly=False,
        help="Pourcentage appliqué au tarif de base (tarif NON assuré) pour "
             "obtenir le tarif assuré.\n"
             "Exemple : 20 = tarif assuré supérieur de 20 % au tarif de base.\n"
             "Une valeur négative correspond à une remise.")

    def _csf_global_rule(self):
        """Returns the global rule of the pricelist (may be empty)"""
        self.ensure_one()
        return self.item_ids.filtered(
            lambda item: item.applied_on == '3_global')[:1]

    @api.depends('item_ids.applied_on', 'item_ids.price_discount',
                 'item_ids.compute_price')
    def _compute_csf_insurance_margin(self):
        """Reads the margin back from the global rule discount"""
        for pricelist in self:
            rule = pricelist._csf_global_rule()
            pricelist.csf_insurance_margin = -rule.price_discount if rule else 0.0

    def _inverse_csf_insurance_margin(self):
        """Writes the margin on the global rule, creating it if needed"""
        for pricelist in self:
            rule = pricelist._csf_global_rule()
            if rule:
                rule.price_discount = -pricelist.csf_insurance_margin
            elif pricelist.csf_insurance_margin:
                self.env['product.pricelist.item'].create({
                    'pricelist_id': pricelist.id,
                    'applied_on': '3_global',
                    'compute_price': 'formula',
                    'base': 'list_price',
                    'price_discount': -pricelist.csf_insurance_margin,
                    'price_surcharge': 0.0,
                })
