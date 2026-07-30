# -*- coding: utf-8 -*-
"""Signaling store for the self-hosted WebRTC teleconsultation.

Peers exchange WebRTC negotiation messages (offer / answer / ICE candidates)
by writing rows here and polling for the ones addressed to them. The media
stream itself is peer-to-peer and never passes through Odoo. Rows are short
lived and cleaned by the transient-model vacuum.
"""
from datetime import timedelta

from odoo import api, fields, models

# Only messages from this recent window are relevant to a live negotiation.
_SIGNAL_WINDOW_SECONDS = 120


class TeleconsultSignal(models.TransientModel):
    _name = 'hospital.teleconsult.signal'
    _description = 'Teleconsultation WebRTC signaling message'
    _order = 'id asc'

    room = fields.Char(string='Room token', required=True, index=True)
    sender = fields.Char(string='Sender peer id', required=True)
    role = fields.Char(string='Sender role')
    target = fields.Char(string='Target peer id')
    kind = fields.Char(string='Message kind', required=True)
    payload = fields.Text(string='JSON payload')

    @api.model
    def _signal_cutoff(self):
        """Datetime below which signaling messages are considered stale."""
        return fields.Datetime.now() - timedelta(
            seconds=_SIGNAL_WINDOW_SECONDS)
