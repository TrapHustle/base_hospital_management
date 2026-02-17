# 🔧 PHARMACY DASHBOARD - GUIDE D'IMPLÉMENTATION

## 📊 ANALYSE DE L'EXISTANT vs MANQUANT

### **MODÈLE PHARMACY.MEDICINE** ✅ EXISTANT
Fichier: [models/pharmacy_medicine.py](models/pharmacy_medicine.py)

**Champs existants:**
```python
product_id          # Many2one('product.template')
pharmacy_id         # Many2one('hospital.pharmacy')
qty_available       # Float (related: product_id.qty_available) ✅
list_price          # Float (related: product_id.list_price) ✅
```

**❌ CHAMPS À AJOUTER:**
```python
expiry_date         # Date - DATE D'EXPIRATION (MANQUANT!)
min_qty             # Integer - SEUIL ALERTE (MANQUANT!)
batch_number        # Char - NUMÉRO LOT (MANQUANT!)
```

---

### **MODÈLE PRESCRIPTION.LINE** ⚠️ PARTIELLEMENT EXISTANT
Fichier: [models/prescription_line.py](models/prescription_line.py)

**Champs existants:**
```python
prescription_id     # Many2one('hospital.prescription')
medicine_id         # Many2one('product.template')
quantity            # Integer
no_intakes          # Float
time                # Selection (once/twice/thrice/morning/noon/evening)
note                # Selection (before/after)
inpatient_id        # Many2one('hospital.inpatient')
outpatient_id       # Many2one('hospital.outpatient')
res_partner_id      # Many2one('res.partner', related)
```

**❌ CHAMP À AJOUTER:**
```python
state               # Selection - ÉTAT DE L'ORDONNANCE (MANQUANT!)
                    # Values: draft, confirmed, completed, dispensed
```

---

### **MODÈLE HOSPITAL.PHARMACY** ✅ BIEN STRUCTURÉ
Fichier: [models/hospital_pharmacy.py](models/hospital_pharmacy.py)

**Champs existants:** ✅ Tous présents
- name, pharmacist_id, phone, mobile, email
- address fields (street, city, zip, etc.)
- medicine_ids (One2many)
- sales_team_id

**Méthodes utiles EXISTANTES:**
- `create_sale_order()` - Crée commandes
- `company_currency()` - Récupère devise
- `tax_amount()` - Calcule taxes
- `action_get_inventory()` - Vue stock
- `action_get_sale_order()` - Vue ventes
- `fetch_sale_orders()` - Récupère commandes

---

### **MODÈLE PHARMACY_DASHBOARD_METHODS** 🟢 PARTIELLEMENT IMPLÉMENTÉ
Fichier: [models/pharmacy_dashboard_methods.py](models/pharmacy_dashboard_methods.py)

**Méthodes EXISTANTES:** ✅
```python
get_pharmacy_statistics()    # Revenue, orders, low stock
get_pharmacy_charts_data()   # Daily sales, top products, monthly revenue
action_get_medicine_data()   # GET medicines with prices/stock
action_get_vaccine_data()    # GET vaccines with prices/stock
action_get_patient_data()    # GET patient by code
```

**❌ MÉTHODES À AJOUTER:**
```python
get_stock_alerts()           # CRITIQUES: rupture, faible, expiration
get_prescriptions_data()     # Ordonnances en attente/traitées
get_financial_data()         # Revenue, costs, profit, pending payments
```

---

## 🎨 CSS - STRUCTURE EXISTANTE

**Fichiers CSS:**
- `pharmacy_dashboard.css` (899 lignes) ✅ **Déjà configuré**
- `doctor_dashboard.css` (518 lignes) - Référence

**Variables de couleurs DÉJÀ DÉFINIES:**
```css
--primary-color: #875A7B       (Violet Odoo)
--primary-dark: #714B67
--secondary-color: #D4A5C3
--success-color: #28a745       (Vert)
--warning-color: #ffc107       (Orange)
--danger-color: #dc3545        (Rouge)
```

**✅ CSS DÉJÀ PRÊT** - Juste besoin de l'utiliser dans le HTML

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### **Phase 1: Enrichir les modèles** (2 fichiers)
- [ ] Ajouter 3 champs à `pharmacy.medicine` (expiry_date, min_qty, batch_number)
- [ ] Ajouter 1 champ à `prescription.line` (state)

### **Phase 2: Méthodes backend** (1 fichier)
- [ ] Ajouter `get_stock_alerts()` à `pharmacy_dashboard_methods.py`
- [ ] Ajouter `get_prescriptions_data()` 
- [ ] Ajouter `get_financial_data()`

### **Phase 3: Frontend JavaScript** (1 fichier)
- [ ] Mettre à jour `pharmacy_dashboard_1.js` pour appeler les 3 nouvelles méthodes
- [ ] Ajouter charts/cards pour stocks, ordonnances, finances

### **Phase 4: Vues** (1 fichier XML)
- [ ] Ajouter sections dans `pharmacy_dashboard_templates.xml`

---

## 🔗 DÉPENDANCES À VÉRIFIER

**Dans `__manifest__.py`:**
```python
"depends": [
    "website",           ✅
    "hr",               ✅
    "stock",            ✅ (pour stock.quant)
    "sale_management",  ✅
    "account",          ✅ (via sale_management)
    "purchase",         ⚠️ À VÉRIFIER si absent
    "portal",           ✅
],
```

---

## 📝 MODÈLES ODOO CORE À UTILISER

| Fonction | Modèle | Statut |
|----------|--------|--------|
| **Stocks** | `stock.quant` | ✅ Dispo via module `stock` |
| **Ventes** | `sale.order`, `sale.order.line` | ✅ Via `sale_management` |
| **Ordonnances** | `prescription.line` | ✅ Existant |
| **Finances** | `account.move`, `purchase.order` | ⚠️ Via `account` + `purchase` |
| **Paiements** | `account.payment` | ✅ Via `account` |

---

## 💡 NOTES IMPORTANTES

1. **STOCKS = PRIORITAIRE**: C'est la fonction qui évite les pertes financières
2. **pharmacy.medicine** pointe vers `product.template` (via product_id)
3. **qty_available** est déjà relié au stock réel (read-only, calculé)
4. **CSS déjà stylisé** - Respecter les classes existantes
5. **JS utilise ORM** - Utiliser `this.orm.call()` pour les méthodes
6. **Date format** - Utiliser `DEFAULT_SERVER_DATE_FORMAT` en Python

---

## 🚀 ORDRE RECOMMANDÉ

1. **Ajouter les champs manquants** aux modèles
2. **Implémenter get_stock_alerts()** (PRIORITAIRE)
3. **Implémenter get_prescriptions_data()**
4. **Implémenter get_financial_data()**
5. **Mettre à jour le JS** pour appeler ces méthodes
6. **Tester avec des données réelles**

---

**Prêt à commencer l'implémentation ? 🎯**
