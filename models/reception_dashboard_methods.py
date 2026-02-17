# -*- coding: utf-8 -*-
"""
Reception Dashboard Backend Methods
Add these methods to manage patient registration, appointments, and room assignments
"""

from odoo import models, api, fields
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT


class ResPartner(models.Model):
    """Extended partner with reception dashboard methods"""
    _inherit = 'res.partner'

    @api.model
    def get_reception_statistics(self):
        """
        Get all reception dashboard statistics
        Returns dict with counts and trends
        """
        today = datetime.today().date()
        yesterday = today - timedelta(days=1)
        
        # Total patients
        total_patients = self.search_count([
            ('patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        # Appointments today
        appointments_today = self.env['hospital.outpatient'].search_count([
            ('op_date', '=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        # Appointments yesterday for trend
        appointments_yesterday = self.env['hospital.outpatient'].search_count([
            ('op_date', '=', yesterday.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        # Calculate appointments trend
        if appointments_yesterday > 0:
            appointments_trend = round(
                ((appointments_today - appointments_yesterday) / appointments_yesterday) * 100,
                1
            )
        else:
            appointments_trend = 0 if appointments_today == 0 else 100
        
        # Active inpatients
        active_inpatients = self.env['hospital.inpatient'].search_count([
            ('state', 'in', ['admit', 'reserve'])
        ])
        
        # Rooms available
        rooms_available = self.env['patient.room'].search_count([
            ('state', '=', 'avail')
        ])
        
        # Wards available
        wards_available = self.env['hospital.ward'].search_count([])
        
        # New patients created today
        new_patients_today = self.search_count([
            ('patient_seq', 'not in', ['New', 'Employee', 'User']),
            ('create_date', '>=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        return {
            'total_patients': total_patients,
            'appointments_today': appointments_today,
            'appointments_trend': appointments_trend,
            'active_inpatients': active_inpatients,
            'rooms_available': rooms_available,
            'wards_available': wards_available,
            'new_patients_today': new_patients_today,
        }

    @api.model
    def get_reception_charts_data(self):
        """
        Get chart data for reception dashboard
        Returns dict with data for charts
        """
        today = datetime.today().date()
        
        # 1. Daily appointments (last 7 days)
        seven_days_ago = today - timedelta(days=7)
        daily_appointments_data = self.env['hospital.outpatient'].read_group(
            domain=[
                ('op_date', '>=', seven_days_ago.strftime(DEFAULT_SERVER_DATE_FORMAT))
            ],
            fields=['op_date'],
            groupby=['op_date:day'],
            orderby='op_date:day'
        )
        
        daily_appointments = []
        for item in daily_appointments_data:
            date_label = item.get('op_date:day', '')
            if date_label:
                try:
                    date_obj = datetime.strptime(date_label, '%d %b %Y')
                    date_short = date_obj.strftime('%d/%m')
                except:
                    date_short = date_label
            else:
                date_short = ''
            
            daily_appointments.append({
                'date': date_short,
                'count': item.get('__count', 0)
            })
        
        # 2. Room status (available, reserved, unavailable)
        room_status = {
            'available': self.env['patient.room'].search_count([('state', '=', 'avail')]),
            'reserved': self.env['patient.room'].search_count([('state', '=', 'reserve')]),
            'unavailable': self.env['patient.room'].search_count([('state', '=', 'not')])
        }
        
        # 3. Inpatient status by state
        inpatient_status = {
            'admitted': self.env['hospital.inpatient'].search_count([('state', '=', 'admit')]),
            'reserved': self.env['hospital.inpatient'].search_count([('state', '=', 'reserve')]),
            'discharged': self.env['hospital.inpatient'].search_count([('state', '=', 'dis')])
        }
        
        # 4. Appointments by doctor (top 5)
        doctors_data = self.env['hospital.outpatient'].read_group(
            domain=[],
            fields=['doctor_id'],
            groupby=['doctor_id'],
            limit=5,
            orderby='__count desc'
        )
        
        appointments_by_doctor = []
        for item in doctors_data:
            doctor_name = item.get('doctor_id')
            if doctor_name and isinstance(doctor_name, tuple):
                doctor_name = doctor_name[1]
            appointments_by_doctor.append({
                'doctor': str(doctor_name)[:20],
                'count': item.get('__count', 0)
            })
        
        return {
            'daily_appointments': daily_appointments,
            'room_status': room_status,
            'inpatient_status': inpatient_status,
            'appointments_by_doctor': appointments_by_doctor,
        }


class HospitalOutpatient(models.Model):
    """Extended outpatient with reception methods"""
    _inherit = 'hospital.outpatient'

    @api.model
    def get_appointments_today(self):
        """Get all appointments scheduled for today"""
        today = datetime.today().date()
        
        appointments = self.search([
            ('op_date', '=', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        result = []
        for appt in appointments:
            result.append({
                'id': appt.id,
                'op_reference': appt.op_reference,
                'patient_name': appt.patient_id.name,
                'patient_seq': appt.patient_id.patient_seq,
                'doctor_name': appt.doctor_id.doctor_id.name if appt.doctor_id and appt.doctor_id.doctor_id else '',
                'time_slot': appt.slot,
                'reason': appt.reason,
                'state': appt.state,
            })
        
        return result


class HospitalInpatient(models.Model):
    """Extended inpatient with reception methods"""
    _inherit = 'hospital.inpatient'

    @api.model
    def get_active_inpatients(self):
        """Get all currently admitted inpatients"""
        active = self.search([
            ('state', 'in', ['admit', 'reserve'])
        ])
        
        result = []
        for patient in active:
            result.append({
                'id': patient.id,
                'name': patient.name,
                'patient_name': patient.patient_id.name,
                'patient_seq': patient.patient_id.patient_seq,
                'room_id': patient.room_id.name if patient.room_id else '',
                'ward_id': patient.ward_id.ward_no if patient.ward_id else '',
                'admit_days': patient.admit_days,
                'state': patient.state,
            })
        
        return result


class PatientRoom(models.Model):
    """Extended room with reception dashboard methods"""
    _inherit = 'patient.room'

    @api.model
    def get_room_status(self):
        """Get all rooms with their availability status"""
        rooms = self.search([])
        
        result = {
            'available': [],
            'reserved': [],
            'unavailable': []
        }
        
        for room in rooms:
            room_data = {
                'id': room.id,
                'name': room.name,
                'building': room.building_id.name if room.building_id else '',
                'floor': room.floor_no,
                'bed_type': room.bed_type,
                'rent': room.rent,
                'state': room.state,
            }
            
            if room.state == 'avail':
                result['available'].append(room_data)
            elif room.state == 'reserve':
                result['reserved'].append(room_data)
            else:
                result['unavailable'].append(room_data)
        
        return result

    @api.model
    def get_available_rooms(self):
        """Get only available rooms for assignment"""
        rooms = self.search([('state', '=', 'avail')])
        
        result = []
        for room in rooms:
            result.append({
                'id': room.id,
                'name': room.name,
                'building': room.building_id.name if room.building_id else '',
                'floor': room.floor_no,
                'bed_type': room.bed_type,
                'rent': room.rent,
            })
        
        return result


class HospitalWard(models.Model):
    """Extended ward with reception dashboard methods"""
    _inherit = 'hospital.ward'

    @api.model
    def get_ward_status(self):
        """Get all wards with available bed count"""
        wards = self.search([])
        
        result = []
        for ward in wards:
            result.append({
                'id': ward.id,
                'ward_no': ward.ward_no,
                'building': ward.building_id.name if ward.building_id else '',
                'floor': ward.floor_no,
                'total_beds': ward.bed_count,
                'nurses': [nurse.name for nurse in ward.nurse_ids],
            })
        
        return result

    @api.model
    def get_available_wards(self):
        """Get wards with available beds"""
        wards = self.search([])
        
        result = []
        for ward in wards:
            available_beds = self.env['hospital.bed'].search_count([
                ('ward_id', '=', ward.ward_no),
                ('state', '!=', 'occupied')
            ])
            
            if available_beds > 0:
                result.append({
                    'id': ward.id,
                    'ward_no': ward.ward_no,
                    'building': ward.building_id.name if ward.building_id else '',
                    'floor': ward.floor_no,
                    'available_beds': available_beds,
                    'total_beds': ward.bed_count,
                })
        
        return result


class DoctorAllocation(models.Model):
    """Extended doctor allocation with reception methods"""
    _inherit = 'doctor.allocation'

    @api.model
    def get_available_doctors(self):
        """Get doctors available for appointments"""
        today = datetime.today()
        current_time = today.time()
        current_date = today.date()
        
        allocations = self.search([
            ('date', '=', current_date.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        result = []
        for alloc in allocations:
            # Check if doctor is currently available based on work hours
            work_from = alloc.work_from
            work_to = alloc.work_to
            
            # Convert float time to hours
            current_hours = current_time.hour + (current_time.minute / 60)
            
            if work_from <= current_hours <= work_to:
                available_slots = alloc.slot_remaining
            else:
                available_slots = 0
            
            if available_slots > 0:
                result.append({
                    'id': alloc.id,
                    'doctor_name': alloc.doctor_id.name,
                    'work_from': self._format_float_time(work_from),
                    'work_to': self._format_float_time(work_to),
                    'available_slots': available_slots,
                    'total_slots': alloc.patient_limit,
                })
        
        return result

    @staticmethod
    def _format_float_time(float_time):
        """Convert float time (9.5) to HH:MM format"""
        hours = int(float_time)
        minutes = int((float_time - hours) * 60)
        return f"{hours:02d}:{minutes:02d}"
