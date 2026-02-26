# FICHE RÉSUMÉE - Portail de Réception

**USAGE:** Imprimez ou consultez cette fiche pour une compréhension rapide du portail.

---

## 🎯 EN 5 MINUTES

Le portail de réception est une interface complète pour:
1. **Enregistrer des patients** (nom, téléphone, groupe sanguin, etc.)
2. **Créer des rendez-vous** (consultations externes ou hospitalisations)
3. **Geérer les chambres** et services hospitaliers

**Architecture:**
- **Frontend:** JavaScript OWL + Templates XML + CSS
- **Backend:** Méthodes Python sur modèles Odoo
- **Communication:** ORM RPC (Client → Serveur)

---

## 📍 LOCALISATION DES FICHIERS

```
addons/base_hospital_management/
├── models/reception_dashboard_methods.py           ← BACKEND
├── static/src/js/reception_dashboard.js            ← FRONTEND JS
├── static/src/xml/reception_dashboard_templates.xml ← HTML/TEMPLATES
├── static/src/css/reception_dashboard.css          ← STYLES
└── RECEPTION_PORTAL_DOCUMENTATION.md               ← DOCS COMPLÈTES ⭐
```

---

## 🔄 CYCLE DE VIE SIMPLE

```
1. UTILISATEUR      Clique sur un bouton ou remplit un formulaire
                    ↓
2. JAVASCRIPT       Détecte l'événement (onClick, onChange)
                    ↓
3. VALIDATION       Valide les données saisies
                    ↓
4. ORM CALL         Appelle une méthode Python via RPC
                    ↓
5. BACKEND          Traite, valide, crée/met à jour en BD
                    ↓
6. RETOUR           Retourne les données au frontend
                    ↓
7. STATE UPDATE     Mise à jour de this.state
                    ↓
8. RE-RENDER        Template QWeb se re-génère (affichage)
                    ↓
9. CSS              Styles appliqués
                    ↓
10. AFFICHAGE       Utilisateur voit le résultat
```

---

## 🎨 MODIFICATION RAPIDE

### Changer les couleurs?
→ Fichier: `reception_dashboard.css`  
→ Section: `:root { --primary-color: #017E84; ... }`

### Ajouter un champ formulaire?
→ Fichier 1: `reception_dashboard_templates.xml` (HTML)  
→ Fichier 2: `reception_dashboard.js` (Collecte données)  
→ Fichier 3: `reception_dashboard_methods.py` (Backend, si sauvegarde BD)

### Changer textes/labels?
→ Fichier: `reception_dashboard_templates.xml`  
→ Chercher: `<label>`, `placeholder`, `<span>`, etc.

### Ajouter une section complète?
→ 4 fichiers à modifier en parallèle

---

## 📋 MÉTHODES PRINCIPALES (CHEAT SHEET)

### NAVIGATION (JavaScript)
```javascript
createPatient()           // Affiche formulaire patient
fetchAppointmentData()    // Affiche formulaire RDV
fetchRoomWard()          // Affiche chambres/services
```

### PATIENT (JavaScript)
```javascript
savePatient()             // Créer patient (appelle ORM)
fetch_patient_data()      // Collecte données formulaire patient
```

### CONSULTATION (JavaScript)
```javascript
createOutPatient()        // Affiche formulaire consultation externe
save_out_patient_data()   // Créer consultation (appelle ORM)
fetch_patient_id()        // Remplit autopletes patient
patient_card()            // Affiche/masque dropdown patient
```

### HOSPITALISATION (JavaScript)
```javascript
createInPatient()         // Affiche formulaire hospitalisation
save_in_patient_data()    // Créer hospitalisation (appelle ORM)
fetch_in_patient_data()   // Collecte données hospitalisation
```

### CHAMBRES (JavaScript)
```javascript
fetchWard()              // Affiche liste services
fetchRoom()              // Affiche liste chambres
```

### STATISTIQUES (Python)
```python
@api.model
get_reception_statistics()      # KPIs globaux du dashboard
get_reception_charts_data()     # Données pour graphiques
```

### PATIENTS (Python)
```python
get_appointments_today()        # RDV du jour
get_active_inpatients()         # Patients hospitalisés
```

### RESSOURCES (Python)
```python
get_room_status()              # État toutes chambres
get_available_rooms()          # Chambres libres
get_ward_status()              # État tous services
get_available_wards()          # Services avec lits
get_available_doctors()        # Médecins dispo
```

---

## 🔌 APPELS ORM (Requêtes serveur)

### Format général
```javascript
this.orm.call('model.name', 'method_name', [arguments])
  .then(result => {
    // Traiter résultat
  })
```

### Exemples concrets
```javascript
// Récupérer patients
this.orm.call('res.partner', 'fetch_patient_data', [])

// Créer patient
this.orm.call('res.partner', 'create', [{name: "...", phone: "..."}])

// Créer consultation
this.orm.call('res.partner', 'create_patient', [{op_name: "...", ...}])

// Créer hospitalisation
this.orm.call('hospital.inpatient', 'create_new_in_patient', [null, {...}])

// Récupérer médecins
this.orm.call('doctor.allocation', 'search_read', [])

// Récupérer chambres
this.orm.call('patient.room', 'search_read', [])
```

---

## 🎛️ ÉTAT DU COMPOSANT (State)

```javascript
this.state = {
  patient_lst: [],                    // Patients pour dropdown
  ward_data: [],                      // Services pour tableau
  room_data: [],                      // Chambres pour tableau
  dr_lst: [],                         // Médecins pour dropdown
  currentDate: "2026-02-16",          // Date du jour
  current_appointment_type: 'outpatient',  // 'outpatient' ou 'inpatient'
  current_room_ward_type: 'ward'      // 'ward' ou 'room'
}
```

**Exception:** Ne modifiez PAS l'état directement!  
Utilisez: `this.state.propriete = newValue;`

---

## 🟢 STATUTS (Room State Badges)

| State | Affichage | Couleur | Signification |
|-------|-----------|--------|---------------|
| `'avail'` | Disponible | 🟢 Vert | Chambre libre |
| `'reserve'` | Réservée | 🟡 Orange | Réservée bientôt |
| Autre | Occupée | 🔴 Rouge | En utilisation |

---

## 📊 MODÈLES UTILISÉS

- `res.partner` → **Patients** + Partenaires généraux
- `hospital.outpatient` → **Consultations** externes
- `hospital.inpatient` → **Hospitalisations** (séjours)
- `patient.room` → **Chambres** d'hôpital
- `hospital.ward` → **Services/Wards** (étages, ailes)
- `doctor.allocation` → **Disponibilités médecins**
- `hr.employee` → **Employés/Médecins**

---

## 🎓 COMPRENDRE UN FORMULAIRE

### Exemple: Formulaire Patient (patient_creation)

```
TEMPLATE → <input id="patient-name">
             │
JAVASCRIPT → fetch_patient_data()
             ├─ const name = getElementValue('patient-name')
             └─ Retour: {name: "...", phone: "...", ...}
             │
             savePatient()
             ├─ Valide: name !== ""
             └─ ORM.call('res.partner', 'create', [data])
             │
BACKEND → ResPartner.create(data)
             ├─ Crée record BD
             └─ Retour: customer_id

FRONTEND → Affiche alerte "Créé!"
             └─ window.location.reload()
```

---

## 🚨 CHECKLIST AVANT MODIFICATION

- [ ] Lisez RECEPTION_PORTAL_DOCUMENTATION.md (sections 1-2)
- [ ] Identifiez exactement quoi modifier
- [ ] Sauvegardez les fichiers originaux (ou utilisez git)
- [ ] Effectuez une modification à la fois
- [ ] Testez chaque modification
- [ ] Vérifiez que tout fonctionne
- [ ] Documente les changements

---

## 🐛 ERREURS COURANTES

| Erreur | Cause | Solution |
|--------|-------|----------|
| Dropdown vide | State non chargé | Vérrez ORM.call dans méthode |
| Bouton inactif | CSS class manquante | Vérifiez `.r_active` |
| Formulaire ne valide | Validation JS manquante | Vérifiez fetch_*_data() |
| ORM fail | Mauvais nom méthode | Vérifiez nom exact + _inherit |
| Template pas appliquée | État pas mis à jour | Vérifiez this.state.xxx = yyy |

---

## 📱 RESPONSIVE DESIGN

- **Mobile:** < 768px
- **Tablette:** 768px - 1024px
- **Desktop:** > 1024px

CSS utilise `flex` et `grid`. Vérifiez avec F12 DevTools.

---

## 🎨 COULEURS PRINCIPALES

```css
:root {
  --primary-color: #017E84;      /* Teal - Principal */
  --secondary-color: #00A09D;    /* Secondaire */
  --accent-color: #875A7B;       /* Violet - Accent */
  --success-color: #28a745;      /* Vert - OK */
  --warning-color: #ffc107;      /* Jaune - Attention */
  --danger-color: #dc3545;       /* Rouge - Erreur */
}
```

---

## 🔍 DÉBOGUER

### Voir les appels ORM
1. Ouvrez F12 (DevTools)
2. Onglet "Network"
3. Cherchez les appels `/jsonrpc` ou `/rpc`
4. Regardez "Payload" et "Response"

### Voir l'état JS
1. Console F12
2. `document.querySelector('.r_Container').__owl__ → state`
3. Ou insertez `console.log(this.state)` dans les méthodes

### Voir les enregistrements BD
1. Allez dans Odoo UI
2. Modèle correspondant (Patients, Consultations, etc.)
3. Cherchez les enregistrements créés

---

## 📚 DOCUMENTATION COMPLÈTE

Pour détails complets, consultez:
- **RECEPTION_PORTAL_DOCUMENTATION.md** ← START HERE
- **RECEPTION_PORTAL_ARCHITECTURE.md** ← Pour diagrammes
- **INDEX.md** ← Pour navigation

---

## ✅ PRÊT À MODIFIER?

1. Imprimez ou marquez-vous cette page
2. Lisez le fichier doc complet
3. Identifiez la section à modifier
4. Suivez les instructions pour ce fichier
5. Testez
6. Donnez à Claude si vous avez besoin d'aide design

---

**Créé:** 16 février 2026  
**Module:** base_hospital_management/reception_portal  
**Odoo:** 18.0  
**Prêt à utiliser par Claude!** 🎨✨
