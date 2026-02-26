# -*- coding: utf-8 -*-
"""
Pharmacy Dashboard Backend Methods
Add these methods to your hospital.pharmacy model
"""

from odoo import models, api
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT, DEFAULT_SERVER_DATETIME_FORMAT


class HospitalPharmacy(models.Model):
    """Extended pharmacy model with dashboard methods"""
    _inherit = 'hospital.pharmacy'

    @api.model
    def get_pharmacy_statistics(self):
        """
        Get all pharmacy dashboard statistics in one optimized call
        Returns dict with counts and trends
        """
        today = datetime.today().date()
        yesterday = today - timedelta(days=1)
        week_ago = today - timedelta(days=7)
        
        # Total medicines in pharmacy
        total_medicines = self.env['pharmacy.medicine'].search_count([])
        
        # Low stock medicines (qty < 10)
        low_stock_count = self.env['pharmacy.medicine'].search_count([
            ('qty_available', '<', 10)
        ])
        
        # Orders today
        orders_today = self.env['sale.order'].search_count([
            ('date_order', '>=', today.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('date_order', '<=', today.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        # Orders yesterday for trend
        orders_yesterday = self.env['sale.order'].search_count([
            ('date_order', '>=', yesterday.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('date_order', '<', today.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        # Calculate orders trend
        if orders_yesterday > 0:
            orders_trend = round(
                ((orders_today - orders_yesterday) / orders_yesterday) * 100,
                1
            )
        else:
            orders_trend = 0 if orders_today == 0 else 100
        
        # Revenue today
        orders_today_records = self.env['sale.order'].search([
            ('date_order', '>=', today.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('date_order', '<=', today.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('state', 'in', ['sale', 'done']),
            ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        revenue_today = sum(orders_today_records.mapped('amount_total'))
        
        # Revenue this week for trend
        orders_week = self.env['sale.order'].search([
            ('date_order', '>=', week_ago.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('date_order', '<', today.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('state', 'in', ['sale', 'done']),
            ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        revenue_week = sum(orders_week.mapped('amount_total'))
        avg_daily_revenue_week = revenue_week / 7 if revenue_week > 0 else 0
        
        # Calculate revenue trend
        if avg_daily_revenue_week > 0:
            revenue_trend = round(
                ((revenue_today - avg_daily_revenue_week) / avg_daily_revenue_week) * 100,
                1
            )
        else:
            revenue_trend = 0 if revenue_today == 0 else 100
        
        # Total vaccines
        total_vaccines = self.env['product.template'].search_count([
            ('vaccine_ok', '=', True)
        ])
        
        # Vaccines in stock
        vaccines_in_stock = self.env['pharmacy.medicine'].search_count([
            ('product_id.vaccine_ok', '=', True),
            ('qty_available', '>', 0)
        ])
        
        # Pending orders (draft state)
        pending_orders = self.env['sale.order'].search_count([
            ('state', '=', 'draft'),
            ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        return {
            'total_medicines': total_medicines,
            'low_stock_count': low_stock_count,
            'orders_today': orders_today,
            'orders_trend': orders_trend,
            'revenue_today': round(revenue_today, 2),
            'revenue_trend': revenue_trend,
            'total_vaccines': total_vaccines,
            'vaccines_in_stock': vaccines_in_stock,
            'pending_orders': pending_orders,
        }

    @api.model
    def get_pharmacy_charts_data(self):
        """
        Get all chart data for pharmacy dashboard
        Returns dict with data for 4 charts
        """
        today = datetime.today().date()
        
        # 1. Daily sales (last 7 days)
        seven_days_ago = today - timedelta(days=7)
        daily_sales_data = self.env['sale.order'].read_group(
            domain=[
                ('date_order', '>=', seven_days_ago.strftime(DEFAULT_SERVER_DATE_FORMAT)),
                ('state', 'in', ['sale', 'done']),
                ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
            ],
            fields=['amount_total', 'date_order'],
            groupby=['date_order:day'],
            orderby='date_order:day'
        )
        
        daily_sales = []
        for item in daily_sales_data:
            date_label = item.get('date_order:day', '')
            if date_label:
                try:
                    # Format date nicely
                    date_obj = datetime.strptime(date_label, '%d %b %Y')
                    date_short = date_obj.strftime('%d/%m')
                except:
                    date_short = date_label
            else:
                date_short = ''
            
            daily_sales.append({
                'date': date_short,
                'amount': round(item.get('amount_total', 0), 2)
            })
        
        # 2. Top products (most sold in last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        
        # Get sale order lines from last 30 days
        order_lines = self.env['sale.order.line'].search([
            ('order_id.date_order', '>=', thirty_days_ago.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('order_id.state', 'in', ['sale', 'done']),
            ('order_id.partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        
        # Aggregate by product
        product_sales = {}
        for line in order_lines:
            product_name = line.product_id.name
            if product_name not in product_sales:
                product_sales[product_name] = 0
            product_sales[product_name] += line.product_uom_qty
        
        # Get top 5
        sorted_products = sorted(product_sales.items(), key=lambda x: x[1], reverse=True)[:5]
        top_products = [{'name': name, 'qty': qty} for name, qty in sorted_products]
        
        # 3. Monthly revenue (last 6 months)
        six_months_ago = today - timedelta(days=180)
        monthly_revenue_data = self.env['sale.order'].read_group(
            domain=[
                ('date_order', '>=', six_months_ago.strftime(DEFAULT_SERVER_DATE_FORMAT)),
                ('state', 'in', ['sale', 'done']),
                ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
            ],
            fields=['amount_total', 'date_order'],
            groupby=['date_order:month'],
            orderby='date_order:month'
        )
        
        monthly_revenue = []
        for item in monthly_revenue_data:
            month_label = item.get('date_order:month', '')
            if month_label:
                try:
                    date_obj = datetime.strptime(month_label, '%B %Y')
                    month_short = date_obj.strftime('%b')
                    # French translations
                    month_translations = {
                        'Jan': 'Jan', 'Feb': 'Fév', 'Mar': 'Mar', 'Apr': 'Avr',
                        'May': 'Mai', 'Jun': 'Juin', 'Jul': 'Juil', 'Aug': 'Aoû',
                        'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Déc'
                    }
                    month_label = month_translations.get(month_short, month_short)
                except:
                    pass
            
            monthly_revenue.append({
                'month': month_label,
                'amount': round(item.get('amount_total', 0), 2)
            })
        
        # 4. Low stock medicines (qty < 20)
        low_stock_medicines = self.env['pharmacy.medicine'].search([
            ('qty_available', '<', 20)
        ], limit=10, order='qty_available asc')
        
        low_stock = []
        for medicine in low_stock_medicines:
            low_stock.append({
                'name': medicine.product_id.name[:30],  # Truncate long names
                'qty': medicine.qty_available
            })
        
        return {
            'daily_sales': daily_sales,
            'top_products': top_products,
            'monthly_revenue': monthly_revenue,
            'low_stock': low_stock,
        }

    @api.model
    def get_stock_alerts(self):
        """
        Get critical stock alerts
        Returns: Dict with rupture, low stock, and expiring medicines
        """
        today = datetime.today().date()
        expiry_threshold = today + timedelta(days=30)
        
        # Medicines out of stock (qty = 0)
        out_of_stock = self.env['pharmacy.medicine'].search([
            ('qty_available', '=', 0)
        ])
        
        # Low stock (qty < min_qty)
        low_stock = self.env['pharmacy.medicine'].search([
            ('qty_available', '>', 0),
            ('qty_available', '<', 10)  # Default or min_qty field
        ])
        
        # Expiring soon (within 30 days)
        expiring_soon = self.env['pharmacy.medicine'].search([
            ('expiry_date', '!=', False),
            ('expiry_date', '<=', expiry_threshold.strftime(DEFAULT_SERVER_DATE_FORMAT)),
            ('expiry_date', '>', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        # Already expired
        expired = self.env['pharmacy.medicine'].search([
            ('expiry_date', '!=', False),
            ('expiry_date', '<', today.strftime(DEFAULT_SERVER_DATE_FORMAT))
        ])
        
        out_of_stock_data = [{'name': m.product_id.name, 'qty': 0} for m in out_of_stock[:10]]
        low_stock_data = [{'name': m.product_id.name, 'qty': m.qty_available, 'min': m.min_qty or 10} for m in low_stock[:10]]
        expiring_data = [{
            'name': m.product_id.name,
            'date': m.expiry_date.strftime('%Y-%m-%d') if m.expiry_date else '',
            'batch': m.batch_number or '-'
        } for m in expiring_soon[:10]]
        expired_data = [{
            'name': m.product_id.name,
            'date': m.expiry_date.strftime('%Y-%m-%d') if m.expiry_date else '',
            'batch': m.batch_number or '-'
        } for m in expired[:10]]
        
        return {
            'out_of_stock': out_of_stock_data,
            'out_of_stock_count': len(out_of_stock),
            'low_stock': low_stock_data,
            'low_stock_count': len(low_stock),
            'expiring_soon': expiring_data,
            'expiring_count': len(expiring_soon),
            'expired': expired_data,
            'expired_count': len(expired),
        }

    @api.model
    def get_prescriptions_data(self):
        """
        Get prescription data by state
        Returns: Dict with pending, completed, dispensed prescriptions
        """
        # Pending prescriptions (draft state)
        pending = self.env['prescription.line'].search([
            ('state', '=', 'draft')
        ])
        
        # Completed prescriptions
        completed = self.env['prescription.line'].search([
            ('state', '=', 'completed')
        ])
        
        # Dispensed prescriptions
        dispensed = self.env['prescription.line'].search([
            ('state', '=', 'dispensed')
        ])
        
        pending_data = []
        for p in pending[:20]:
            patient_name = 'Unknown'
            if p.res_partner_id:
                patient_name = p.res_partner_id.name
            elif p.outpatient_id:
                patient_name = p.outpatient_id.patient_id.name if p.outpatient_id.patient_id else 'Unknown'
            elif p.inpatient_id:
                patient_name = p.inpatient_id.patient_name if hasattr(p.inpatient_id, 'patient_name') else 'Unknown'
            
            pending_data.append({
                'medicine': p.medicine_id.name,
                'patient': patient_name,
                'quantity': p.quantity,
                'date': p.create_date.strftime('%Y-%m-%d') if p.create_date else '',
            })
        
        completed_data = [{
            'medicine': p.medicine_id.name,
            'patient': p.res_partner_id.name if p.res_partner_id else 'Unknown',
            'date': p.create_date.strftime('%Y-%m-%d') if p.create_date else '',
        } for p in completed[:10]]
        
        dispensed_data = [{
            'medicine': p.medicine_id.name,
            'patient': p.res_partner_id.name if p.res_partner_id else 'Unknown',
            'date': p.create_date.strftime('%Y-%m-%d') if p.create_date else '',
        } for p in dispensed[:10]]
        
        return {
            'pending': pending_data,
            'pending_count': len(pending),
            'completed': completed_data,
            'completed_count': len(completed),
            'dispensed': dispensed_data,
            'dispensed_count': len(dispensed),
        }

    @api.model
    def get_financial_data(self):
        """
        Get financial summary data
        Returns: Dict with revenue, costs, profit, pending payments
        """
        today = datetime.today().date()
        
        # Revenue: sum of confirmed/done sale orders
        revenue_orders = self.env['sale.order'].search([
            ('state', 'in', ['sale', 'done']),
            ('partner_id.patient_seq', 'not in', ['New', 'Employee', 'User'])
        ])
        total_revenue = sum(revenue_orders.mapped('amount_total'))
        
        # Costs: sum of confirmed purchase orders (if purchase module installed)
        try:
            cost_orders = self.env['purchase.order'].search([
                ('state', 'in', ['purchase', 'done'])
            ])
            total_cost = sum(cost_orders.mapped('amount_total'))
        except:
            total_cost = 0
        
        # Profit
        profit = total_revenue - total_cost
        
        # Pending payments (draft payment records)
        try:
            pending_payments = self.env['account.payment'].search([
                ('state', '=', 'draft')
            ])
            pending_count = len(pending_payments)
            pending_amount = sum(pending_payments.mapped('amount'))
        except:
            pending_count = 0
            pending_amount = 0
        
        # Unpaid invoices (in_invoice not paid)
        try:
            unpaid_invoices = self.env['account.move'].search([
                ('type', '=', 'in_invoice'),
                ('payment_state', 'in', ['not_paid', 'partial'])
            ])
            unpaid_count = len(unpaid_invoices)
            unpaid_amount = sum(unpaid_invoices.mapped('amount_residual'))
        except:
            unpaid_count = 0
            unpaid_amount = 0
        
        return {
            'total_revenue': round(total_revenue, 2),
            'total_cost': round(total_cost, 2),
            'profit': round(profit, 2),
            'revenue_count': len(revenue_orders),
            'pending_payments_count': pending_count,
            'pending_payments_amount': round(pending_amount, 2),
            'unpaid_invoices_count': unpaid_count,
            'unpaid_invoices_amount': round(unpaid_amount, 2),
        }


class ProductTemplate(models.Model):
    """Extended product template with medicine/vaccine data methods"""
    _inherit = 'product.template'

    @api.model
    def action_get_medicine_data(self):
        """
        Get all medicines with their details for dashboard display
        Returns: List of [name, price, stock, image, id]
        """
        medicines = self.search([('medicine_ok', '=', True)])
        
        result = []
        for med in medicines:
            result.append([
                med.name,
                med.list_price,
                med.qty_available,
                med.image_128,  # Base64 encoded image
                med.id
            ])
        
        return result

    @api.model
    def action_get_vaccine_data(self):
        """
        Get all vaccines with their details for dashboard display
        Returns: List of [name, price, stock, image, id]
        """
        vaccines = self.search([('vaccine_ok', '=', True)])
        
        result = []
        for vaccine in vaccines:
            result.append([
                vaccine.name,
                vaccine.list_price,
                vaccine.qty_available,
                vaccine.image_128,  # Base64 encoded image
                vaccine.id
            ])
        
        return result


class ResPartner(models.Model):
    """Extended partner with patient data retrieval"""
    _inherit = 'res.partner'

    @api.model
    def action_get_patient_data(self, patient_code):
        """
        Get patient data by patient code
        Args:
            patient_code: List containing patient unique code
        Returns: Dict with patient information
        """
        if not patient_code or not patient_code[0]:
            return {
                'name': 'Patient Not Found',
                'unique': '',
                'dob': '',
                'blood_group': '',
                'gender': '',
                'image_1920': False
            }
        
        code = patient_code[0]
        
        # Search by patient_seq
        patient = self.search([
            ('patient_seq', '=', code)
        ], limit=1)
        
        if not patient:
            return {
                'name': 'Patient Not Found',
                'unique': code,
                'dob': '',
                'blood_group': '',
                'gender': '',
                'image_1920': False
            }
        
        return {
            'name': patient.name,
            'unique': patient.patient_seq,
            'dob': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else '',
            'blood_group': patient.blood_group or '',
            'gender': patient.gender or '',
            'image_1920': patient.image_1920 or False
        }
