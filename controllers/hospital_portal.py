# -*- coding: utf-8 -*-

from odoo import http, fields
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal


class HospitalPortalController(CustomerPortal):
    """Portal controller for hospital management"""

    # =========================================
    # VACCINATIONS PAGES
    # =========================================

    def _prepare_vaccinations_domain(self):
        """Prepare domain for vaccinations"""
        return [('patient_id.partner_id', '=', request.env.user.partner_id.id)]

    @http.route(['/my/vaccinations', '/my/vaccinations/page/<int:page>'], 
                type='http', auth='user', website=True)
    def portal_my_vaccinations(self, page=1, **kw):
        """Display patient vaccinations"""
        Vaccination = request.env['hospital.vaccination']
        
        domain = self._prepare_vaccinations_domain()
        vaccination_count = Vaccination.search_count(domain)
        
        # Pagination
        pager = request.website.pager(
            url='/my/vaccinations',
            total=vaccination_count,
            page=page,
            step=10,
            scope=5
        )
        
        vaccinations = Vaccination.search(
            domain,
            limit=10,
            offset=(page - 1) * 10,
            order='vaccine_date DESC'
        )
        
        vaccination_list = []
        for vacc in vaccinations:
            vaccination_list.append({
                'id': vacc.id,
                'name': vacc.name or f"VAC-{vacc.id}",
                'vaccine_product_id': vacc.vaccine_product_id.name if vacc.vaccine_product_id else 'N/A',
                'dose': vacc.dose or '1',
                'vaccine_date': vacc.vaccine_date.strftime('%d/%m/%Y') if vacc.vaccine_date else 'N/A',
                'vaccine_price': f"{vacc.vaccine_price:.2f}" if vacc.vaccine_price else '0',
                'attachment_id': vacc.attachment_id.id if vacc.attachment_id else False
            })
        
        values = {
            'page_name': 'vaccination',
            'vaccinations': vaccination_list,
            'pager': pager,
        }
        
        return request.render('base_hospital_management.portal_my_vaccines_improved', values)

    # =========================================
    # LAB TESTS PAGES
    # =========================================

    def _prepare_tests_domain(self):
        """Prepare domain for lab tests"""
        return [('patient_id.partner_id', '=', request.env.user.partner_id.id)]

    @http.route(['/my/tests', '/my/tests/page/<int:page>'], 
                type='http', auth='user', website=True)
    def portal_my_tests(self, page=1, **kw):
        """Display patient lab tests"""
        LabTest = request.env['hospital.lab.test']
        
        domain = self._prepare_tests_domain()
        test_count = LabTest.search_count(domain)
        
        # Pagination
        pager = request.website.pager(
            url='/my/tests',
            total=test_count,
            page=page,
            step=10,
            scope=5
        )
        
        tests = LabTest.search(
            domain,
            limit=10,
            offset=(page - 1) * 10,
            order='create_date DESC'
        )
        
        test_list = []
        for test in tests:
            test_list.append({
                'id': test.id,
                'name': test.name or f"TEST-{test.id}",
                'date': test.create_date.strftime('%d/%m/%Y') if test.create_date else 'N/A',
            })
        
        values = {
            'page_name': 'lab_test',
            'tests': test_list,
            'pager': pager,
        }
        
        return request.render('base_hospital_management.portal_my_tests_improved', values)

    @http.route('/my/tests/<int:test_id>', 
                type='http', auth='user', website=True)
    def portal_my_test_result(self, test_id=None, **kw):
        """Display lab test results"""
        LabTestResult = request.env['hospital.lab.test.result']
        
        # Get results for the test
        results = LabTestResult.search([
            ('lab_test_id', '=', test_id),
            ('patient_id.partner_id', '=', request.env.user.partner_id.id)
        ])
        
        result_list = []
        for result in results:
            result_list.append({
                'id': result.id,
                'name': result.test_name or 'Test',
                'result': result.result_value or 'N/A',
                'price': f"{result.price:.2f}" if result.price else '0',
                'attachment_id': result.attachment_id.id if result.attachment_id else False
            })
        
        values = {
            'page_name': 'test_results',
            'results': result_list,
            'test_id': test_id,
        }
        
        return request.render('base_hospital_management.portal_my_tests_results_improved', values)

    # =========================================
    # OUTPATIENT (CONSULTATIONS) PAGES
    # =========================================

    def _prepare_op_domain(self):
        """Prepare domain for outpatient consultations"""
        return [('patient_id.partner_id', '=', request.env.user.partner_id.id)]

    @http.route(['/my/op', '/my/op/page/<int:page>'], 
                type='http', auth='user', website=True)
    def portal_my_op(self, page=1, **kw):
        """Display patient consultations"""
        Outpatient = request.env['hospital.outpatient']
        
        domain = self._prepare_op_domain()
        op_count = Outpatient.search_count(domain)
        
        # Pagination
        pager = request.website.pager(
            url='/my/op',
            total=op_count,
            page=page,
            step=10,
            scope=5
        )
        
        outpatients = Outpatient.search(
            domain,
            limit=10,
            offset=(page - 1) * 10,
            order='op_date DESC'
        )
        
        op_list = []
        for op in outpatients:
            # Format time slot
            slot_str = 'N/A'
            if op.slot:
                hours = int(op.slot)
                minutes = int((op.slot - hours) * 60)
                slot_str = f"{hours:02d}:{minutes:02d}"
            
            op_list.append({
                'id': op.id,
                'op_reference': op.op_reference or f"OP-{op.id}",
                'op_date': op.op_date.strftime('%d/%m/%Y') if op.op_date else 'N/A',
                'doctor_name': op.doctor_id.doctor_id.name if op.doctor_id and op.doctor_id.doctor_id else 'Non assigné',
                'slot': slot_str,
                'prescription_ids': op.prescription_ids,
            })
        
        values = {
            'page_name': 'op',
            'op': op_list,
            'pager': pager,
        }
        
        return request.render('base_hospital_management.portal_my_op_improved', values)

    # =========================================
    # HOME PAGE DASHBOARD
    # =========================================

    def index(self, **kw):
        """Override portal home to include hospital data"""
        response = super().index(**kw)
        
        if hasattr(response, 'qcontext'):
            # Add vaccination count
            vaccination_count = request.env['hospital.vaccination'].search_count(
                [('patient_id.partner_id', '=', request.env.user.partner_id.id)]
            )
            response.qcontext['vaccination_count'] = vaccination_count
            
            # Add lab test count
            lab_test_count = request.env['hospital.lab.test'].search_count(
                [('patient_id.partner_id', '=', request.env.user.partner_id.id)]
            )
            response.qcontext['lab_test_count'] = lab_test_count
            
            # Add outpatient count
            op_count = request.env['hospital.outpatient'].search_count(
                [('patient_id.partner_id', '=', request.env.user.partner_id.id)]
            )
            response.qcontext['op_count'] = op_count
        
        return response
