# -*- coding: utf-8 -*-
"""
Lab Dashboard Backend Methods
Add these methods to your hospital.laboratory model
"""

from odoo import models, api
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT


class HospitalLaboratory(models.Model):
    """Extended laboratory model with dashboard methods"""
    _inherit = 'hospital.laboratory'

    @api.model
    def get_lab_statistics(self):
        """
        Get all lab dashboard statistics in one optimized call
        Returns dict with counts and trends
        """
        today = datetime.today().date()
        yesterday = today - timedelta(days=1)
        
        # Tests pending confirmation
        tests_pending = self.env['lab.test.line'].search_count([
            ('state', '=', 'draft')
        ])
        
        # Tests in progress
        tests_in_progress = self.env['patient.lab.test'].search_count([
            ('state', '=', 'test')
        ])
        
        # Tests completed
        tests_completed = self.env['patient.lab.test'].search_count([
            ('state', '=', 'completed')
        ])
        
        # Results published
        results_published = self.env['lab.test.result'].search_count([
            ('state', '=', 'published')
        ])
        
        # Tests completed today
        completed_today = self.env['patient.lab.test'].search_count([
            ('state', '=', 'completed'),
            ('date', '=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        # Tests in progress yesterday for trend
        tests_in_progress_yesterday = self.env['patient.lab.test'].search_count([
            ('state', '=', 'test'),
            ('date', '=', yesterday.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        # Tests in progress today
        tests_in_progress_today = self.env['patient.lab.test'].search_count([
            ('state', '=', 'test'),
            ('date', '=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        # Calculate processing trend
        if tests_in_progress_yesterday > 0:
            processing_trend = round(
                ((tests_in_progress_today - tests_in_progress_yesterday) / tests_in_progress_yesterday) * 100,
                1
            )
        else:
            processing_trend = 0 if tests_in_progress_today == 0 else 100
        
        return {
            'tests_pending': tests_pending,
            'tests_in_progress': tests_in_progress,
            'tests_completed': tests_completed,
            'results_published': results_published,
            'completed_today': completed_today,
            'processing_trend': processing_trend,
        }

    @api.model
    def get_lab_charts_data(self):
        """
        Get all chart data for lab dashboard
        Returns dict with data for 4 charts
        """
        today = datetime.today().date()
        
        # 1. Tests by type
        lab_tests = self.env['lab.test'].search([])
        tests_by_type = {}
        
        for test in lab_tests:
            # Count how many patient.lab.test records use this test
            count = self.env['patient.lab.test'].search_count([
                ('test_ids', 'in', test.id)
            ])
            if count > 0:
                tests_by_type[test.name] = count
        
        # 2. Daily completed tests (last 7 days)
        seven_days_ago = today - timedelta(days=7)
        daily_completed_data = self.env['patient.lab.test'].read_group(
            domain=[
                ('state', '=', 'completed'),
                ('date', '>=', seven_days_ago.strftime(DEFAULT_SERVER_DATE_FORMAT))
            ],
            fields=['date'],
            groupby=['date:day'],
            orderby='date:day'
        )
        
        daily_completed = []
        for item in daily_completed_data:
            date_label = item.get('date:day', '')
            if date_label:
                try:
                    date_obj = datetime.strptime(date_label, '%d %b %Y')
                    date_short = date_obj.strftime('%d/%m')
                except:
                    date_short = date_label
            else:
                date_short = ''
            
            daily_completed.append({
                'date': date_short,
                'count': item.get('__count', 0)
            })
        
        # 3. Results status (processing vs published)
        results_status = {
            'processing': self.env['lab.test.result'].search_count([
                ('state', '=', 'processing')
            ]),
            'published': self.env['lab.test.result'].search_count([
                ('state', '=', 'published')
            ])
        }
        
        # 4. Average processing time by test type
        # This is a simplified version - you may want to add actual time tracking
        processing_time = []
        for test in lab_tests[:5]:  # Top 5 tests
            # Get average patient_lead (result within)
            processing_time.append({
                'test_type': test.name[:20],  # Truncate long names
                'avg_hours': test.patient_lead * 24 if test.patient_lead else 2  # Convert days to hours
            })
        
        return {
            'tests_by_type': tests_by_type,
            'daily_completed': daily_completed,
            'results_status': results_status,
            'processing_time': processing_time,
        }


class LabTestLine(models.Model):
    """Extended lab.test.line with enhanced dashboard methods"""
    _inherit = 'lab.test.line'

    @api.model
    def action_get_patient_data(self, rec_id):
        """
        Enhanced method for fetching patient data with all test details
        """
        data = self.env['lab.test.line'].sudo().browse(rec_id)
        
        if not data:
            return {}
        
        # Get patient information
        patient = data.patient_id
        
        # Get test details
        test_data = []
        for test in data.test_ids:
            test_data.append({
                'id': test.id,
                'name': test.name,
                'patient_lead': test.patient_lead,
                'price': test.price,
                'test_type': test.test_type,
            })
        
        # Get medicine details if any
        medicine_data = []
        for test in data.test_ids:
            for medicine in test.medicine_ids:
                medicine_data.append({
                    'name': medicine.medicine_id.name,
                    'quantity': medicine.quantity,
                    'price': medicine.price,
                })
        
        patient_data = {
            'id': rec_id,
            'name': patient.name or '',
            'unique': patient.patient_seq or '',
            'email': patient.email or '',
            'phone': patient.phone or '',
            'dob': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else '',
            'image_1920': patient.image_1920 or False,
            'gender': patient.gender or '',
            'status': patient.marital_status or '',
            'blood_group': patient.blood_group or '',
            'doctor': data.doctor_id.name if data.doctor_id else '',
            'patient_type': data.patient_type.capitalize() if data.patient_type else '',
            'ticket': data.op_id.op_reference if data.patient_type == 'outpatient' and data.op_id 
                     else (data.ip_id.name if data.patient_type == 'inpatient' and data.ip_id else ''),
            'test_data': test_data,
            'medicine_data': medicine_data,
            'date': data.date.strftime('%Y-%m-%d') if data.date else '',
        }
        
        return patient_data

    @api.model
    def create_lab_tests(self, rec_id):
        """
        Enhanced method to create lab tests with proper state management
        """
        test_line = self.browse(rec_id)
        
        if not test_line.test_ids:
            from odoo.exceptions import UserError
            from odoo import _
            raise UserError(_('You need to add a test before confirming.'))
        
        # Update state to created
        test_line.write({'state': 'created'})
        
        # Create patient.lab.test record
        patient_test = self.env['patient.lab.test'].sudo().create({
            'patient_id': test_line.patient_id.id,
            'test_id': test_line.id,
            'patient_type': test_line.patient_type,
            'state': 'draft',
            'test_ids': [(6, 0, test_line.test_ids.ids)],
            'date': test_line.date,
        })
        
        return {
            'patient_test_id': patient_test.id,
            'message': 'Test confirmed successfully'
        }


class PatientLabTest(models.Model):
    """Extended patient.lab.test with dashboard methods"""
    _inherit = 'patient.lab.test'

    @api.model
    def action_get_patient_data(self, rec_id):
        """
        Get complete patient lab test data for dashboard
        """
        test = self.sudo().browse(rec_id)
        
        if not test:
            return {}
        
        patient = test.patient_id
        
        # Get test results
        results_data = []
        for result in test.result_ids:
            results_data.append({
                'test_name': result.test_id.name if result.test_id else '',
                'result': result.result or '',
                'normal': result.normal or '',
                'unit': result.uom_id.name if result.uom_id else '',
                'state': result.state,
                'has_attachment': bool(result.attachment),
            })
        
        # Get medicines used
        medicines_data = []
        for medicine in test.medicine_ids:
            medicines_data.append({
                'name': medicine.medicine_id.name,
                'quantity': medicine.quantity,
                'price': medicine.price,
                'subtotal': medicine.sub_total,
            })
        
        return {
            'id': rec_id,
            'name': patient.name or '',
            'patient_seq': patient.patient_seq or '',
            'test_sequence': test.test_id.name if test.test_id else '',
            'date': test.date.strftime('%Y-%m-%d') if test.date else '',
            'state': test.state,
            'total_price': test.total_price,
            'results': results_data,
            'medicines': medicines_data,
            'patient_type': test.patient_type,
        }


class LabTestResult(models.Model):
    """Extended lab.test.result with enhanced print method"""
    _inherit = 'lab.test.result'

    @api.model
    def print_test_results(self):
        """
        Enhanced method for printing test results with complete information
        """
        results = self.sudo().search([])
        context = []
        
        for rec in results:
            # Get attachment ID if exists
            attachment_id = False
            if rec.attachment:
                # Search for the attachment in ir.attachment
                attachment = self.env['ir.attachment'].sudo().search([
                    ('res_model', '=', 'lab.test.result'),
                    ('res_id', '=', rec.id),
                    ('res_field', '=', 'attachment')
                ], limit=1)
                if attachment:
                    attachment_id = attachment.id
            
            context.append({
                'id': rec.id,
                'parent_id': rec.parent_id.test_id.name if rec.parent_id and rec.parent_id.test_id else '',
                'patient_id': [rec.patient_id.id, rec.patient_id.name] if rec.patient_id else [False, ''],
                'test_id': rec.test_id.name if rec.test_id else '',
                'attachment_id': attachment_id,
                'normal': rec.normal or '',
                'result': rec.result or '',
                'unit': rec.uom_id.name if rec.uom_id else '',
                'state': rec.state,
                'price': rec.price,
            })
        
        return context
