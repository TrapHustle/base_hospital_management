# 🏥 Pharmacy Dashboard - Models & Modules Requis

## 📋 Vue d'ensemble
Pour rendre votre pharmacy dashboard **dynamique avec les 4 fonctionnalités essentielles**, voici les modèles et modules Odoo nécessaires.

---

## 1️⃣ SUIVI DES VENTES 💰

### Modèles Odoo requis
- **`sale.order`** - Commandes de vente
- **`sale.order.line`** - Lignes de commande (détails produits/quantités)
- **`account.payment`** - Paiements (moyens de paiement)
- **`account.journal`** - Journaux (types de paiement)

### Module Odoo
✅ `sale_management` (déjà dans dépendances)

### Données à suivre
| Métrique | Modèle | Champ |
|----------|--------|-------|
| **Chiffre d'affaires jour** | `sale.order` | `amount_total` filtrée par date |
| **Chiffre d'affaires semaine** | `sale.order` | `amount_total` groupby semaine |
| **Chiffre d'affaires mois** | `sale.order` | `amount_total` groupby mois |
| **Produits les plus vendus** | `sale.order.line` | groupby `product_id`, sum `product_uom_qty` |
| **Historique transactions** | `sale.order` | filtrée par plage date |
| **Moyens de paiement** | `account.payment.payment_method_id` | type de paiement |

### Filtre de base
```python
domain = [
    ('state', 'in', ['sale', 'done']),
    ('date_order', '>=', date_debut),
    ('date_order', '<=', date_fin),
]
```

---

## 2️⃣ GESTION DES STOCKS 📦 ⭐ **PRIORITAIRE**

### Modèles Odoo requis
- **`stock.quant`** - Quantités en stock
- **`stock.move`** - Mouvements de stock
- **`product.template`** ✅ (déjà existant)
- **`pharmacy.medicine`** ✅ (déjà existant)

### Module Odoo
✅ `stock` (déjà dans dépendances)

### Alertes critiques à implémenter

| Alerte | Condition | Action |
|--------|-----------|--------|
| **Rupture de stock** | `qty_available = 0` | 🔴 Alerte ROUGE |
| **Stock faible** | `qty_available < min_qty` | 🟡 Alerte ORANGE |
| **Expiration proche** | `expiry_date <= today + 30j` | 🟠 Alerte CRITIQUE |
| **Expiration dépassée** | `expiry_date < today` | 🔴 À retirer |

### Champs à ajouter au modèle `pharmacy.medicine`
```python
# Dans hospital_pharmacy.py ou pharmacy_medicine.py
expiry_date = fields.Date(
    string="Date d'expiration",
    help="Date d'expiration du médicament"
)

min_qty = fields.Integer(
    string="Quantité minimale",
    default=10,
    help="Seuil d'alerte de stock faible"
)

batch_number = fields.Char(
    string="Numéro lot",
    help="Numéro de lot du médicament"
)
```

### Query pour stocks critiques
```python
# Produits en rupture
out_of_stock = pharmacy.medicine.search([
    ('qty_available', '=', 0)
])

# Produits presque épuisés
low_stock = pharmacy.medicine.search([
    ('qty_available', '>', 0),
    ('qty_available', '<=', min_qty)
])

# Médicaments expirant bientôt (dans 30 jours)
expiring_soon = pharmacy.medicine.search([
    ('expiry_date', '<=', today + 30j),
    ('expiry_date', '>', today)
])
```

---

## 3️⃣ GESTION DES ORDONNANCES 👨‍⚕️

### Modèles Odoo
- **`prescription.line`** ✅ (déjà existant)
- **`hospital.outpatient`** ✅ (déjà existant)
- **`hospital.inpatient`** ✅ (déjà existant)
- **`product.template`** ✅ (médicaments)

### Module Odoo
✅ Interne à `base_hospital_management`

### États à tracker
```python
state = [
    ('draft', 'En attente'),
    ('confirmed', 'Confirmée'),
    ('completed', 'Traitée'),
    ('dispensed', 'Dispensée/Livrée'),
]
```

### Données à afficher

| Information | Source | Filtre |
|-------------|--------|--------|
| **Ordonnances en attente** | `prescription.line` | `state = 'draft'` |
| **Ordonnances traitées** | `prescription.line` | `state = 'completed'` |
| **Ordonnances dispensées** | `prescription.line` | `state = 'dispensed'` |
| **Historique patients** | `prescription.line` + `res.partner` | any state, ordonné par date |
| **Médicaments par ordonnance** | `prescription.line.medicine_id` | groupby |

### Query exemple
```python
# Ordonnances en attente
pending = env['prescription.line'].search([
    ('state', '=', 'draft'),
])

# Historique d'un patient
patient_history = env['prescription.line'].search([
    ('res_partner_id', '=', patient_id),
], order='create_date desc')
```

---

## 4️⃣ GESTION FINANCIÈRE 💰

### Modèles Odoo requis
- **`account.move`** - Factures d'achat/vente
- **`account.move.line`** - Lignes de facturation
- **`account.account`** - Comptes comptables
- **`account.payment`** - Paiements
- **`purchase.order`** - Commandes fournisseurs
- **`purchase.order.line`** - Lignes commandes achat

### Module Odoo
✅ `account` (dépendance de `sale_management`)
✅ `purchase` (si non présent, ajouter aux dépendances)

### Calculs financiers

| Indicateur | Formule | Source |
|------------|---------|--------|
| **Revenu** | `sum(sale.order.amount_total)` | `sale.order` État='sale' |
| **Coût des ventes** | `sum(purchase.order.amount_total)` | `purchase.order` État='purchase' |
| **Bénéfice brut** | `Revenu - Coût des ventes` | Calcul Python |
| **Dépenses** | `sum(account.move.amount_total)` | `account.move` type='expense' |
| **Factures fournisseurs** | Factures d'achat | `account.move` type='in_invoice' |
| **Paiements en attente** | Paiements non confirmés | `account.payment` state='draft' |

### Queries financières
```python
# Revenu total (jour/semaine/mois)
revenue = env['sale.order'].search_read(
    domain=[('state', 'in', ['sale', 'done']), ('date_order', '>=', date_start)],
    fields=['amount_total']
)
total_revenue = sum([r['amount_total'] for r in revenue])

# Coût des achats
costs = env['purchase.order'].search([
    ('state', '=', 'purchase'),
    ('date_order', '>=', date_start)
])
total_cost = sum(costs.mapped('amount_total'))

# Bénéfice
profit = total_revenue - total_cost

# Factures fournisseurs en attente de paiement
pending_bills = env['account.move'].search([
    ('type', '=', 'in_invoice'),
    ('payment_state', 'in', ['not_paid', 'partial']),
])
```

---

## ✅ CHECKLIST - MODULES DE DÉPENDANCE

Vérifiez que votre `__manifest__.py` contient :

```python
"depends": [
    "website",           # ✅ Déjà présent
    "hr",               # ✅ Déjà présent
    "stock",            # ✅ Déjà présent
    "sale_management",  # ✅ Déjà présent
    "account",          # ✅ Via sale_management
    "purchase",         # ⚠️ À AJOUTER si absent
    "portal",           # ✅ Déjà présent
],
```

### Ajouter si manquant :
```python
"purchase",  # Pour gestion fournisseurs et commandes d'achat
```

---

## 📊 TABLEAU RÉCAPITULATIF - STATUS ACTUEL

| Fonction | Modèles | Status | Action |
|----------|---------|--------|--------|
| **Ventes** | sale.order, sale.order.line | ✅ OK | Intégrer dans dashboard |
| **Stocks** | pharmacy.medicine, stock.quant | ⚠️ Incomplet | Ajouter champs `expiry_date`, `min_qty` |
| **Ordonnances** | prescription.line | ✅ OK | Ajouter champ `state` |
| **Finances** | account.move, purchase.order | ⚠️ À intégrer | Créer requêtes comptables |

---

## 🔧 PROCHAINES ÉTAPES

### 1. Migrer/Enrichir les modèles existants
- Ajouter `expiry_date` à `pharmacy.medicine`
- Ajouter `state` à `prescription.line`
- Ajouter `min_qty` à `pharmacy.medicine`

### 2. Créer les méthodes backend
- Enrichir `pharmacy_dashboard_methods.py` avec :
  - `get_sales_data()` - Ventes
  - `get_stock_alerts()` - Alertes stocks
  - `get_prescriptions_data()` - Ordonnances
  - `get_financial_data()` - Finances

### 3. Mettre à jour le frontend JavaScript
- Appeler ces méthodes ORM
- Afficher les données dans les charts
- Mettre en place le refresh dynamique

---

## 📝 Notes importantes

- **Stocks** : C'est la fonction la **PLUS CRITIQUE** (évite pertes financières)
- **Tests** : Vérifier les calculs financiers avec la compta
- **Performance** : Utiliser `search_read()` et `read_group()` pour les requêtes
- **Sécurité** : Respecter les droits d'accès (group-based)

---

**Document créé** : 2026-02-17  
**Version** : 1.0  
**Odoo** : 18.0
