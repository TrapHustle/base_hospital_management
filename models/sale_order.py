# -*- coding: utf-8 -*-
"""Extension des devis pour la facture proforma CSF Medical Center."""
import logging

from odoo import models

_logger = logging.getLogger(__name__)


class SaleOrder(models.Model):
    """Ajoute le montant en toutes lettres attendu par le proforma papier."""
    _inherit = 'sale.order'

    def csf_amount_in_words(self):
        """Montant total en toutes lettres, en francs CFA.

        `currency_id.amount_to_text` reprend le nom de la devise de la
        societe (dollars sur une base de demonstration) : le proforma CSF
        est libelle en FCFA, on formate donc le nombre nous-memes.
        """
        self.ensure_one()
        montant = int(round(self.amount_total))
        try:
            from num2words import num2words
            lettres = num2words(montant, lang='fr')
        except (ImportError, NotImplementedError):
            _logger.warning(
                "num2words indisponible : montant proforma laisse en chiffres")
            lettres = '{:,}'.format(montant).replace(',', ' ')
        return '%s francs CFA' % lettres
