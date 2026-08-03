# -*- coding: utf-8 -*-
"""Bulletin de transfert du patient (formulaire CSF Medical Center).

Reprend le carnet papier : constantes a l'admission ET a la sortie,
motif du transfert, anamnese, diagnostic retenu, traitement administre
et structure sanitaire qui accueille le patient.
"""
from odoo import api, fields, models


class HospitalTransfer(models.Model):
    """Transfert d'un patient vers une autre structure sanitaire."""
    _name = 'hospital.transfer'
    _description = 'Bulletin de transfert du patient'
    _rec_name = 'reference'
    _order = 'transfer_date desc, id desc'

    reference = fields.Char(string='Référence', readonly=True, copy=False,
                            default='Nouveau',
                            help='Référence du bulletin de transfert')
    patient_id = fields.Many2one('res.partner', string='Patient', required=True,
                                 domain=[('patient_seq', 'not in',
                                          [False, 'New'])],
                                 help='Patient transféré')
    patient_age = fields.Integer(related='patient_id.patient_age',
                                 string='Âge', help='Âge du patient')
    op_id = fields.Many2one('hospital.outpatient', string='Consultation',
                            help='Consultation à l\'origine du transfert')
    doctor_id = fields.Many2one('hr.employee', string='Médecin',
                                help='Médecin qui signe le bulletin')
    transfer_date = fields.Date(string='Date du bulletin',
                                default=fields.Date.context_today,
                                help='Date d\'établissement du bulletin')

    # ---- Admission ----
    venu_pour = fields.Char(string='Venu pour',
                            help='Motif de la venue au centre')
    admission_datetime = fields.Datetime(string='Admis au centre le',
                                         help='Date et heure d\'admission')
    motif_transfert = fields.Char(
        string='Motif du transfert', default='Absence de lit d\'hospitalisation',
        help='Raison pour laquelle le patient est transféré')
    anamnese = fields.Text(string='Résumé anamnèse',
                           help='Résumé de l\'anamnèse')
    examen_admission = fields.Text(string='Résumé examen clinique à l\'admission',
                                   help='Examen clinique à l\'admission')
    etat_general_in = fields.Char(string='État général (admission)',
                                  help='État général constaté à l\'admission')
    temperature_in = fields.Float(string='T° (admission)', digits=(3, 1),
                                  help='Température à l\'admission')
    ta_in = fields.Char(string='TA (admission)',
                        help='Tension artérielle à l\'admission, en mmHg')
    fc_in = fields.Integer(string='FC (admission)',
                           help='Fréquence cardiaque à l\'admission, en batts/mn')
    fr_in = fields.Integer(string='FR (admission)',
                           help='Fréquence respiratoire à l\'admission, cycles/mn')
    spo2_in = fields.Integer(string='SpO2 (admission)',
                             help='Saturation en oxygène à l\'admission, en %')

    # ---- Prise en charge ----
    diagnostic = fields.Text(string='Diagnostic retenu',
                             help='Diagnostic retenu au centre')
    examen_realise = fields.Text(string='Examen réalisé',
                                 help='Examens réalisés au centre')
    traitement = fields.Text(string='Traitement administré',
                             help='Traitement administré avant le transfert')

    # ---- Sortie ----
    exit_datetime = fields.Datetime(string='Sortie du centre le',
                                    help='Date et heure de sortie')
    etat_general_out = fields.Char(string='État général (sortie)',
                                   help='État général à la sortie')
    temperature_out = fields.Float(string='T° (sortie)', digits=(3, 1),
                                   help='Température à la sortie')
    ta_out = fields.Char(string='TA (sortie)',
                         help='Tension artérielle à la sortie, en mmHg')
    fc_out = fields.Integer(string='FC (sortie)',
                            help='Fréquence cardiaque à la sortie, en batts/mn')
    fr_out = fields.Integer(string='FR (sortie)',
                            help='Fréquence respiratoire à la sortie, cycles/mn')
    spo2_out = fields.Integer(string='SpO2 (sortie)',
                              help='Saturation en oxygène à la sortie, en %')
    structure_accueil = fields.Char(string='Structure sanitaire accueillant le patient',
                                    help='Établissement qui reçoit le patient')

    @api.model_create_multi
    def create(self, vals_list):
        """Numérote le bulletin à la création."""
        for vals in vals_list:
            if vals.get('reference', 'Nouveau') == 'Nouveau':
                vals['reference'] = self.env['ir.sequence'].next_by_code(
                    'hospital.transfer') or 'Nouveau'
        return super().create(vals_list)

    @api.onchange('op_id')
    def _onchange_op_id(self):
        """Reprend le patient et le médecin de la consultation choisie."""
        if self.op_id:
            self.patient_id = self.op_id.patient_id
            # sudo : la règle d'accès de doctor.allocation restreint un médecin
            # à ses propres allocations (cf. hospital.outpatient.doctor_name)
            self.doctor_id = self.op_id.doctor_id.sudo().doctor_id
            self.anamnese = self.op_id.reason or ''
