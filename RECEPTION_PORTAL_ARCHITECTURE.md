# Architecture et Diagrammes - Portail de Réception

## 1. Diagramme d'architecture générale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PORTAIL DE RÉCEPTION                         │
│                      (Composant Odoo OWL)                           │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │   FRONTEND (Browser)     │
                    └──────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐
   │ reception_     │  │ reception_   │  │ reception_       │
   │ dashboard.js   │  │ dashboard_   │  │ dashboard.css    │
   │                │  │ templates.   │  │                  │
   │ Méthodes:      │  │ xml          │  │ Variables:       │
   │ • Navigation   │  │              │  │ • Couleurs       │
   │ • Fetch data   │  │ Structure:   │  │ • Espacements    │
   │ • ORM calls    │  │ • Patient    │  │ • Polices        │
   │ • Validation   │  │ • Appts      │  │ • Responsive     │
   │ • State mgmt   │  │ • Rooms      │  │                  │
   └────────────────┘  └──────────────┘  └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                         ORM RPC Calls
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
   ┌──────────────────────┐            ┌──────────────────────┐
   │  BACKEND (Server)    │            │  DATABASE (Records)  │
   └──────────────────────┘            └──────────────────────┘
        │
   ┌────────────────────────────────────────────────────────┐
   │  reception_dashboard_methods.py                        │
   │  (Python Models)                                       │
   │                                                        │
   │  Classes héritées:                                     │
   │  • ResPartner                                          │
   │  • HospitalOutpatient                                  │
   │  • HospitalInpatient                                   │
   │  • PatientRoom                                         │
   │  • HospitalWard                                        │
   │  • DoctorAllocation                                    │
   │                                                        │
   │  Méthodes:                                             │
   │  • get_*_statistics()                                  │
   │  • get_*_data()                                        │
   │  • search/create/read                                  │
   └────────────────────────────────────────────────────────┘
        │
   ┌────────────────────────────────────────────────────────┐
   │  Odoo Database Models                                  │
   │                                                        │
   │  • res.partner (Patients)                              │
   │  • hospital.outpatient (Consultations)                 │
   │  • hospital.inpatient (Hospitalisations)               │
   │  • patient.room (Chambres)                             │
   │  • hospital.ward (Services)                            │
   │  • doctor.allocation (Disponibilité médecins)          │
   │  • hr.employee (Médecins)                              │
   └────────────────────────────────────────────────────────┘
```

---

## 2. Flux d'interaction utilisateur

```
                      ┌──────────────────┐
                      │  UTILISATEUR      │
                      └────────┬──────────┘
                               │
                     Click Bouton / Input Change
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐          ┌────────▼───────┐
        │ NAVIGATION     │          │ FORM INPUT     │
        │ BUTTONS        │          │ ELEMENTS       │
        └───────┬────────┘          └────────┬───────┘
                │                             │
        createPatient()          fetch_patient_data()
        fetchAppointmentData()   fetch_patient_id()
        fetchRoomWard()          patient_card()
                │                             │
                └──────────────┬──────────────┘
                               │
                    ┌──────────▼─────────┐
                    │  this.state        │
                    │  UPDATE            │
                    │  Déclenche         │
                    │  re-render         │
                    └──────────┬─────────┘
                               │
                    ┌──────────▼──────────┐
                    │  TEMPLATE RE-RENDER │
                    │  (t-if conditions)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  HTML UPDATES       │
                    │  CSS APPLIED        │
                    └─────────────────────┘
```

---

## 3. Cycle de vie d'une opération (exemple: créer patient)

```
ÉTAPE 1: INITIALISATION
    ├─ setup()
    ├─ onMounted()
    └─ createPatient() [affiche formulaire]

ÉTAPE 2: SAISIE UTILISATEUR
    ├─ Remplit champs
    └─ Click "Enregistrer"

ÉTAPE 3: VALIDATION & COLLECTE
    ├─ savePatient()
    │  └─ fetch_patient_data()
    │     └─ Collect: name, phone, DOB, blood_group, etc
    │        └─ Retour: {name: "...", phone: "..."}
    │
    └─ Validation
       ├─ name !== "" ?
       └─ phone !== "" ?
          └─ OK: Procéder
             KO: Alert "Veuillez remplir..."

ÉTAPE 4: APPEL BACKEND
    ├─ this.orm.call('res.partner', 'create', [data])
    │
    └─ Serveur Odoo
       ├─ ResPartner.create(data)
       ├─ Valide données
       ├─ Crée record DB
       └─ Retour: patient_id (int)

ÉTAPE 5: RÉPONSE FRONTEND
    ├─ Alert "Le dossier patient a été créé"
    ├─ Vide formulaire (clearField)
    └─ window.location.reload()
       └─ Page se recharge

SUCCESS! Nouveau patient en DB
```

---

## 4. Structure des composants OWL

```
ReceptionDashBoard (Component OWL)
│
├─ Props/Data
│  ├─ this.state = useState({...})
│  │  ├─ patient_lst
│  │  ├─ ward_data
│  │  ├─ room_data
│  │  ├─ dr_lst
│  │  ├─ currentDate
│  │  ├─ current_appointment_type
│  │  └─ current_room_ward_type
│  │
│  ├─ this.ref = useRef('root')
│  ├─ this.patient_creation = useRef('...')
│  ├─ this.appointments_section = useRef('...')
│  ├─ this.room_ward = useRef('...')
│  │
│  ├─ this.orm = useService('orm')
│  └─ this.action = useService('action')
│
├─ Méthodes de Navigation
│  ├─ createPatient()
│  ├─ fetchAppointmentData()
│  └─ fetchRoomWard()
│
├─ Méthodes Patient
│  ├─ fetch_patient_data()
│  └─ savePatient()
│
├─ Méthodes OutPatient
│  ├─ createOutPatient()
│  ├─ fetch_out_patient_data()
│  ├─ fetch_patient_id()
│  ├─ patient_card()
│  └─ save_out_patient_data()
│
├─ Méthodes InPatient
│  ├─ createInPatient()
│  ├─ fetch_in_patient_data()
│  └─ save_in_patient_data()
│
└─ Méthodes Chambres/Services
   ├─ fetchWard()
   └─ fetchRoom()
```

---

## 5. Modèle de données - Structure relationnelle

```
┌─────────────────────────────────────────────────────────────┐
│                    RES.PARTNER (Patients)                   │
├─────────────────────────────────────────────────────────────┤
│ • id (PK)                                                   │
│ • name                                                      │
│ • patient_seq (séquence unique)                             │
│ • phone                                                     │
│ • email                                                     │
│ • date_of_birth                                             │
│ • blood_group (A, B, AB, O)                                 │
│ • rh_type (+, -)                                            │
│ • gender (male, female, other)                              │
│ • marital_status                                            │
│ • image_1920 (photo)                                        │
└─────────────────────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌──────────────────┐  ┌──────────────────┐
│  OUTPATIENT      │  │  INPATIENT       │
│  (Consultations) │  │  (Hospitalisés)  │
├──────────────────┤  ├──────────────────┤
│ • patient_id FK  │  │ • patient_id FK  │
│ • op_reference   │  │ • room_id FK     │
│ • op_date        │  │ • ward_id FK     │
│ • doctor_id FK   │  │ • admit_date     │
│ • reason         │  │ • discharge_date │
│ • state          │  │ • state          │
│ • slot (time)    │  │ • admit_days     │
└──────────────────┘  └──────────────────┘
                           │
                ┌──────────┴─────────┐
                │                    │
                ▼                    ▼
           ┌─────────┐          ┌────────┐
           │  WARD   │          │  ROOM  │
           │(Services)          │(Chamb.)│
           ├─────────┤          ├────────┤
           │ • ward_ │          │ • name │
           │   no    │          │ • state│
           │ • bed_  │          │ • rent │
           │   count │          │ • floor│
           │ • nurse │          │ • type │
           │   _ids  │          │ • bldg │
           └─────────┘          └────────┘
                │                    │
                ├────────┬───────────┘
                │        │
                ▼        ▼
         ┌──────────────────────┐
         │  DOCTOR.ALLOCATION   │
         │  (Dispo médecins)    │
         ├──────────────────────┤
         │ • doctor_id FK       │
         │ • date               │
         │ • work_from (float)  │
         │ • work_to (float)    │
         │ • patient_limit      │
         │ • slot_remaining     │
         └──────────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  HR.EMPLOYEE     │
         │  (Médecins)      │
         ├──────────────────┤
         │ • name           │
         │ • job_id         │
         │ • doctor_id FK   │
         └──────────────────┘
```

---

## 6. Arbre des templates XML

```
ReceptionDashboard (Template principale)
│
└─ <div class="r_Container">
   │
   ├─ <div class="r_dashButtonContainer">
   │  ├─ <button class="r_dashButton ... o_patient_button">
   │  ├─ <button class="r_dashButton ... o_appointment_button">
   │  └─ <button class="r_dashButton ... o_room_ward_button">
   │
   └─ <div id="view_main">
      │
      ├─ <div class="r_View" t-ref="patient_creation">
      │  └─ Formulaire enregistrement patient
      │
      ├─ <div class="r_View d-none" t-ref="appointments_section">
      │  ├─ Navigation onglets
      │  ├─ Formulaire OutPatient (t-if === 'outpatient')
      │  └─ Formulaire InPatient (t-if === 'inpatient')
      │
      └─ <div class="r_View d-none" t-ref="room_ward">
         ├─ Navigation onglets
         ├─ Tableau Wards (t-if === 'ward')
         │  └─ t-foreach state.ward_data
         └─ Tableau Rooms (t-if === 'room')
            └─ t-foreach state.room_data
```

---

## 7. Cycle de vie des états (State Machine)

```
INITIAL STATE:
{
  patient_lst: [],
  ward_data: [],
  room_data: [],
  dr_lst: [],
  currentDate: TODAY,
  current_appointment_type: 'outpatient',
  current_room_ward_type: 'ward'
}

TRANSITIONS:

                    ┌─────────────────────────────────┐
                    │   PATIENT SECTION ACTIVE        │
                    │   (Formulaire patient visible)  │
                    └──────────────┬──────────────────┘
                                   │
                    Click "Enregistrer"
                                   ▼
                    state.patient_lst = []
                    ← ORM.call fetch_patient_data

                    ┌─────────────────────────────────┐
                    │   APPOINTMENT SECTION ACTIVE    │
                    │   (Formulaire RDV visible)      │
                    └──────────────┬──────────────────┘
                                   │
                    (2 branches: OutPatient / InPatient)
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              OutPatient                     InPatient
            Click "Consultation"         Click "Hospitalisation"
                    │                             │
                    ▼                             ▼
  state.current_appointment_type  state.current_appointment_type
                = 'outpatient'                = 'inpatient'
                    │                             │
          state.patient_lst ←                 state.patient_lst ←
          ORM fetch_patient_data()            ORM fetch_patient_data()
                    │                             │
          state.dr_lst ←                   state.dr_lst ←
          ORM search_read() ..doctor        ORM hr.employee search
                    │                             │
          Template re-render               Template re-render
          Affiche formulaire               Affiche formulaire

                    ┌─────────────────────────────────┐
                    │   ROOM/WARD SECTION ACTIVE      │
                    │   (Tableaux chambres visible)   │
                    └──────────────┬──────────────────┘
                                   │
                    (2 branches: Ward / Room)
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                  Ward                          Room
              Click "Services"             Click "Chambres"
                    │                             │
                    ▼                             ▼
  state.current_room_ward_type      state.current_room_ward_type
              = 'ward'                        = 'room'
                    │                             │
          state.ward_data ←              state.room_data ←
          ORM search_read()              ORM search_read()
                    │                             │
          Template re-render               Template re-render
          Affiche tableau wards            Affiche tableau rooms
```

---

## 8. Appels RPC (Requêtes serveur)

```
CLIENT                                  SERVER
═════════════════════════════════════════════════════════════

1. FETCH PATIENT LIST
   orm.call('res.partner',
            'fetch_patient_data',
            [])
                    ─────────────────→  res.partner.search
                                        retourne [{...}, ...]
                    ←───────────────────


2. CREATE NEW PATIENT
   orm.call('res.partner',
            'create',
            [{name, phone, ...}])
                    ─────────────────→  res.partner.create({...})
                                        crée record DB
                                        retourne ID
                    ←───────────────────


3. GET PATIENT DETAILS (Barcode)
   orm.call('res.partner',
            'reception_op_barcode',
            [{patient_data, phone}])
                    ─────────────────→  res.partner.reception_op_barcode()
                                        recherche patient
                                        retourne {name, DOB, blood, ...}
                    ←───────────────────


4. CREATE OUTPATIENT APPOINTMENT
   orm.call('res.partner',
            'create_patient',
            [{op_name, doctor, date,...}])
                    ─────────────────→  res.partner.create_patient()
                                        crée hospital.outpatient
                                        retourne ID
                    ←───────────────────


5. FETCH DOCTORS
   orm.call('doctor.allocation',
            'search_read',
            [])
                    ─────────────────→  doctor.allocation.search_read()
                                        retourne [{...}, ...]
                    ←───────────────────


6. CREATE INPATIENT ADMISSION
   orm.call('hospital.inpatient',
            'create_new_in_patient',
            [null, {patient_id, ...}])
                    ─────────────────→  hospital.inpatient.create()
                                        crée record inpatient
                                        retourne ID
                    ←───────────────────


7. FETCH WARDS
   orm.call('hospital.ward',
            'search_read',
            [])
                    ─────────────────→  hospital.ward.search_read()
                                        retourne [{...}, ...]
                    ←───────────────────


8. FETCH ROOMS
   orm.call('patient.room',
            'search_read',
            [])
                    ─────────────────→  patient.room.search_read()
                                        retourne [{...}, ...]
                    ←───────────────────


9. FETCH HR EMPLOYEES (Doctors)
   orm.call('hr.employee',
            'search_read',
            [['job_id.name','=','Doctor']])
                    ─────────────────→  hr.employee.search_read()
                                        filter Doctors only
                                        retourne [{...}, ...]
                    ←───────────────────
```

---

## 9. États de chambres (Room States)

```
STATES:
├─ 'avail'      → Disponible (Vert) ✓
├─ 'reserve'    → Réservée   (Orange) ⚠
└─ Autre        → Occupée    (Rouge) ✗

AFFICHAGE DANS TEMPLATE:
    <t t-if="room.state == 'avail'">
        <span class="badge badge-success">Disponible</span>
    </t>
    <t t-elif="room.state == 'reserve'">
        <span class="badge badge-warning">Réservée</span>
    </t>
    <t t-else="">
        <span class="badge badge-danger">Occupée</span>
    </t>
```

---

## 10. Dépendances et imports

### JavaScript Imports
```javascript
import { registry } from '@web/core/registry';       // Enregistre le composant
import { useService } from "@web/core/utils/hooks"; // Services Odoo
import { Component, onMounted, useState, useRef } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";    // Traduction i18n
```

### Python Imports
```python
from odoo import models, api, fields
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT

# Constantes utilisées:
# DEFAULT_SERVER_DATE_FORMAT = '%Y-%m-%d' (YYYY-MM-DD)
```

---

## 11. Erreurs courantes et dépannage

```
ERREUR                              CAUSE                   SOLUTION
═══════════════════════════════════════════════════════════════════════════

Template not found                 Chemin XML        Vérifier chemin et
                                   incorrect         syntax XML

State not updating UI              Modification     Utilisez
                                   state direct      this.state.xxx = yyy;
                                                     (pas direct, utilisez
                                                      property)

ORM call fails                     Mauvais modèle    Vérifier nom module
                                   ou méthode        et _inherit correct

Dropdown vide                      État non chargé   Vérifier ORM.call
                                                     dans createOutPatient()

Formulaire ne valide pas           Validation JS     Vérifier fetch_*_data()
                                   manquante         retourne bonnes clés

CSS non appliquée                  Classe CSS        Vérifier class name
                                   manquante         dans template

```

---

## Document généré automatiquement
Version: 1.0
Date: 2026-02-16
Portail: base_hospital_management/reception_portal
