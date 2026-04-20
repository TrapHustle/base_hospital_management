# -*- coding: utf-8 -*-
################################################################################
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2025-TODAY Cybrosys Technologies(<https://www.cybrosys.com>).
#    Author: Hospital Management Team
#
#    You can modify it under the terms of the GNU AFFERO
#    GENERAL PUBLIC LICENSE (AGPL v3), Version 3.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU AFFERO GENERAL PUBLIC LICENSE (AGPL v3) for more details.
#
#    You should have received a copy of the GNU AFFERO GENERAL PUBLIC LICENSE
#    (AGPL v3) along with this program.
#    If not, see <http://www.gnu.org/licenses/>.
#
################################################################################
from odoo import http
from odoo.http import request, Controller


class HospitalFrontendDashboards(Controller):
    """Controller for frontend-decoupled hospital dashboards"""

    @http.route('/hospital/doctor', type='http', auth="user", website=True)
    def doctor_dashboard(self):
        """Doctor Dashboard - Route for doctor-specific dashboard"""
        values = {
            'user': request.env.user.name,
            'user_email': request.env.user.email,
        }
        return request.render(
            "base_hospital_management.hospital_doctor_dashboard", values)

    @http.route('/hospital/lab', type='http', auth="user", website=True)
    def lab_dashboard(self):
        """Lab Dashboard - Route for laboratory technician dashboard"""
        values = {
            'user': request.env.user.name,
            'user_email': request.env.user.email,
        }
        return request.render(
            "base_hospital_management.hospital_lab_dashboard", values)

    @http.route('/hospital/pharmacy', type='http', auth="user", website=True)
    def pharmacy_dashboard(self):
        """Pharmacy Dashboard - Route for pharmacy manager dashboard"""
        values = {
            'user': request.env.user.name,
            'user_email': request.env.user.email,
        }
        return request.render(
            "base_hospital_management.hospital_pharmacy_dashboard", values)

    @http.route('/hospital/reception', type='http', auth="user", website=True)
    def reception_dashboard(self):
        """Reception Dashboard - Route for reception staff dashboard"""
        values = {
            'user': request.env.user.name,
            'user_email': request.env.user.email,
        }
        return request.render(
            "base_hospital_management.hospital_reception_dashboard", values)

    @http.route('/hospital/portal', type='http', auth="user", website=True)
    def hospital_portal(self):
        """Hospital Patient Portal - Route for patient access"""
        values = {
            'user': request.env.user.name,
            'user_email': request.env.user.email,
        }
        return request.render(
            "base_hospital_management.hospital_portal_dashboard", values)
