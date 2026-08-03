# -*- coding: utf-8 -*-
"""Comptes rendus d'imagerie (formulaires CSF Medical Center).

Un seul modele couvre les quatre comptes rendus du carnet papier :
radiographie thoracique, echographie mammaire, echographie du pelvis
masculin et compte rendu ophtalmologique. Choisir le type pre-remplit
technique / resultats / conclusion avec le texte type ; le medecin
n'a plus qu'a corriger ce qui differe.
"""
from odoo import api, fields, models

# Textes types repris mot pour mot des comptes rendus papier.
MODELES = {
    'radio_thorax': {
        'exam': 'Radiographie pulmonaire face',
        'technique': '',
        'resultats': "- Absence de foyer pleuro-parenchymateux évolutif.\n"
                     "- Silhouette cardio-médiastinale normale, ICT =\n"
                     "- Culs de sac pleuraux libres.\n"
                     "- Intégrité pariétale.",
        'conclusion': 'IMAGE CARDIO THORACIQUE NORMALE CE JOUR',
    },
    'echo_mammaire': {
        'exam': 'Échographie mammaire',
        'technique': "L'exploration échographique bilatérale et comparative "
                     "des seins à l'aide d'une sonde linéaire de haute "
                     "fréquence met en évidence des seins conjonctivo "
                     "glandulaires.",
        'resultats': "SEIN DROIT\n"
                     "- Absence d'épaississement du plan cutané.\n"
                     "- Absence de nodule visible.\n"
                     "- Absence d'ectasie des canaux galactophoriques.\n\n"
                     "SEIN GAUCHE\n"
                     "- Absence d'épaississement du plan cutané.\n"
                     "- Absence de nodule visible.\n"
                     "- Absence d'ectasie des canaux galactophoriques.\n\n"
                     "Prolongement axillaire bilatéral libre.",
        'conclusion': 'ASPECT ECHOGRAPHIQUE NORMAL DES SEINS',
    },
    'echo_pelvis_masc': {
        'exam': 'Échographie du pelvis masculin',
        'technique': 'Voie sus-pubienne.',
        'resultats': "Vésicules séminales : aspect normal\n\n"
                     "PROSTATE\n"
                     "- Dimensions : Hauteur      Épaisseur      Largeur      "
                     "Volume :        cm³\n"
                     "- Contours : réguliers\n"
                     "- Saillie du lobe médian sous le plancher vésical : non\n"
                     "- Échostructure : homogène\n"
                     "- Vascularisation : normale\n\n"
                     "VESSIE\n"
                     "- Volume :        cm³\n"
                     "- Paroi : fine\n"
                     "- Contenu : transsonore\n"
                     "- Résidu post-mictionnel : non significatif\n\n"
                     "REINS\n"
                     "- Topographie : lombaire\n"
                     "- Échostructure : normale\n"
                     "- Bonne différenciation cortico-sinusale\n"
                     "- Grand axe :        mm à droite,        mm à gauche\n"
                     "- Cavités pyélo-calicielles et uretères proximaux : "
                     "aspect normal",
        'conclusion': '',
    },
    'ophtalmo': {
        'exam': 'Acuité visuelle + fond d\'œil',
        'technique': '',
        'resultats': '',
        'conclusion': '',
    },
}


class HospitalImaging(models.Model):
    """Compte rendu d'imagerie ou d'exploration."""
    _name = 'hospital.imaging'
    _description = "Compte rendu d'imagerie"
    _rec_name = 'reference'
    _order = 'exam_date desc, id desc'

    reference = fields.Char(string='Référence', readonly=True, copy=False,
                            default='Nouveau', help='Référence du compte rendu')
    patient_id = fields.Many2one('res.partner', string='Patient', required=True,
                                 domain=[('patient_seq', 'not in',
                                          [False, 'New'])],
                                 help='Patient examiné')
    patient_age = fields.Integer(related='patient_id.patient_age', string='Âge',
                                 help='Âge du patient')
    exam_type = fields.Selection(
        selection=[('radio_thorax', 'Radiographie thoracique'),
                   ('echo_mammaire', 'Échographie mammaire'),
                   ('echo_pelvis_masc', 'Échographie pelvis masculin'),
                   ('ophtalmo', 'Compte rendu ophtalmologique')],
        string='Type d\'examen', required=True, default='radio_thorax',
        help='Détermine la mise en page et le texte type du compte rendu')
    exam_date = fields.Date(string='Date de l\'examen',
                            default=fields.Date.context_today,
                            help='Date de réalisation de l\'examen')
    indication = fields.Char(string='Indication', default='Visite médicale',
                             help='Indication de l\'examen')
    exam_demande = fields.Char(string='Examen demandé',
                               help='Libellé de l\'examen demandé')
    prescriber_id = fields.Many2one('hr.employee', string='Médecin prescripteur',
                                    help='Médecin ayant demandé l\'examen')
    doctor_id = fields.Many2one('hr.employee', string='Médecin signataire',
                                help='Radiologue ou ophtalmologue signataire')
    doctor_role = fields.Char(string='Qualité du signataire', default='Radiologue',
                              help='Radiologue, Ophtalmologue…')
    onmci = fields.Char(string='N° ONMCI',
                        help='Numéro d\'inscription à l\'ordre des médecins')
    technique = fields.Text(string='Technique',
                            help='Technique utilisée pour l\'examen')
    resultats = fields.Text(string='Résultats', help='Résultats de l\'examen')
    conclusion = fields.Text(string='Conclusion',
                             help='Conclusion du compte rendu')

    # ---- Compte rendu ophtalmologique : tableau OD / OG ----
    av_loin_od = fields.Char(string='Acuité visuelle de loin (OD)',
                             help='Œil droit, vision de loin')
    av_loin_og = fields.Char(string='Acuité visuelle de loin (OG)',
                             help='Œil gauche, vision de loin')
    av_pres_od = fields.Char(string='Acuité visuelle de près (OD)',
                             help='Œil droit, vision de près')
    av_pres_og = fields.Char(string='Acuité visuelle de près (OG)',
                             help='Œil gauche, vision de près')
    fond_oeil_od = fields.Char(string='Fond d\'œil (OD)',
                               help='Fond d\'œil droit')
    fond_oeil_og = fields.Char(string='Fond d\'œil (OG)',
                               help='Fond d\'œil gauche')

    @api.model_create_multi
    def create(self, vals_list):
        """Numérote le compte rendu à la création."""
        for vals in vals_list:
            if vals.get('reference', 'Nouveau') == 'Nouveau':
                vals['reference'] = self.env['ir.sequence'].next_by_code(
                    'hospital.imaging') or 'Nouveau'
        return super().create(vals_list)

    @api.onchange('exam_type')
    def _onchange_exam_type(self):
        """Pré-remplit le compte rendu avec le texte type du carnet."""
        modele = MODELES.get(self.exam_type)
        if not modele:
            return
        self.exam_demande = modele['exam']
        self.technique = modele['technique']
        self.resultats = modele['resultats']
        self.conclusion = modele['conclusion']
        self.doctor_role = ('Ophtalmologue' if self.exam_type == 'ophtalmo'
                            else 'Radiologue')
