# -*- coding: utf-8 -*-
"""Site public : page d'accueil de presentation + inscription patient.

Quand un visiteur n'est pas connecte, il decouvre la solution sur /accueil,
puis peut creer un compte : on cree un utilisateur portail dont le partenaire
devient automatiquement un patient (numero attribue par res.partner.create),
on le connecte, et on lui envoie un e-mail de bienvenue (best-effort : part
seulement si un serveur SMTP est configure).
"""
import re
from odoo import http
from odoo.http import request

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class HospitalPublicSite(http.Controller):

    @http.route(['/accueil'], type='http', auth='public', website=True,
                sitemap=True)
    def hospital_landing(self, **kw):
        """Page d'accueil publique presentant le SIH."""
        return request.render(
            'base_hospital_management.public_landing', {})

    @http.route(['/patient/signup'], type='http', auth='public', website=True,
                sitemap=False)
    def patient_signup(self, **kw):
        """Formulaire de creation de compte patient."""
        if not request.env.user._is_public():
            return request.redirect('/my/health')
        return request.render(
            'base_hospital_management.public_signup',
            {'values': kw, 'error': kw.get('error')})

    @http.route(['/patient/signup/submit'], type='http', auth='public',
                website=True, csrf=True, methods=['POST'])
    def patient_signup_submit(self, **post):
        """Cree le patient + son compte portail, connecte, envoie l'e-mail."""
        name = (post.get('name') or '').strip()
        email = (post.get('email') or '').strip().lower()
        phone = (post.get('phone') or '').strip()
        dob = (post.get('date_of_birth') or '').strip()
        password = post.get('password') or ''

        def again(msg):
            vals = dict(post)
            vals.pop('password', None)
            vals['error'] = msg
            return request.render(
                'base_hospital_management.public_signup',
                {'values': vals, 'error': msg})

        # --- Validation ---
        if not name or not email or not password:
            return again("Merci de renseigner votre nom, votre e-mail et un mot de passe.")
        if not EMAIL_RE.match(email):
            return again("L'adresse e-mail ne semble pas valide.")
        if len(password) < 6:
            return again("Le mot de passe doit contenir au moins 6 caractères.")
        Users = request.env['res.users'].sudo()
        if Users.with_context(active_test=False).search_count([('login', '=', email)]):
            return again("Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.")

        # --- Creation du compte (le partenaire devient patient automatiquement) ---
        portal_group = request.env.ref('base.group_portal')
        user = Users.create({
            'name': name,
            'login': email,
            'email': email,
            'password': password,
            'groups_id': [(6, 0, [portal_group.id])],
        })
        partner_vals = {}
        if phone:
            partner_vals['phone'] = phone
        if dob:
            partner_vals['date_of_birth'] = dob
        # Le partenaire d'un utilisateur recoit patient_seq='User' : on lui
        # attribue un vrai numero patient (comme la reservation en ligne).
        if user.partner_id.patient_seq in ('New', 'User', 'Employee', False):
            partner_vals['patient_seq'] = request.env['ir.sequence'].sudo(
            ).next_by_code('patient.sequence') or 'New'
        if partner_vals:
            user.partner_id.sudo().write(partner_vals)
        patient_seq = user.partner_id.patient_seq

        # E-mail de bienvenue (best-effort : ne bloque jamais l'inscription)
        self._send_welcome_email(user.partner_id, patient_seq)

        # Il faut valider en base avant de pouvoir authentifier
        request.env.cr.commit()

        # --- Connexion automatique ---
        try:
            request.session.authenticate(
                request.db,
                {'login': email, 'password': password, 'type': 'password'})
            return request.redirect('/my/health')
        except Exception:
            # Si l'auto-connexion echoue, on renvoie vers la page de login
            return request.redirect('/web/login?login=%s' % email)

    def _send_welcome_email(self, partner, patient_seq):
        """Prepare et tente d'envoyer l'e-mail de bienvenue."""
        try:
            company = request.env.company
            body = request.env['ir.qweb']._render(
                'base_hospital_management.welcome_email_body',
                {'partner': partner, 'patient_seq': patient_seq,
                 'company': company})
            mail = request.env['mail.mail'].sudo().create({
                'subject': "Bienvenue à %s" % (company.name or 'notre hôpital'),
                'email_to': partner.email,
                'email_from': company.email or (request.env.user.email or
                                                'no-reply@hopital.local'),
                'body_html': body,
            })
            mail.send(raise_exception=False)
        except Exception:
            # Pas de SMTP configure, ou autre : on ignore, le compte est cree.
            pass
