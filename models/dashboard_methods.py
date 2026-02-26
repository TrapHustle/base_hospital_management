# -*- coding: utf-8 -*-
################################################################################
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2025-TODAY Cybrosys Technologies(<https://www.cybrosys.com>).
#
#    Dashboard Backend Methods
#    Optimized methods for loading dashboard statistics and charts
#
################################################################################

from odoo import models, api
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT


class ResPartner(models.Model):
    """Add dashboard statistics method to res.partner"""
    _inherit = 'res.partner'

    @api.model
    def get_dashboard_statistics(self):
        """
        Get all dashboard statistics in one optimized call
        Returns dict with counts and trends
        """
        today = datetime.today().date()
        
        # Total patients
        total_patients = self.search_count([
            ('patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        # Patients from last month for trend
        last_month = today - timedelta(days=30)
        patients_last_month = self.search_count([
            ('patient_seq', 'not in', ['New', 'Employee', 'User']),
            ('create_date', '>=', last_month.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        if total_patients > patients_last_month:
            patients_trend = round((patients_last_month / max(total_patients - patients_last_month, 1)) * 100, 1)
        else:
            patients_trend = 0
        
        # Consultations today
        Outpatient = self.env['hospital.outpatient']
        consultations_today = Outpatient.search_count([
            ('op_date', '=', today),
            ('state', '!=', 'cancel')
        ])
        
        # Consultations this week for trend
        week_ago = today - timedelta(days=7)
        consultations_week = Outpatient.search_count([
            ('op_date', '>=', week_ago),
            ('op_date', '<', today),
            ('state', '!=', 'cancel')
        ])
        if consultations_week > 0:
            consultations_trend = round((consultations_today / max(consultations_week / 7, 1)) * 100, 1)
        else:
            consultations_trend = 0
        
        # Active inpatients
        Inpatient = self.env['hospital.inpatient']
        active_inpatients = Inpatient.search_count([
            ('state', '=', 'admit')
        ])
        
        # Inpatients trend (this month vs last month)
        month_start = today.replace(day=1)
        last_month_start = (month_start - timedelta(days=1)).replace(day=1)
        
        inpatients_this_month = Inpatient.search_count([
            ('hosp_date', '>=', month_start.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('hosp_date', '<=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        inpatients_last_month = Inpatient.search_count([
            ('hosp_date', '>=', last_month_start.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('hosp_date', '<', month_start.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        if inpatients_last_month > 0:
            inpatients_trend = round(
                ((inpatients_this_month - inpatients_last_month) / inpatients_last_month) * 100, 
                1
            )
        else:
            inpatients_trend = 0
        
        # Active allocations today
        Allocation = self.env['doctor.allocation']
        active_allocations = Allocation.search_count([
            ('date', '=', today),
            ('state', '=', 'confirm')
        ])
        
        # Total available slots
        allocations = Allocation.search([
            ('date', '=', today),
            ('state', '=', 'confirm')
        ])
        total_slots = sum(alloc.slot_remaining for alloc in allocations)
        
        return {
            'total_patients': total_patients,
            'patients_trend': patients_trend,
            'consultations_today': consultations_today,
            'consultations_trend': consultations_trend,
            'active_inpatients': active_inpatients,
            'inpatients_trend': inpatients_trend,
            'active_allocations': active_allocations,
            'total_slots': total_slots,
        }


class HospitalOutpatient(models.Model):
    """Add chart data methods to hospital.outpatient"""
    _inherit = 'hospital.outpatient'

    @api.model
    def get_dashboard_charts_data(self):
        """
        Get all chart data in one optimized call
        Returns dict with data for all 4 charts
        """
        today = datetime.today().date()
        
        # 1. Consultations by month (last 6 months)
        six_months_ago = today - timedelta(days=180)
        consultations = self.read_group(
            domain=[
                ('op_date', '>=', six_months_ago.strftime(DEFAULT_SERVER_DATE_FORMAT)),
                ('state', '!=', 'cancel')
            ],
            fields=['op_date'],
            groupby=['op_date:month'],
            orderby='op_date:month'
        )
        
        consultations_monthly = []
        for item in consultations:
            month_label = item.get('op_date:month', '')
            # Format: "February 2024" -> "Fév 2024"
            if month_label:
                try:
                    date_obj = datetime.strptime(month_label, '%B %Y')
                    month_short = date_obj.strftime('%b')
                    # Translate month names to French
                    month_translations = {
                        'Jan': 'Jan', 'Feb': 'Fév', 'Mar': 'Mar', 'Apr': 'Avr',
                        'May': 'Mai', 'Jun': 'Juin', 'Jul': 'Juil', 'Aug': 'Aoû',
                        'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Déc'
                    }
                    month_label = month_translations.get(month_short, month_short)
                except:
                    pass
            
            consultations_monthly.append({
                'month': month_label,
                'count': item.get('__count', 0)
            })
        
        # 2. Admission types (Emergency vs Routine)
        Inpatient = self.env['hospital.inpatient']
        admissions = Inpatient.read_group(
            domain=[],
            fields=['type_admission'],
            groupby=['type_admission']
        )
        
        admissions_type = {}
        for item in admissions:
            admission_type = item.get('type_admission', '')
            if admission_type:
                admissions_type[admission_type] = item.get('type_admission_count', 0)
        
        # 3. Admissions by weekday (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        recent_admissions = Inpatient.search_read(
            domain=[
                ('hosp_date', '>=', thirty_days_ago.strftime(DEFAULT_SERVER_DATE_FORMAT))
            ],
            fields=['hosp_date']
        )
        
        admissions_weekly = {}
        for admission in recent_admissions:
            if admission.get('hosp_date'):
                date_obj = datetime.strptime(str(admission['hosp_date']), DEFAULT_SERVER_DATE_FORMAT)
                weekday = date_obj.weekday()  # 0=Monday, 6=Sunday
                admissions_weekly[weekday] = admissions_weekly.get(weekday, 0) + 1
        
        # 4. Workload (from allocations)
        Allocation = self.env['doctor.allocation']
        allocations = Allocation.search_read(
            domain=[
                ('state', '=', 'confirm'),
                ('date', '>=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
            ],
            fields=['patient_count', 'patient_limit', 'work_from', 'work_to'],
            limit=6,
            order='work_from'
        )
        
        workload = []
        for alloc in allocations:
            time_from = self._format_float_time(alloc.get('work_from', 0))
            time_to = self._format_float_time(alloc.get('work_to', 0))
            workload.append({
                'time_slot': f"{time_from}-{time_to}",
                'used': alloc.get('patient_count', 0),
                'total': alloc.get('patient_limit', 0)
            })
        
        return {
            'consultations_monthly': consultations_monthly,
            'admissions_type': admissions_type,
            'admissions_weekly': admissions_weekly,
            'workload': workload,
        }

    @api.model
    def _format_float_time(self, time_float):
        """Convert float time (9.5) to string (09:30)"""
        hours = int(time_float)
        minutes = int((time_float - hours) * 60)
        return f"{hours:02d}:{minutes:02d}"
