# -*- coding: utf-8 -*-
"""Valeurs par defaut du PDF d'ordonnance (format CSF).

Le template `patient_prescription_report` attend un dictionnaire complet,
fourni par `_prescription_report_data()` cote consultation ou
hospitalisation. Imprimee depuis la fiche patient (menu Imprimer), aucune
donnee n'est transmise : ce modele remplit alors l'en-tete avec le patient
et laisse le tableau vide, comme un bloc d'ordonnances vierge.
"""
from odoo import api, models


class ReportPatientPrescription(models.AbstractModel):
    """Rapport d'ordonnance medicale."""
    _name = 'report.base_hospital_management.patient_prescription_report'
    _description = 'Ordonnance médicale (format CSF)'

    @api.model
    def _get_report_values(self, docids, data=None):
        """Complete les donnees recues des valeurs par defaut du template."""
        partners = self.env['res.partner'].browse(docids)
        patient = partners[:1] if data is None else self.env['res.partner']
        company = self.env.company
        values = {
            'doc_ids': docids,
            'doc_model': 'res.partner',
            'docs': partners,
            'datas': [],
            'validity': 'Ordonnance ponctuelle',
            'validity_type': 'ponctuelle',
            'renewable_months': '',
            'renewable_times': '',
            'date': '',
            'op_reference': '',
            'diagnosis': '',
            'patient_name': patient.name or '',
            'patient_seq': patient.patient_seq or '',
            'patient_age': patient.patient_age or '',
            'patient_gender': '',
            'doctor_name': '',
            'doctor_dept': '',
            'company_name': company.name or '',
            'company_street': company.street or '',
            'company_city': company.city or '',
            'company_phone': company.phone or '',
            'company_email': company.email or '',
        }
        values.update(data or {})
        return values
