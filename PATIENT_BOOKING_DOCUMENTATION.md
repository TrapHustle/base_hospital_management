# Documentation - Gestion des Rendez-vous Patients (Patient Booking)

## Vue d'ensemble

La gestion des rendez-vous (booking) permet de créer et gérer deux types d'appointments:
1. **Consultations externes** (OutPatient / Rendez-vous)
2. **Hospitalisations** (InPatient / Admissions)

Ce module est **entièrement dynamique** grâce à OWL (Odoo Web Library) et une interaction constante avec le backend Python via RPC.

---

## 📁 Fichiers impliqués

### 1. Frontend - JavaScript
**Fichier:** `addons/base_hospital_management/static/src/js/reception_dashboard.js`

### 2. Frontend - Templates HTML
**Fichier:** `addons/base_hospital_management/static/src/xml/reception_dashboard_templates.xml`

### 3. Frontend - Styles
**Fichier:** `addons/base_hospital_management/static/src/css/reception_dashboard.css`

### 4. Backend - Python
**Fichier:** `addons/base_hospital_management/models/reception_dashboard_methods.py`

---

## ⚙️ CE QUI LE REND DYNAMIQUE

### 1. STATE MANAGEMENT (OWL)
```javascript
this.state = {
    current_appointment_type: 'outpatient',  // 'outpatient' ou 'inpatient'
    patient_lst: [],                         // Liste patients chargée dynamiquement
    dr_lst: [],                              // Liste médecins chargée dynamiquement
    currentDate: "2026-02-16"                // Date du jour
}
```

**Quand `state` change → Template re-render automatiquement**

### 2. APPELS RPC ASYNCHRONES
```javascript
// Chaque interaction déclenche un appel serveur
this.orm.call('model.name', 'method', [args])
    .then(result => {
        // Met à jour state
        this.state.data = result;  
    })
```

### 3. ÉVÉNEMENTS & EVENT LISTENERS
```xml
<!-- Chaque bouton/input a un t-on-click ou t-on-change -->
<button t-on-click="createOutPatient">Consultation</button>
<input t-on-change="patient_card">
```

---

## 🎯 LES 2 TYPES DE RENDEZ-VOUS

### A. CONSULTATION EXTERNE (OutPatient)

#### 1. Structure - Fichiers
```
reception_dashboard_templates.xml
  └─ Section: "Outpatient Form"
     ├─ Patient select/input
     ├─ Date input
     ├─ Doctor select
     ├─ Reason textarea
     └─ Save button

reception_dashboard.js
  ├─ createOutPatient()           ← Affiche formulaire
  ├─ fetch_out_patient_data()     ← Collecte données
  ├─ fetch_patient_id()           ← Remplissage auto
  ├─ patient_card()               ← Affiche/masque select
  └─ save_out_patient_data()      ← Crée rendez-vous

reception_dashboard_methods.py
  └─ ResPartner.create_patient()  ← Crée en BD
```

#### 2. Flow dynamique

```
UTILISATEUR
    ↓
Click "Consultation (Externe)"
    ↓
createOutPatient()
    ├─ state.current_appointment_type = 'outpatient'
    ├─ ORM: fetch_patient_data() → state.patient_lst
    ├─ ORM: doctor.allocation.search_read() → state.dr_lst
    └─ Template re-render (t-if="state.current_appointment_type == 'outpatient'")
    ↓
Affiche formulaire consultation avec dropdowns remplis
    ↓
Utilisateur sélectionne patient
    ↓
fetch_patient_id()
    ├─ ORM: reception_op_barcode() → récupère data patient
    └─ Auto-remplit: nom, DOB, groupe sanguin, gender
    ↓
Utilisateur remplit: date, médecin, motif
    ↓
Click "Créer rendez-vous"
    ↓
save_out_patient_data()
    ├─ fetch_out_patient_data() → collecte tous les champs
    ├─ ORM: res.partner.create_patient(data)
    └─ Backend crée hospital.outpatient record
    ↓
Alerte "Rendez-vous créé"
    ↓
Vide formulaire
```

#### 3. Données envoyées au backend

```python
{
    'op_name': string,              # Nom patient
    'op_phone': string,
    'op_blood_group': string,
    'op_rh': '+' ou '-',            # Rhésus
    'op_gender': 'male'/'female',
    'patient_id': integer,          # ID patient existant (optionnel)
    'date': 'YYYY-MM-DD',           # Date RDV
    'reason': string,               # Motif consultation
    'slot': 0.00,                   # Heure (non utilisée?)
    'doctor': integer,              # ID médecin
    'op_dob': 'YYYY-MM-DD'         # Date naissance (optionnel)
}
```

#### 4. Validation dynamique

**Frontend (JavaScript):**
```javascript
// Dans fetch_out_patient_data()
if (!oPatientName || !doctor || !opDate) {
    alert('Veuillez remplir tous les champs obligatoires.');
    return false;
}
```

**Backend (Python):**
```python
# Dans ResPartner.create_patient()
# Valide et crée hospital.outpatient
```

---

### B. HOSPITALISATION (InPatient)

#### 1. Structure - Fichiers
```
reception_dashboard_templates.xml
  └─ Section: "Inpatient Form"
     ├─ Patient select
     ├─ Doctor select
     ├─ Admission type select
     ├─ Date input
     ├─ Reason textarea
     └─ Save button

reception_dashboard.js
  ├─ createInPatient()           ← Affiche formulaire
  ├─ fetch_in_patient_data()     ← Collecte données
  └─ save_in_patient_data()      ← Crée hospitalisation

reception_dashboard_methods.py
  └─ HospitalInpatient.create_new_in_patient()  ← Crée en BD
```

#### 2. Flow dynamique

```
UTILISATEUR
    ↓
Click "Hospitalisation (Interne)"
    ↓
createInPatient()
    ├─ state.current_appointment_type = 'inpatient'
    ├─ ORM: res.partner.fetch_patient_data() → state.patient_lst
    ├─ ORM: hr.employee.search_read([['job_id.name','=','Doctor']]) → state.dr_lst
    └─ Template re-render (t-if="state.current_appointment_type == 'inpatient'")
    ↓
Affiche formulaire hospitalisation avec dropdowns remplis
    ↓
Utilisateur sélectionne: patient, médecin, type admission, motif
    ↓
Click "Créer admission"
    ↓
save_in_patient_data()
    ├─ fetch_in_patient_data() → collecte tous les champs
    ├─ ORM: hospital.inpatient.create_new_in_patient([null, data])
    └─ Backend crée hospital.inpatient record
    ↓
Alerte "Admission créée"
    ↓
Vide formulaire
```

#### 3. Données envoyées au backend

```python
{
    'patient_id': integer,              # ID patient (obligatoire)
    'attending_doctor_id': integer,     # ID médecin (obligatoire)
    'admission_type': string,           # 'emergency'/'planned'/'transfer'
    'reason_of_admission': string       # Motif admission
}
```

#### 4. Validation dynamique

**Frontend (JavaScript):**
```javascript
if (!patientId || !attendingDoctorId || !admissionType) {
    alert('Veuillez remplir tous les champs obligatoires.');
    return false;
}
```

---

## 🔧 MÉTHODES QUI LE RENDENT DYNAMIQUE

### JavaScript - Frontend

#### Navigation
```javascript
fetchAppointmentData() {
    // Affiche la section "Rendez-vous"
    // Change le bouton actif
    // Appelle createOutPatient() par défaut
}
```

#### Consultation Externe
```javascript
createOutPatient() {
    // 1. Met state.current_appointment_type = 'outpatient'
    // 2. Charge patients: ORM.call('res.partner', 'fetch_patient_data', [])
    // 3. Charge médecins: ORM.call('doctor.allocation', 'search_read', [])
    // 4. Remplit dropdown médecins dynamiquement
    // 5. Templates re-render via section "t-if == 'outpatient'"
    
    const result = await this.orm.call('res.partner','fetch_patient_data',[]);
    this.state.patient_lst = result;
    
    const doctorResult = await this.orm.call('doctor.allocation', 'search_read', []);
    this.state.dr_lst = doctorResult;
}

fetch_out_patient_data() {
    // Collecte TOUS les champs du formulaire
    // Valide que name, doctor, date sont remplis
    // Retourne objet formaté pour backend
    
    return {
        op_name: getElementValue('o_patient-name'),
        op_phone: getElementValue('o_patient-phone'),
        patient_id: getValue('sl_patient'),
        doctor: getValue('sl_dr'),
        date: getValue('op_date'),
        // ... 10+autres champs
    }
}

fetch_patient_id() {
    // Quand utilisateur sélectionne un patient
    // Appel: ORM.call('res.partner', 'reception_op_barcode', {data})
    // Remplit AUTO: nom, DOB, groupe sang, gender
    
    await this.orm.call('res.partner', 'reception_op_barcode',[data])
        .then((result) => {
            setValue('o_patient-name', result.name);
            setValue('o_patient-dob', result.date_of_birth);
            // ...
        })
}

patient_card() {
    // Affiche/masque le dropdown patient
    // En fonction du select "Type de patient"
    
    if (selectType.value === 'dont_have_card') {
        slPatient.style.display = 'none';
    } else {
        slPatient.style.display = 'block';
    }
}

save_out_patient_data() {
    // 1. Valide via fetch_out_patient_data()
    // 2. Appel: ORM.call('res.partner', 'create_patient', [data])
    // 3. Backend crée hospital.outpatient
    // 4. Si succès: affiche alerte et vide formulaire
    
    var data = await this.fetch_out_patient_data();
    if (data != false) {
        await this.orm.call('res.partner','create_patient',[data])
            .then(function() {
                alert('Le rendez-vous a été créé avec succès');
                // Vide champs
            })
    }
}
```

#### Hospitalisation
```javascript
createInPatient() {
    // 1. Met state.current_appointment_type = 'inpatient'
    // 2. Charge patients via ORM.call('res.partner', 'fetch_patient_data', [])
    // 3. Charge médecins via ORM.call('hr.employee', 'search_read', [domain])
    // 4. Templates re-render via section "t-if == 'inpatient'"
}

fetch_in_patient_data() {
    // Collecte champs hospitalisation
    // Valide: patientId, attendingDoctorId, admissionType obligatoires
    
    return {
        patient_id: getValue('sl_patient_id'),
        attending_doctor_id: getValue('attending_doctor_id'),
        admission_type: getValue('admission_type'),
        reason_of_admission: getValue('reason_of_admission')
    }
}

save_in_patient_data() {
    // 1. Valide via fetch_in_patient_data()
    // 2. Appel: ORM.call('hospital.inpatient', 'create_new_in_patient', [null, data])
    // 3. Backend crée hospital.inpatient record
    // 4. Si succès: affiche alerte et vide formulaire
}
```

---

### Python - Backend

#### Classe ResPartner (pour OutPatient)
```python
class ResPartner(models.Model):
    _inherit = 'res.partner'

    @api.model
    def create_patient(self, data):
        """
        Crée une consultation externe
        
        Frontend envoie: {op_name, op_phone, patient_id, doctor, date, reason, ...}
        Backend:
        - Valide les données
        - Crée hospital.outpatient record
        - Retourne ID
        """
        # Création du record outpatient
        outpatient = self.env['hospital.outpatient'].create({
            'op_reference': data.get('op_name'),
            'patient_id': data.get('patient_id'),
            'doctor_id': data.get('doctor'),
            'op_date': data.get('date'),
            'reason': data.get('reason'),
            # ... autres champs
        })
        return outpatient.id

    @api.model
    def fetch_patient_data(self):
        """
        Retourne liste patients pour dropdown
        Frontend appelle: orm.call('res.partner', 'fetch_patient_data', [])
        Retourne: [{id, name, patient_seq, ...}, ...]
        """
        patients = self.search([('patient_seq', 'not in', ['New', 'Employee', 'User'])])
        return patients.read(['id', 'name', 'patient_seq', 'phone', 'email', ...])

    @api.model
    def reception_op_barcode(self, data):
        """
        Récupère patient par ID ou barcode
        Frontend appelle: orm.call('res.partner', 'reception_op_barcode', {patient_id, phone})
        Retourne: {name, date_of_birth, blood_group, gender, ...}
        """
        patient = self.browse(data.get('patient_data'))
        if patient:
            return {
                'name': patient.name,
                'date_of_birth': patient.date_of_birth,
                'blood_group': patient.blood_group,
                'gender': patient.gender,
            }
```

#### Classe HospitalInpatient (pour InPatient)
```python
class HospitalInpatient(models.Model):
    _inherit = 'hospital.inpatient'

    @api.model
    def create_new_in_patient(self, dummy, data):
        """
        Crée une hospitalisation
        
        Frontend envoie: {patient_id, attending_doctor_id, admission_type, reason_of_admission}
        Backend:
        - Valide les données
        - Crée hospital.inpatient record
        - Retourne ID
        """
        inpatient = self.create({
            'patient_id': data.get('patient_id'),
            'attending_doctor_id': data.get('attending_doctor_id'),
            'admission_type': data.get('admission_type'),
            'reason_of_admission': data.get('reason_of_admission'),
            'admission_date': fields.Date.today(),
            'state': 'admit'
        })
        return inpatient.id
```

---

## 📊 MODÈLES DE DONNÉES UTILISÉS

### Pour OutPatient (Consultation)
**Modèle:** `hospital.outpatient`

```python
Fields:
- op_reference (Char) - Identifiant RDV
- patient_id (Many2one → res.partner)
- doctor_id (Many2one → doctor.allocation)
- op_date (Date)
- reason (Text)
- state (Selection) - scheduled, done, cancelled, etc.
- slot (Float) - Heure
- op_name, op_phone, op_blood_group, op_gender, op_dob - Non-partner fields
```

### Pour InPatient (Hospitalisation)
**Modèle:** `hospital.inpatient`

```python
Fields:
- patient_id (Many2one → res.partner)
- attending_doctor_id (Many2one → hr.employee)
- room_id (Many2one → patient.room)
- ward_id (Many2one → hospital.ward)
- admission_type (Selection) - emergency, planned, transfer
- admission_date (Date)
- discharge_date (Date, optionnel)
- reason_of_admission (Text)
- state (Selection) - admit, reserve, dis
- admit_days (Integer) - Calculé
```

### Relations utilisées
```
res.partner (Patients)
    ↓ (patient_id)
    ├─ hospital.outpatient (Consultations)
    │   └─ doctor.allocation (Médecins)
    │
    └─ hospital.inpatient (Hospitalisations)
        ├─ hr.employee (Médecins traitants)
        ├─ patient.room (Chambres)
        └─ hospital.ward (Services)
```

---

## 🔄 CYCLE DE RÉACTIVITÉ

### Comment ça re-render dynamiquement?

```
1. UTILISATEUR
   ↓ (interaction: click, change, input)

2. JAVASCRIPT DÉTECTE
   ↓ (via t-on-click, t-on-change)

3. MÉTHODE JAVASCRIPT EXÉCUTÉE
   ├─ Collecte données (fetch_*_data)
   ├─ Appel RPC async (this.orm.call)
   └─ Attend réponse serveur

4. BACKEND PYTHON TRAITE
   └─ Retourne données

5. JAVASCRIPT MET À JOUR STATE
   ├─ this.state.patient_lst = result
   ├─ this.state.dr_lst = result
   └─ (Déclenche automatiquement re-render)

6. TEMPLATE QWE RE-RENDER
   ├─ Évalue conditions (t-if)
   ├─ Boucles (t-foreach)
   └─ Affiche nouveau HTML

7. CSS APPLIQUÉ
   └─ Styles finaux

8. AFFICHAGE UTILISATEUR
   └─ Voit les changements
```

---

## 🎯 CAS D'UTILISATION: RÉSERVATION COMPLÈTE

### Scénario: Créer une consultation externe

```
ÉTAPE 1: Navigation
  └─ Utilisateur clique "Rendez-vous"
     → fetchAppointmentData() exécutée
     → Affiche onglets "Consultation" et "Hospitalisation"
     → "Consultation" tab actif par défaut

ÉTAPE 2: Chargement du formulaire
  └─ createOutPatient() exécutée
     ├─ ORM.call → Récupère liste patients
     │   backend: res.partner.fetch_patient_data()
     │   retour: [{id: 1, name: "Ahmed", patient_seq: "P001"}, ...]
     │
     ├─ ORM.call → Récupère liste médecins
     │   backend: doctor.allocation.search_read()
     │   retour: [{id: 5, display_name: "Dr. Hassan"}, ...]
     │
     ├─ state.patient_lst = [{...}, ...]
     ├─ state.dr_lst = [{...}, ...]
     └─ Templates re-render
        → Dropdown patients remplis
        → Dropdown médecins remplis

ÉTAPE 3: Sélection patient
  └─ Utilisateur sélectionne "P001 - Ahmed"
     → fetch_patient_id() exécutée
     ├─ ORM.call → Récupère détails patient
     │   backend: res.partner.reception_op_barcode({patient_data: 1, phone: "..."})
     │   retour: {name: "Ahmed", date_of_birth: "1990-05-15", blood_group: "O", gender: "male"}
     │
     └─ Champs auto-remplis:
        ├─ Nom: "Ahmed"
        ├─ DOB: "1990-05-15"
        ├─ Groupe sang: "O"
        └─ Genre: "male"

ÉTAPE 4: Remplissage manuel
  └─ Utilisateur renseigne:
     ├─ Date RDV: "2026-02-17"
     ├─ Médecin: "Dr. Hassan"
     └─ Motif: "Douleur thoracique"

ÉTAPE 5: Validation et création
  └─ Utilisateur clique "Créer rendez-vous"
     ├─ save_out_patient_data() exécutée
     │
     ├─ fetch_out_patient_data() collecte:
     │  {
     │    op_name: "Ahmed",
     │    patient_id: 1,
     │    doctor: 5,
     │    date: "2026-02-17",
     │    reason: "Douleur thoracique",
     │    op_blood_group: "O",
     │    op_gender: "male",
     │    ... autres
     │  }
     │
     ├─ Validation frontend: name && doctor && date? → OK
     │
     ├─ ORM.call → Crée consultation
     │  backend: res.partner.create_patient({...data})
     │  backend: hospital.outpatient.create({...})
     │  retour: outpatient_id = 123
     │
     ├─ Alerte: "Le rendez-vous a été créé avec succès"
     │
     └─ Vide formulaire (clearField)
        ├─ Nom = ""
        ├─ Date = ""
        ├─ Médecin = selected reset
        └─ Prêt pour nouveau RDV
```

---

## 💡 POINTS CLÉS DU DYNAMISME

1. **État centralisé:** `this.state` gère tout
2. **Réactivité:** Les changements déclenchent auto le re-render
3. **RPC asynchrone:** Appels serveur sans rechargement page
4. **Dropdowns dynamiques:** Remplis par backend à l'ouverture
5. **Remplissage auto:** fetch_patient_id() récupère données
6. **Validation double:** Frontend (JS) + Backend (Python)
7. **Messages instantanés:** Alertes et confirmations
8. **Gestion erreurs:** try-catch et validation

---

## 📋 DÉPENDANCES

### JavaScript
```javascript
import { registry } from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { Component, onMounted, useState, useRef } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
```

### Python
```python
from odoo import models, api, fields
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT
```

---

## 🔗 RÉSUMÉ - CE QUI LE REND DYNAMIQUE

| Aspect | Technologie | Détail |
|--------|-------------|--------|
| **État** | OWL useState | `this.state` change → re-render auto |
| **Événements** | QWeb t-on-* | Boutons/inputs déclenchent méthodes |
| **API Backend** | ORM RPC | `this.orm.call()` → appels serveur async |
| **Données** | Models Odoo | hospital.outpatient, hospital.inpatient |
| **Dropdowns** | search_read | Chargés dynamiquement du backend |
| **Validation** | Frontend+Backend | JS puis Python |
| **Rendering** | QWeb templates | t-if, t-foreach, t-esc |
| **Styles** | CSS dynamique | Classes appliquées dynamiquement |

---

**Créé:** 16 février 2026  
**Module:** base_hospital_management (Patient Booking)  
**Documentation:** Complète et opérationnelle ✅
