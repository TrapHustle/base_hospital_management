# -*- coding: utf-8 -*-
"""Certificats medicaux (liste tarifaire CSF Medical Center).

Les 22 certificats du tarif existent deja comme produits facturables ;
ce modele leur donne un document imprimable et signe. Choisir le type
pre-remplit le corps du certificat, que le medecin ajuste ensuite.
"""
from odoo import api, fields, models

TYPES = [
    ('grossesse', 'Certificat de grossesse'),
    ('genre_mort', 'Certificat de genre de mort'),
    ('deces', 'Certificat de décès'),
    ('milieu_hospitalier', 'Certificat en milieu hospitalier'),
    ('non_contagion', 'Certificat de non contagion'),
    ('aptitude_travail', "Certificat d'aptitude / inaptitude au travail"),
    ('visite_contre_visite', 'Certificat de visite et contre visite'),
    ('rapport_medical', 'Rapport médical à la demande du patient'),
    ('arret_travail', 'Arrêt de travail (repos médical)'),
    ('coups_blessures', 'Certificat de coups et blessures'),
    ('prenuptial', 'Certificat médical prénuptial'),
    ('accident_travail', 'Certificat médical accident de travail + maladie '
                         'professionnelle'),
    ('aptitude_pro', "Certificat d'aptitude professionnel"),
    ('bonne_sante', 'Certificat médical de bonne santé'),
    ('age_physiologique', "Certificat d'âge physiologique"),
    ('visite_enfants', 'Certificat de visite périodique des enfants'),
    ('suivi_medical', 'Certificat de suivi médical'),
    ('tension', 'Certificat de prise de tension artérielle'),
    ('reprise_service', 'Certificat de reprise de service'),
    ('conduite', "Certificat d'aptitude de conduite"),
    ('dispense_eps', "Certificat de dispense d'EPS"),
    ('virginite', 'Certificat médical de virginité'),
]

# Corps type par certificat : {clé: (formule, repos en jours par défaut)}
CORPS = {
    'bonne_sante': "ne présente, ce jour, aucun signe clinique de maladie "
                   "contagieuse ni d'affection incompatible avec une vie "
                   "normale.",
    'non_contagion': "ne présente, ce jour, aucun signe clinique de maladie "
                     "contagieuse.",
    'aptitude_travail': "est apte à exercer son emploi.",
    'aptitude_pro': "est apte à exercer les fonctions auxquelles il / elle "
                    "postule.",
    'arret_travail': "nécessite un repos médical.",
    'reprise_service': "est apte à reprendre son service.",
    'dispense_eps': "doit être dispensé(e) des séances d'éducation physique "
                    "et sportive.",
    'conduite': "ne présente aucune contre-indication médicale à la conduite "
                "des véhicules automobiles.",
    'grossesse': "présente une grossesse évolutive.",
    'tension': "a bénéficié ce jour d'une prise de tension artérielle.",
    'suivi_medical': "bénéficie d'un suivi médical régulier dans notre "
                     "structure.",
    'visite_enfants': "a bénéficié ce jour d'une visite médicale périodique.",
    'prenuptial': "a bénéficié ce jour de l'examen médical prénuptial.",
}


class HospitalCertificate(models.Model):
    """Certificat médical délivré à un patient."""
    _name = 'hospital.certificate'
    _description = 'Certificat médical'
    _rec_name = 'reference'
    _order = 'certificate_date desc, id desc'

    reference = fields.Char(string='Référence', readonly=True, copy=False,
                            default='Nouveau', help='Référence du certificat')
    patient_id = fields.Many2one('res.partner', string='Patient', required=True,
                                 domain=[('patient_seq', 'not in',
                                          [False, 'New'])],
                                 help='Patient concerné')
    patient_age = fields.Integer(related='patient_id.patient_age', string='Âge',
                                 help='Âge du patient')
    certificate_type = fields.Selection(selection=TYPES, string='Type',
                                        required=True, default='bonne_sante',
                                        help='Type de certificat délivré')
    certificate_date = fields.Date(string='Date',
                                   default=fields.Date.context_today,
                                   help='Date de délivrance')
    doctor_id = fields.Many2one('hr.employee', string='Médecin',
                                help='Médecin qui délivre le certificat')
    onmci = fields.Char(string='N° ONMCI',
                        help='Numéro d\'inscription à l\'ordre des médecins')
    body = fields.Text(string='Texte du certificat',
                       help='Corps du certificat, modifiable avant impression')
    rest_days = fields.Integer(string='Repos (jours)',
                               help='Nombre de jours de repos accordés')
    rest_start = fields.Date(string='À compter du',
                             help='Premier jour du repos médical')
    observation = fields.Text(string='Observations',
                              help='Mentions complémentaires')

    @api.model_create_multi
    def create(self, vals_list):
        """Numérote le certificat à la création."""
        for vals in vals_list:
            if vals.get('reference', 'Nouveau') == 'Nouveau':
                vals['reference'] = self.env['ir.sequence'].next_by_code(
                    'hospital.certificate') or 'Nouveau'
        return super().create(vals_list)

    @api.onchange('certificate_type')
    def _onchange_certificate_type(self):
        """Pré-remplit le corps du certificat selon son type."""
        self.body = CORPS.get(self.certificate_type, '')
