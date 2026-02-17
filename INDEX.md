# INDEX - Documentation Portail de Réception

## 📁 Fichiers de Documentation

Ce dossier contient la documentation complète du portail de réception hospitalier pour Odoo 18.

### 📄 Fichiers générés

1. **RECEPTION_PORTAL_DOCUMENTATION.md** ⭐ (CE FICHIER EST LE PRINCIPAL)
   - Vue d'ensemble complète
   - Description détaillée de chaque fichier
   - Toutes les méthodes Python (backend)
   - Toutes les méthodes JavaScript (frontend)
   - Flow de données avec exemples
   - Guide de modification du design
   - **COMMENCEZ ICI** pour comprendre le système

2. **RECEPTION_PORTAL_ARCHITECTURE.md** (DIAGRAMMES ET FLUX)
   - Diagrammes d'architecture
   - Flux d'interaction utilisateur
   - Structure des composants OWL
   - Modèle de données relationnel
   - Arbre des templates XML
   - État machine (State transitions)
   - Appels RPC (Client-Serveur)

3. **INDEX.md** (CE FICHIER)
   - Guide de navigation
   - Références rapides

---

## 🎯 Guide de lecture selon votre besoin

### 👁️ "Je veux comprendre comment ça marche globalement"
→ **RECEPTION_PORTAL_DOCUMENTATION.md** sections 1-2

### 🛠️ "Je veux modifier le design/interface"
→ **RECEPTION_PORTAL_DOCUMENTATION.md** section 8 + section 2.4 (CSS)

### 💾 "Je veux ajouter une nouvelle fonctionnalité"
→ **RECEPTION_PORTAL_DOCUMENTATION.md** sections 3 + 4

### 🔍 "Je veux comprendre les méthodes backend"
→ **RECEPTION_PORTAL_DOCUMENTATION.md** section 3.2

### ⚡ "Je veux comprendre les méthodes frontend"
→ **RECEPTION_PORTAL_DOCUMENTATION.md** section 3.1

### 📊 "Je veux voir les diagrammes/architecture"
→ **RECEPTION_PORTAL_ARCHITECTURE.md**

### 🐛 "J'ai une erreur/bug"
→ **RECEPTION_PORTAL_ARCHITECTURE.md** section 11

---

## 📦 Structure du module

```
base_hospital_management/
├── models/
│   └── reception_dashboard_methods.py          ← BACKEND (Python)
│
├── static/src/
│   ├── js/
│   │   └── reception_dashboard.js              ← FRONTEND (JavaScript OWL)
│   │
│   ├── xml/
│   │   └── reception_dashboard_templates.xml   ← TEMPLATES (HTML/QWeb)
│   │
│   └── css/
│       └── reception_dashboard.css             ← STYLES (CSS)
│
└── Documentation/
    ├── RECEPTION_PORTAL_DOCUMENTATION.md       ← Complète
    ├── RECEPTION_PORTAL_ARCHITECTURE.md        ← Diagrammes
    └── INDEX.md                                ← Ce fichier
```

---

## 🔧 Fichiers à modifier pour le design

### Pour les couleurs
```
Fichier: reception_dashboard.css
Localisation: :root { ... }
Variables: --primary-color, --secondary-color, --accent-color, etc
```

### Pour la structure/layout
```
Fichier: reception_dashboard_templates.xml
Éléments: <div>, <input>, <select>, <table>
Classes: .r_Container, .form-section, .data-table, etc
```

### Pour le comportement dynamique
```
Fichier: reception_dashboard.js
Méthodes: createPatient(), fetchAppointmentData(), fetchRoom(), etc
État: this.state = {...}
```

### Pour la logique serveur
```
Fichier: reception_dashboard_methods.py
Classes: ResPartner, HospitalOutpatient, PatientRoom, etc
Méthodes: get_reception_statistics(), get_available_rooms(), etc
```

---

## 📋 Listes de référence rapide

### 🎨 Classes CSS principales

| Classe | Usage |
|--------|-------|
| `.r_Container` | Conteneur principal |
| `.r_dashButton` | Boutons navigation |
| `.r_active` | État actif bouton |
| `.form-section` | Bloc formulaire |
| `.form-group` | Champ formulaire |
| `.hsp_table` | Tableau formulaire |
| `.data-table` | Tableau données |
| `.badge` | Badge de statut |

### 📱 Résolutions CSS Variables

| Variable | Valeur |
|----------|--------|
| `--primary-color` | #017E84 (Teal) |
| `--secondary-color` | #00A09D |
| `--accent-color` | #875A7B (Violet) |
| `--success-color` | #28a745 (Vert) |
| `--warning-color` | #ffc107 (Jaune) |
| `--danger-color` | #dc3545 (Rouge) |

### 🎛️ Méthodes JavaScript principales

**Navigation:**
- `createPatient()` - Affiche formulaire patient
- `fetchAppointmentData()` - Affiche formulaire RDV
- `fetchRoomWard()` - Affiche chambres/services

**Patient:**
- `savePatient()` - Crée patient
- `fetch_patient_data()` - Collecte données formulaire

**Consultation:**
- `createOutPatient()` - Affiche formulaire consultation
- `save_out_patient_data()` - Crée consultation

**Hospitalisation:**
- `createInPatient()` - Affiche formulaire hospitalisation
- `save_in_patient_data()` - Crée hospitalisation

**Chambres/Services:**
- `fetchWard()` - Affiche liste services
- `fetchRoom()` - Affiche liste chambres

### 🔧 Méthodes Python principales

**ResPartner (Patients):**
- `get_reception_statistics()` - Stats dashboard
- `get_reception_charts_data()` - Données graphiques

**HospitalOutpatient:**
- `get_appointments_today()` - RDV du jour

**HospitalInpatient:**
- `get_active_inpatients()` - Patients hospitalisés

**PatientRoom:**
- `get_room_status()` - État toutes chambres
- `get_available_rooms()` - Chambres libres

**HospitalWard:**
- `get_ward_status()` - État tous services
- `get_available_wards()` - Services avec lits libres

---

## 🚀 Points d'entrée principaux

### À partir d'Odoo
1. Menu → [Module Name] → Reception Dashboard
2. Déclenche l'action `reception_dashboard_tags`
3. Charge `ReceptionDashBoard` composant OWL
4. Initialise `setup()` et `onMounted()`

### Flow principal
```
setup() 
  ↓
onMounted() 
  ↓  
createPatient() [par défaut]
  ↓
Affiche formulaire patient
  ↓
Utilisateur interagit
  ↓
Méthodes JavaScript déclenchées
  ↓
ORM.call() → Backend Python
  ↓
État mis à jour
  ↓
Template re-render (QWeb)
  ↓
CSS appliquée
```

---

## 💡 Points clés à retenir

1. **Réactivité:** L'interface est basée sur OWL avec gestion d'état centralisée (`this.state`)
2. **Séparation:** 3 niveaux: Présentation (XML), Logique (JS), Données (Python)
3. **Communication:** RPC via ORM pour appeler les méthodes Python
4. **Validation:** Côté frontend (JS) + Côté backend (Python)
5. **Responsive:** CSS avec variables et media queries
6. **Multilingue:** QWeb supporte `_t()` pour traductions

---

## 📡 API & Modèles utilisés

### Modèles Odoo
- `res.partner` → Patients
- `hospital.outpatient` → Consultations externes
- `hospital.inpatient` → Hospitalisations
- `patient.room` → Chambres
- `hospital.ward` → Services
- `doctor.allocation` → Disponibilité médecins
- `hr.employee` → Employés (avec médecins)

### Services OWL
- `orm` → Calls au backend
- `action` → Navigation, fenêtres modales
- *(d'autres non utilisés dans ce module)*

### API Hooks OWL
- `useState()` → État réactif
- `useRef()` → Références DOM
- `useService()` → Injection services
- `onMounted()` → Lifecycle hook

---

## 🎓 Pour apprendre

### Documentation officielle
- **Odoo 18 Docs:** https://www.odoo.com/documentation/18.0/
- **OWL Framework:** https://github.com/odoo/owl
- **QWeb Templates:** https://www.odoo.com/documentation/18.0/developer/reference/frontend/qweb.html

### Ressources du projet
- **RECEPTION_PORTAL_DOCUMENTATION.md** - Détails complets
- **RECEPTION_PORTAL_ARCHITECTURE.md** - Diagrammes
- Code source en local

---

## ✅ Checklist de modification

Si vous voulez modifier le design, suivez cet ordre:

- [ ] Lire RECEPTION_PORTAL_DOCUMENTATION.md sections 1-2
- [ ] Analyser reception_dashboard.css (variables couleurs)
- [ ] Identifier quelle partie modifier
- [ ] Modifier CSS (couleurs, espacements)
- [ ] Modifier templates XML si besoin (structure)
- [ ] Tester dans le browser
- [ ] Vérifier responsive (F12 DevTools)
- [ ] Donner à Claude pour finalisation du design

---

## 📞 Points de contact technique

Pour chaque besoin:

**Design & Interface:** 
→ reception_dashboard.css + reception_dashboard_templates.xml

**Fonctionnalités Frontend:**
→ reception_dashboard.js (méthodes OWL)

**Données & Backend:**
→ reception_dashboard_methods.py (méthodes Python)

**Intégration Odoo:**
→ Héritage des modèles via `_inherit`

---

## 📊 Récapitulatif

| Aspect | Fichier | Langage |
|--------|---------|---------|
| **Interface** | reception_dashboard_templates.xml | XML/QWeb |
| **Styles** | reception_dashboard.css | CSS |
| **Logique Frontend** | reception_dashboard.js | JavaScript (OWL) |
| **Logique Backend** | reception_dashboard_methods.py | Python |

---

## 🎯 Prochaines étapes recommandées

1. ✅ **Lire la doc complète** (RECEPTION_PORTAL_DOCUMENTATION.md)
2. 📊 **Consulter les diagrammes** (RECEPTION_PORTAL_ARCHITECTURE.md)
3. 💻 **Identifier les modifications** souhaitées
4. 🔧 **Modifier le code** en conséquence
5. ✔️ **Tester** dans Odoo
6. 📝 **Documenter** les changements
7. 🚀 **Déployer** en production

---

**Documentation créée:** 16 février 2026  
**Portail:** base_hospital_management/reception  
**Module Odoo:** 18.0  

**Prêt à être utilisé par Claude pour modifications de design!** 🎨
