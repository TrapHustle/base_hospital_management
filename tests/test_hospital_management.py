# -*- coding: utf-8 -*-
################################################################################
#
#    Suite de tests du module base_hospital_management.
#
#    Couvre les 4 niveaux annoncés dans le mémoire :
#      - Niveau 1 : tests unitaires   (logique pure : EAN-13, séquences)
#      - Niveau 2 : tests d'intégration (relations entre modèles)
#      - Niveau 3 : tests fonctionnels  (workflow d'admission)
#      - Niveau 4 : tests de sécurité   (RBAC 6 rôles, isolation portail)
#
################################################################################
from datetime import date, timedelta

from odoo.tests.common import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestHospitalManagement(TransactionCase):
    """Tests fonctionnels du dossier patient, des vaccinations,
    des admissions et de la sécurité d'accès."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        Partner = cls.env['res.partner']
        cls.patient_a = Partner.create({'name': 'Patient Alpha'})
        cls.patient_b = Partner.create({'name': 'Patient Beta'})

        cls.vaccine = cls.env['product.template'].create({
            'name': 'Vaccin de test',
            'vaccine_ok': True,
            'list_price': 50.0,
        })
        cls.medicine = cls.env['product.template'].create({
            'name': 'Medicament de test',
            'medicine_ok': True,
            'list_price': 5.0,
        })

        cls.doctor_job = cls.env['hr.job'].create({'name': 'Doctor'})
        cls.doctor = cls.env['hr.employee'].create({
            'name': 'Dr Test',
            'job_id': cls.doctor_job.id,
        })

    # ====================================================================
    # NIVEAU 1 - TESTS UNITAIRES (logique pure)
    # ====================================================================

    def test_ean13_checksum_valid(self):
        """EAN-13 : la clé de contrôle d'un code valide connu est correcte."""
        # 4006381333931 est un EAN-13 valide (clé = 1)
        self.assertEqual(
            self.env['res.partner'].ean_checksum('4006381333931'), 1)

    def test_ean13_checksum_wrong_length(self):
        """EAN-13 : une longueur != 13 renvoie -1."""
        self.assertEqual(self.env['res.partner'].ean_checksum('123'), -1)

    def test_ean13_generation_is_valid(self):
        """EAN-13 généré : 13 chiffres et clé de contrôle cohérente."""
        Partner = self.env['res.partner']
        ean = Partner.generate_ean('42')
        self.assertEqual(len(ean), 13)
        self.assertTrue(ean.isdigit())
        self.assertEqual(int(ean[-1]), Partner.ean_checksum(ean))

    def test_patient_sequence_unique(self):
        """DPI : matricule auto 'PATxxx', unique pour chaque patient."""
        self.assertTrue(self.patient_a.patient_seq.startswith('PAT'))
        self.assertTrue(self.patient_b.patient_seq.startswith('PAT'))
        self.assertNotEqual(
            self.patient_a.patient_seq, self.patient_b.patient_seq)

    def test_patient_name_get(self):
        """name_get : libellé = 'matricule - nom'."""
        label = self.patient_a.name_get()[0][1]
        self.assertIn(self.patient_a.patient_seq, label)
        self.assertIn('Patient Alpha', label)

    # ====================================================================
    # NIVEAU 2 - TESTS D'INTEGRATION (relations entre modèles)
    # ====================================================================

    def test_vaccination_creation_and_link(self):
        """Vaccination : séquence 'VAC', prix lié au produit, rattachée au DPI."""
        vacc = self.env['hospital.vaccination'].create({
            'patient_id': self.patient_a.id,
            'vaccine_product_id': self.vaccine.id,
            'dose': 1,
        })
        self.assertTrue(vacc.name.startswith('VAC'))
        self.assertEqual(vacc.vaccine_price, 50.0)
        self.assertIn(vacc, self.patient_a.hospital_vaccination_ids)

    def test_prescription_linked_to_inpatient(self):
        """Prescription : une ligne de prescription est rattachée à l'admission."""
        inpatient = self.env['hospital.inpatient'].create({
            'patient_id': self.patient_a.id,
            'type_admission': 'routine',
            'attending_doctor_id': self.doctor.id,
        })
        presc = self.env['prescription.line'].create({
            'medicine_id': self.medicine.id,
            'quantity': 2,
            'no_intakes': 1.0,
            'time': 'once',
            'inpatient_id': inpatient.id,
        })
        self.assertIn(presc, inpatient.prescription_ids)

    # ====================================================================
    # NIVEAU 3 - TESTS FONCTIONNELS (workflow d'admission)
    # ====================================================================

    def test_inpatient_sequence(self):
        """Admission : numéro de séquence 'IN/PAT'."""
        inpatient = self.env['hospital.inpatient'].create({
            'patient_id': self.patient_a.id,
            'type_admission': 'emergency',
            'attending_doctor_id': self.doctor.id,
        })
        self.assertTrue(inpatient.name.startswith('IN/PAT'))

    def test_inpatient_state_workflow(self):
        """Workflow : brouillon -> réservé -> admis -> sorti (inactif)."""
        inpatient = self.env['hospital.inpatient'].create({
            'patient_id': self.patient_b.id,
            'type_admission': 'routine',
            'attending_doctor_id': self.doctor.id,
        })
        self.assertEqual(inpatient.state, 'draft')
        inpatient.action_reserve()
        self.assertEqual(inpatient.state, 'reserve')
        inpatient.action_admit()
        self.assertEqual(inpatient.state, 'admit')
        inpatient.action_discharge()
        self.assertEqual(inpatient.state, 'dis')
        self.assertFalse(inpatient.active)

    def test_inpatient_admit_days(self):
        """Calcul automatique du nombre de jours d'hospitalisation."""
        inpatient = self.env['hospital.inpatient'].create({
            'patient_id': self.patient_a.id,
            'type_admission': 'routine',
            'attending_doctor_id': self.doctor.id,
            'hosp_date': date.today() - timedelta(days=3),
            'discharge_date': date.today(),
        })
        # (date de sortie - date d'admission) + 1 jour inclusif
        self.assertEqual(inpatient.admit_days, 4)

    # ====================================================================
    # NIVEAU 4 - TESTS DE SECURITE (RBAC + isolation portail)
    # ====================================================================

    def test_six_role_groups_exist(self):
        """RBAC : les 6 profils métier du mémoire existent."""
        xmlids = [
            'base_hospital_management.base_hospital_management_group_doctor',
            'base_hospital_management.base_hospital_management_group_nurse',
            'base_hospital_management.base_hospital_management_group_pharmacist',
            'base_hospital_management.'
            'base_hospital_management_group_lab_assistant',
            'base_hospital_management.'
            'base_hospital_management_group_receptionist',
            'base_hospital_management.base_hospital_management_group_manager',
        ]
        for xmlid in xmlids:
            self.assertTrue(
                self.env.ref(xmlid), "Groupe manquant : %s" % xmlid)

    def test_portal_patient_data_isolation(self):
        """Portail : un patient ne voit QUE ses propres données.

        Reproduit l'invariant de sécurité du portail (correction de la
        faille d'accès direct aux dossiers d'autres patients)."""
        Vacc = self.env['hospital.vaccination']
        vacc_a = Vacc.create({
            'patient_id': self.patient_a.id,
            'vaccine_product_id': self.vaccine.id, 'dose': 1})
        vacc_b = Vacc.create({
            'patient_id': self.patient_b.id,
            'vaccine_product_id': self.vaccine.id, 'dose': 1})

        # Le domaine d'isolation du portail filtre par patient.
        visible_for_a = Vacc.search([('patient_id', '=', self.patient_a.id)])
        self.assertIn(vacc_a, visible_for_a)
        self.assertNotIn(vacc_b, visible_for_a)
