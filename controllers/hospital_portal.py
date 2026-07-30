# -*- coding: utf-8 -*-

from odoo import http, fields
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class HospitalPortalController(CustomerPortal):
    """Portail patient : tableau de bord, vaccinations, analyses,
    consultations, rendez-vous et ordonnances.

    Securite : chaque requete est filtree par le partenaire de
    l'utilisateur connecte (isolation des donnees d'un patient).
    """

    # ------------------------------------------------------------------
    #  Helpers
    # ------------------------------------------------------------------
    def _patient_pid(self):
        """Partenaire (= patient) de l'utilisateur connecte."""
        return request.env.user.partner_id.id

    def _vacc_domain(self):
        return [('patient_id', '=', self._patient_pid())]

    def _test_domain(self):
        return [('patient_id', '=', self._patient_pid())]

    def _op_domain(self):
        return [('patient_id', '=', self._patient_pid())]

    def _presc_domain(self):
        pid = self._patient_pid()
        return ['|', ('outpatient_id.patient_id', '=', pid),
                ('inpatient_id.patient_id', '=', pid)]

    def _hms_counts(self):
        """Compteurs pour la barre de navigation (sudo + domaine patient)."""
        today = fields.Date.today()
        pid = self._patient_pid()
        Vacc = request.env['hospital.vaccination'].sudo()
        Test = request.env['patient.lab.test'].sudo()
        Op = request.env['hospital.outpatient'].sudo()
        Presc = request.env['prescription.line'].sudo()
        return {
            'vaccination_count': Vacc.search_count(self._vacc_domain()),
            'lab_test_count': Test.search_count(self._test_domain()),
            'op_count': Op.search_count(
                self._op_domain() + [('op_date', '<', today)]),
            'appointment_count': Op.search_count(
                self._op_domain() + [('op_date', '>=', today)]),
            'prescription_count': Presc.search_count(self._presc_domain()),
        }

    # ------------------------------------------------------------------
    #  ACCUEIL /my  ->  redirige le patient vers son tableau de bord
    # ------------------------------------------------------------------
    @http.route(['/my', '/my/home'], type='http', auth='user', website=True)
    def home(self, **kw):
        """Les utilisateurs portail (patients) arrivent directement sur leur
        espace santé. Les utilisateurs internes gardent le portail standard."""
        if request.env.user.share:
            return request.redirect('/my/health')
        return super().home(**kw)

    # ------------------------------------------------------------------
    #  TABLEAU DE BORD  /my/health
    # ------------------------------------------------------------------
    @http.route(['/my/health'], type='http', auth='user', website=True)
    def portal_hms_dashboard(self, **kw):
        counts = self._hms_counts()
        Vacc = request.env['hospital.vaccination'].sudo()
        Test = request.env['patient.lab.test'].sudo()
        Op = request.env['hospital.outpatient'].sudo()

        recent_vacc = Vacc.search(self._vacc_domain(),
                                  order='vaccine_date desc', limit=3)
        recent_tests = Test.search(self._test_domain(),
                                   order='create_date desc', limit=3)
        recent_op = Op.search(self._op_domain(),
                              order='op_date desc', limit=3)
        values = {
            'page_name': 'hms_dashboard',
            'patient': request.env.user.partner_id,
            'recent_vacc': recent_vacc,
            'recent_tests': recent_tests,
            'recent_op': recent_op,
        }
        values.update(counts)
        return request.render(
            'base_hospital_management.portal_hms_dashboard', values)

    # ------------------------------------------------------------------
    #  VACCINATIONS  /my/vaccinations
    # ------------------------------------------------------------------
    @http.route(['/my/vaccinations', '/my/vaccinations/page/<int:page>'],
                type='http', auth='user', website=True)
    def portal_my_vaccinations(self, page=1, **kw):
        Vacc = request.env['hospital.vaccination'].sudo()
        domain = self._vacc_domain()
        total = Vacc.search_count(domain)
        pager = request.website.pager(url='/my/vaccinations', total=total,
                                      page=page, step=12)
        vaccinations = Vacc.search(domain, limit=12,
                                   offset=(page - 1) * 12,
                                   order='vaccine_date desc')
        values = {
            'page_name': 'vaccination',
            'vaccinations': vaccinations,
            'pager': pager,
        }
        values.update(self._hms_counts())
        return request.render(
            'base_hospital_management.portal_my_vaccines_improved', values)

    # ------------------------------------------------------------------
    #  ANALYSES  /my/tests
    # ------------------------------------------------------------------
    @http.route(['/my/tests', '/my/tests/page/<int:page>'],
                type='http', auth='user', website=True)
    def portal_my_tests(self, page=1, **kw):
        Test = request.env['patient.lab.test'].sudo()
        domain = self._test_domain()
        total = Test.search_count(domain)
        pager = request.website.pager(url='/my/tests', total=total,
                                      page=page, step=12)
        tests = Test.search(domain, limit=12, offset=(page - 1) * 12,
                            order='create_date desc')
        values = {
            'page_name': 'lab_test',
            'tests': tests,
            'pager': pager,
        }
        values.update(self._hms_counts())
        return request.render(
            'base_hospital_management.portal_my_tests_improved', values)

    @http.route(['/my/tests/<int:test_id>'],
                type='http', auth='user', website=True)
    def portal_my_test_result(self, test_id=None, **kw):
        Test = request.env['patient.lab.test'].sudo()
        # Verifie que l'analyse appartient bien au patient connecte
        test = Test.search(
            [('id', '=', test_id), ('patient_id', '=', self._patient_pid())],
            limit=1)
        if not test:
            return request.redirect('/my/tests')
        results = request.env['lab.test.result'].sudo().search(
            [('id', 'in', test.result_ids.ids)])
        values = {
            'page_name': 'test_results',
            'test': test,
            'results': results,
        }
        values.update(self._hms_counts())
        return request.render(
            'base_hospital_management.portal_my_tests_results_improved', values)

    # ------------------------------------------------------------------
    #  CONSULTATIONS (historique)  /my/op
    # ------------------------------------------------------------------
    @http.route(['/my/op', '/my/op/page/<int:page>'],
                type='http', auth='user', website=True)
    def portal_my_op(self, page=1, **kw):
        Op = request.env['hospital.outpatient'].sudo()
        today = fields.Date.today()
        domain = self._op_domain() + [('op_date', '<', today)]
        total = Op.search_count(domain)
        pager = request.website.pager(url='/my/op', total=total,
                                      page=page, step=10)
        outpatients = Op.search(domain, limit=10, offset=(page - 1) * 10,
                                order='op_date desc')
        values = {
            'page_name': 'op',
            'consultations': outpatients,
            'pager': pager,
        }
        values.update(self._hms_counts())
        return request.render(
            'base_hospital_management.portal_my_op_improved', values)

    # ------------------------------------------------------------------
    #  RENDEZ-VOUS (a venir)  /my/appointments
    # ------------------------------------------------------------------
    @http.route(['/my/appointments', '/my/appointments/page/<int:page>'],
                type='http', auth='user', website=True)
    def portal_my_appointments(self, page=1, **kw):
        Op = request.env['hospital.outpatient'].sudo()
        today = fields.Date.today()
        domain = self._op_domain() + [('op_date', '>=', today)]
        total = Op.search_count(domain)
        pager = request.website.pager(url='/my/appointments', total=total,
                                      page=page, step=10)
        appointments = Op.search(domain, limit=10, offset=(page - 1) * 10,
                                 order='op_date asc')
        values = {
            'page_name': 'appointment',
            'appointments': appointments,
            'pager': pager,
        }
        values.update(self._hms_counts())
        return request.render(
            'base_hospital_management.portal_my_appointments', values)

    # ------------------------------------------------------------------
    #  TELECONSULTATION  /my/appointment/<id>/visio
    # ------------------------------------------------------------------
    @http.route(['/my/appointment/<int:op_id>/visio'],
                type='http', auth='user', website=True)
    def portal_appointment_visio(self, op_id, **kw):
        """Salle de visioconference integree au portail (iframe Jitsi).

        Securite : le rendez-vous doit appartenir au patient connecte
        et etre une teleconsultation avec un lien genere.
        """
        op = request.env['hospital.outpatient'].sudo().browse(op_id)
        if (not op.exists()
                or op.patient_id.id != self._patient_pid()
                or not op.is_teleconsultation or not op.video_call_url):
            return request.redirect('/my/appointments')
        # Decompose l'URL Jitsi en domaine + nom de salle pour l'iframe
        url = op.video_call_url
        parts = url.split('//', 1)[-1].split('/', 1)
        values = {
            'page_name': 'appointment',
            'op': op,
            'jitsi_domain': parts[0],
            'jitsi_room': parts[1] if len(parts) > 1 else '',
            'patient_name': request.env.user.partner_id.name or 'Patient',
        }
        return request.render(
            'base_hospital_management.portal_appointment_visio', values)

    # ------------------------------------------------------------------
    #  ORDONNANCE PDF  /my/prescriptions/<op_id>/download
    # ------------------------------------------------------------------
    @http.route(['/my/prescriptions/<int:op_id>/download'],
                type='http', auth='user', website=True)
    def portal_prescription_download(self, op_id, **kw):
        """Télécharge l'ordonnance PDF complète d'une consultation.

        Une ordonnance = tous les médicaments + recommandations de la
        consultation, via le rapport QWeb déjà utilisé par le médecin.
        Sécurité : la consultation doit appartenir au patient connecté.
        """
        op = request.env['hospital.outpatient'].sudo().browse(op_id)
        if (not op.exists() or op.patient_id.id != self._patient_pid()
                or not op.prescription_ids):
            return request.redirect('/my/prescriptions')
        data = op._prescription_report_data()
        pdf, _dummy = request.env['ir.actions.report'].sudo()._render_qweb_pdf(
            'base_hospital_management.action_report_patient_prescription',
            op.id, data=data)
        filename = 'Ordonnance-%s-%s.pdf' % (
            op.op_reference or 'OP', op.op_date or '')
        return request.make_response(pdf, headers=[
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf)),
            ('Content-Disposition', 'attachment; filename="%s"' % filename),
        ])

    # ------------------------------------------------------------------
    #  ORDONNANCES  /my/prescriptions
    # ------------------------------------------------------------------
    @http.route(['/my/prescriptions', '/my/prescriptions/page/<int:page>'],
                type='http', auth='user', website=True)
    def portal_my_prescriptions(self, page=1, **kw):
        Op = request.env['hospital.outpatient'].sudo()
        # Regroupe les ordonnances par consultation (outpatient) du patient
        outpatients = Op.search(
            self._op_domain() + [('prescription_ids', '!=', False)],
            order='op_date desc')
        values = {
            'page_name': 'prescription',
            'outpatients': outpatients,
        }
        values.update(self._hms_counts())
        return request.render(
            'base_hospital_management.portal_my_prescriptions', values)
