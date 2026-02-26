# Documentation du Portail de Réception Hospitalière (Reception Portal)

## Vue d'ensemble

Le portail de réception est une interface interactive complète pour gérer l'enregistrement des patients, les rendez-vous (consultations et hospitalisations) et la disponibilité des chambres et services. C'est un composant Odoo moderne utilisant OWL (Odoo Web Library) avec un design responsive et professionnel.

**Localisation du module:** `addons/base_hospital_management/`

---

## 1. Architecture générale

### Structure hiérarchique

```
reception_portal/
├── Frontend (Client-side)
│   ├── JavaScript/OWL Component (reception_dashboard.js)
│   ├── Templates XML (reception_dashboard_templates.xml)
│   └── Styles CSS (reception_dashboard.css)
└── Backend (Serveur-side)
    └── Python Models & Methods (reception_dashboard_methods.py)
```

### Flow d'exécution

1. **Initialisation** → Composant OWL charge les templates et initialise l'état
2. **Interaction utilisateur** → Événements click/change déclenchent les méthodes JS
3. **Appels backend** → ORM appelle les méthodes Python via RPC
4. **Mise à jour UI** → Les données retournées mettent à jour l'état et le template re-render
5. **Affichage** → CSS applique les styles finaux

---

## 2. Fichiers constitutifs

### 2.1 Backend: `reception_dashboard_methods.py`

**Localisation:** `addons/base_hospital_management/models/reception_dashboard_methods.py`

**Description:** Contient les méthodes Python qui gèrent la logique métier du portail côté serveur.

#### Classes et héritage:

| Classe | Héritage | Rôle |
|--------|----------|------|
| `ResPartner` | `res.partner` | Gestion des patients/partenaires |
| `HospitalOutpatient` | `hospital.outpatient` | Gestion des consultations externes |
| `HospitalInpatient` | `hospital.inpatient` | Gestion des hospitalisations |
| `PatientRoom` | `patient.room` | Gestion des chambres |
| `HospitalWard` | `hospital.ward` | Gestion des services/wards |
| `DoctorAllocation` | `doctor.allocation` | Gestion de la disponibilité des médecins |

---

### 2.2 Frontend JS: `reception_dashboard.js`

**Localisation:** `addons/base_hospital_management/static/src/js/reception_dashboard.js`

**Description:** Composant OWL principal qui gère l'interaction utilisateur et l'orchestration du portail.

**Class principale:** `ReceptionDashBoard(Component)`

#### Organisation du composant:

- **Setup:** Initialise les références DOM, les services Odoo (ORM, action), et l'état global
- **État initial (`this.state`)**: Contient les données dynamiques du portail
- **Méthodes de navigation:** Gèrent la commutation entre les 3 sections principales
- **Méthodes de données:** Récupèrent et traitent les données des formulaires
- **Méthodes d'API:** Appellent les backend via ORM

---

### 2.3 Templates: `reception_dashboard_templates.xml`

**Localisation:** `addons/base_hospital_management/static/src/xml/reception_dashboard_templates.xml`

**Description:** Défie la structure HTML du portail en utilisant la syntaxe QWeb d'Odoo.

#### Structure générale:

```xml
<t t-name="ReceptionDashboard">
  <div class="r_Container">
    <!-- Navigation principale -->
    <div class="r_dashButtonContainer">
      <!-- Patients, Rendez-vous, Chambres/Services -->
    </div>
    
    <!-- Zone de contenu principal -->
    <div id="view_main">
      <!-- Section 1: Enregistrement Patient -->
      <!-- Section 2: Gestion Rendez-vous (Externe/Interne) -->
      <!-- Section 3: Gestion Chambres/Services -->
    </div>
  </div>
</t>
```

#### Sections principales:

1. **Navigation principale** (`r_dashButtonContainer`)
   - Bouton Patient → `createPatient()`
   - Bouton Rendez-vous → `fetchAppointmentData()`
   - Bouton Chambres/Services → `fetchRoomWard()`

2. **Section Patients** (`patient_creation`)
   - Formulaire d'enregistrement patient
   - Champs: nom, téléphone, groupe sanguin, RH, genre, date de naissance, email, photo

3. **Section Rendez-vous** (`appointments_section`)
   - Onglet Consultation externe (outpatient)
   - Onglet Hospitalisation (inpatient)
   - Formulaires dynamiques basés sur l'état

4. **Section Chambres/Services** (`room_ward`)
   - Onglet Services (wards)
   - Onglet Chambres (rooms)
   - Tableaux affichant les données dynamiques

---

### 2.4 Styles: `reception_dashboard.css`

**Localisation:** `addons/base_hospital_management/static/src/css/reception_dashboard.css`

**Variables CSS principales:**

```css
--primary-color: #017E84;        /* Teal - Couleur primaire */
--secondary-color: #00A09D;      /* Secondaire */
--accent-color: #875A7B;         /* Accent/Violet */
--success-color: #28a745;        /* Vert */
--warning-color: #ffc107;        /* Jaune */
--danger-color: #dc3545;         /* Rouge */
```

**Classes CSS importantes:**

| Classe | Use |
|--------|-----|
| `.r_Container` | Conteneur principal |
| `.r_dashButton` | Boutons de navigation principale |
| `.r_active` | État actif des boutons |
| `.form-section` | Conteneurs de formulaires |
| `.hsp_table` | Style des tableaux |
| `.data-table` | Style des tableaux de données |
| `.badge` | Badges de statut |

---

## 3. Méthodes dynamiques - Détail complet

### 3.1 Méthodes JavaScript (Reception Dashboard Component)

#### A. INITIALISATION

##### `setup()`
```javascript
/**
 * Initialise le composant OWL
 * - Configure les références DOM (useRef)
 * - Initialise les services (ORM, action)
 * - Crée l'état global (useState)
 * - Lance la première action au montage (onMounted)
 */

État initial:
- patient_lst: [] → Liste des patients
- ward_data: [] → Données des services
- room_data: [] → Données des chambres
- dr_lst: [] → Liste des médecins
- currentDate: Date du jour au format YYYY-MM-DD
- current_appointment_type: 'outpatient' | 'inpatient'
- current_room_ward_type: 'ward' | 'room'
```

---

#### B. NAVIGATION PRINCIPALE

##### `createPatient()`
**Déclencheur:** Click sur bouton "Patient"
```javascript
/**
 * Affiche la section d'enregistrement patient
 * - Masque les autres sections
 * - Active le bouton Patient
 * - Affiche la div patient_creation
 */
```

##### `fetchAppointmentData()`
**Déclencheur:** Click sur bouton "Rendez-vous"
```javascript
/**
 * Affiche la section rendez-vous
 * - Masque les autres sections
 * - Active le bouton Rendez-vous
 * - Appelle createOutPatient() par défaut
 */
```

##### `fetchRoomWard()`
**Déclencheur:** Click sur bouton "Chambres/Services"
```javascript
/**
 * Affiche la section chambres/services
 * - Masque les autres sections
 * - Active le bouton Chambres/Services
 * - Appelle fetchWard() par défaut
 */
```

---

#### C. GESTION DES PATIENTS

##### `fetch_patient_data()`
**Retour:** Objet avec données patient brutes du formulaire
```javascript
Retourne: {
    name: string,
    blood_group: string,
    rh_type: '+' | '-',
    gender: 'male' | 'female' | 'other',
    marital_status: string,
    phone: string,
    email: string,
    date_of_birth: date (optionnel),
    image_1920: base64 (optionnel)
}
```

##### `savePatient()`
**Déclencheur:** Click sur "Enregistrer" patient
```javascript
/**
 * Valide et chauffe un patient
 * 1. Récupère les données via fetch_patient_data()
 * 2. Valide: nom et téléphone obligatoires
 * 3. Appel ORM: res.partner.create(data)
 * 4. Affiche alerte de succès et recharge la page
 */
```

---

#### D. CONSULTATIONS EXTERNES (OUTPATIENT)

##### `createOutPatient()`
**Déclencheur:** Click sur "Consultation (Externe)"
```javascript
/**
 * Affiche le formulaire de consultation externe
 * 1. Met state.current_appointment_type = 'outpatient'
 * 2. Charge les données:
 *    - ORM: res.partner.fetch_patient_data() → patient_lst
 *    - ORM: doctor.allocation.search_read() → dr_lst
 * 3. Remplit le dropdown des médecins
 * 4. Initialise op_date avec la date du jour
 */
```

##### `patient_card()`
**Déclencheur:** Change du select "Type de patient"
```javascript
/**
 * Affiche/Masque le dropdown de sélection patient
 * - Si 'have_card' → Affiche le dropdown
 * - Si 'dont_have_card' → Masque le dropdown
 */
```

##### `fetch_patient_id()`
**Déclencheur:** Change du select patient
```javascript
/**
 * Récupère et remplie les détails patient
 * 1. Récupère patient_id et phone
 * 2. Appel ORM: res.partner.reception_op_barcode(data)
 * 3. Remplit les champs: nom, DOB, groupe sanguin, gender
 */
```

##### `fetch_out_patient_data()`
**Retour:** Objet formaté pour création consultation
```javascript
Retourne: {
    op_name: string,
    op_phone: string,
    op_blood_group: string,
    op_rh: '+' | '-',
    op_gender: 'male' | 'female',
    patient_id: integer,
    date: date (YYYY-MM-DD),
    reason: string,
    slot: 0.00,
    doctor: integer,
    op_dob: date (optionnel)
}

Validation: nom, médecin, date obligatoires
```

##### `save_out_patient_data()`
**Déclencheur:** Click sur "Créer rendez-vous"
```javascript
/**
 * Crée une consultation externe
 * 1. Valide les données via fetch_out_patient_data()
 * 2. Appel ORM: res.partner.create_patient(data)
 * 3. Si succès: Affiche alerte et vide les champs
 */
```

---

#### E. HOSPITALISATIONS (INPATIENT)

##### `createInPatient()`
**Déclencheur:** Click sur "Hospitalisation (Interne)"
```javascript
/**
 * Affiche le formulaire d'hospitalisation
 * 1. Met state.current_appointment_type = 'inpatient'
 * 2. Charge les données:
 *    - ORM: res.partner.fetch_patient_data() → patient_lst
 *    - ORM: hr.employee.search_read([['job_id.name','=','Doctor']]) → doctor_lst
 * 3. Remplit les dropdowns patient et médecin
 */
```

##### `fetch_in_patient_data()`
**Retour:** Objet formaté pour création hospitalisation
```javascript
Retourne: {
    patient_id: integer,
    reason_of_admission: string,
    admission_type: 'emergency' | 'planned' | 'transfer',
    attending_doctor_id: integer
}

Validation: patient, médecin, type admission obligatoires
```

##### `save_in_patient_data()`
**Déclencheur:** Click sur "Créer admission"
```javascript
/**
 * Crée une hospitalisation
 * 1. Valide les données via fetch_in_patient_data()
 * 2. Appel ORM: hospital.inpatient.create_new_in_patient(data)
 * 3. Si succès: Affiche alerte et vide les champs
 */
```

---

#### F. GESTION CHAMBRES/SERVICES

##### `fetchWard()`
**Déclencheur:** Click sur "Services"
```javascript
/**
 * Affiche la liste des services
 * 1. Met state.current_room_ward_type = 'ward'
 * 2. Appel ORM: hospital.ward.search_read([])
 * 3. Remplit state.ward_data
 * 4. Template affiche tableau avec colonnes:
 *    - Numéro, Bâtiment, Étage, Nombre lits, Statut
 */
```

##### `fetchRoom()`
**Déclencheur:** Click sur "Chambres"
```javascript
/**
 * Affiche la liste des chambres
 * 1. Met state.current_room_ward_type = 'room'
 * 2. Appel ORM: patient.room.search_read([])
 * 3. Remplit state.room_data
 * 4. Template affiche tableau avec colonnes:
 *    - Chambre, Bâtiment, Étage, Type lit, Prix/jour, Statut
 *     Statut code par couleur (badge):
 *       - 'avail' → Vert (Disponible)
 *       - 'reserve' → Orange (Réservée)
 *       - autre → Rouge (Occupée)
 */
```

---

### 3.2 Méthodes Python (Backend Models)

#### A. CLASSE: ResPartner (Patients)

##### `get_reception_statistics()` 
**Décorateur:** `@api.model`
**Retour:** Dict avec KPIs du portail
```python
Retourne: {
    'total_patients': int,              # Nombre total de patients (hors New/Employee/User)
    'appointments_today': int,          # Rendez-vous d'aujourd'hui
    'appointments_trend': float,        # Variation % par rapport à hier
    'active_inpatients': int,           # Hospitalisés actuels (état: admit, reserve)
    'rooms_available': int,             # Chambres disponibles
    'wards_available': int,             # Services disponibles
    'new_patients_today': int           # Nouveaux patients créés aujourd'hui
}

Logique:
- Filtre les patients par date/état
- Calcule tendance: ((today - yesterday) / yesterday) * 100
- Compte les ressources disponibles
```

##### `get_reception_charts_data()`
**Décorateur:** `@api.model`
**Retour:** Dict avec données pour les graphiques
```python
Retourne: {
    'daily_appointments': [             # Rendez-vous derniers 7 jours
        {'date': '01/02', 'count': 5},
        ...
    ],
    'room_status': {                    # Statut détaillé des chambres
        'available': int,
        'reserved': int,
        'unavailable': int
    },
    'inpatient_status': {               # Statut hospitalisés
        'admitted': int,
        'reserved': int,
        'discharged': int
    },
    'appointments_by_doctor': [         # Top 5 médecins
        {'doctor': 'Dr. X', 'count': 12},
        ...
    ]
}

Logique:
- read_group pour agrégation par date/médecin
- Formate les dates en JJ/MM
- Tronque les noms médecins (20 car max)
```

#### B. CLASSE: HospitalOutpatient (Consultations)

##### `get_appointments_today()`
**Décorateur:** `@api.model`
**Retour:** Liste des consultations du jour
```python
Retourne: [{
    'id': int,
    'op_reference': string,             # Identifiant unique RDV
    'patient_name': string,
    'patient_seq': string,              # Numéro séquence patient
    'doctor_name': string,              # Médecin assigné
    'time_slot': float,                 # Heure du RDV
    'reason': string,                   # Motif consultation
    'state': string                     # État (scheduled, done, cancelled, etc)
}, ...]

Filtre: date = aujourd'hui
```

#### C. CLASSE: HospitalInpatient (Hospitalisations)

##### `get_active_inpatients()`
**Décorateur:** `@api.model`
**Retour:** Liste des patients hospitalisés actifs
```python
Retourne: [{
    'id': int,
    'name': string,
    'patient_name': string,             # Nom du patient
    'patient_seq': string,              # Numéro séquentiel
    'room_id': string,                  # Chambre assignée
    'ward_id': string,                  # Service assigné
    'admit_days': int,                  # Jours depuis admission
    'state': string                     # État (admit, reserve, discharge, etc)
}, ...]

Filtre: state IN ('admit', 'reserve')
```

#### D. CLASSE: PatientRoom (Chambres)

##### `get_room_status()`
**Décorateur:** `@api.model`
**Retour:** Dict trié par statut
```python
Retourne: {
    'available': [{
        'id': int,
        'name': string,                 # "Chambre 101"
        'building': string,             # Bâtiment
        'floor': int,
        'bed_type': string,             # 'Standard', 'Deluxe', etc
        'rent': float,                  # Prix/jour MAD
        'state': 'avail'
    }, ...],
    'reserved': [...],                  # same structure, state='reserve'
    'unavailable': [...]                # same structure, state != 'avail'/'reserve'
}

Logique:
- Recherche toutes les chambres
- Trie par état
- Formatte les informations détaillées
```

##### `get_available_rooms()`
**Décorateur:** `@api.model`
**Retour:** Liste des chambres disponibles
```python
Retourne: [{
    'id': int,
    'name': string,
    'building': string,
    'floor': int,
    'bed_type': string,
    'rent': float
}, ...]

Filtre: state = 'avail'
Utile pour: forms de sélection chambre lors hospitalisation
```

#### E. CLASSE: HospitalWard (Services)

##### `get_ward_status()`
**Décorateur:** `@api.model`
**Retour:** Liste détaillée des services
```python
Retourne: [{
    'id': int,
    'ward_no': string,                  # Numéro du service
    'building': string,
    'floor': int,
    'total_beds': int,                  # Capacité totale
    'nurses': [                         # Liste infirmiers
        'Infirmier 1',
        'Infirmier 2',
        ...
    ]
}, ...]
```

##### `get_available_wards()`
**Décorateur:** `@api.model`
**Retour:** Services avec lits disponibles
```python
Retourne: [{
    'id': int,
    'ward_no': string,
    'building': string,
    'floor': int,
    'available_beds': int,
    'total_beds': int
}, ...]

Logique:
- Compte lits disponibles (state != 'occupied')
- Retourne seulement les services avec available_beds > 0
```

#### F. CLASSE: DoctorAllocation (Disponibilité Médecins)

##### `get_available_doctors()`
**Décorateur:** `@api.model`
**Retour:** Médecins disponibles actuellement
```python
Retourne: [{
    'id': int,
    'doctor_name': string,
    'work_from': '09:00',               # Heure début (formatée HH:MM)
    'work_to': '17:30',                 # Heure fin
    'available_slots': int,             # Créneaux libres restants
    'total_slots': int                  # Capacité totale
}, ...]

Logique:
- Filtre allocations d'aujourd'hui
- Vérifie si médecin est dans ses heures (work_from <= now <= work_to)
- Retourne 0 slot si hors heures
- Inclut seulement si available_slots > 0

Helper: _format_float_time(9.5) → "09:30"
```

---

## 4. Flow de données - Exemples concrets

### 4.1 Enregistrement d'un patient

```
FRONTEND                                BACKEND
=============================================================

Utilisateur remplit formulaire patient
        ↓
Click "Enregistrer"
        ↓
savePatient()
        ↓
fetch_patient_data() → {name, phone, ...}
        ↓
Validation (name & phone requis)
        ↓
ORM.call('res.partner', 'create', [data])
                                            →  ResPartner.create(data)
                                            ← ID du nouveau patient
Alerte "Créé avec succès"
        ↓
window.location.reload()
```

### 4.2 Création d'un rendez-vous externe

```
FRONTEND                                BACKEND
========================================================================================

Click "Rendez-vous"
        ↓
fetchAppointmentData()
        ↓
createOutPatient()
        ↓
ORM.call('res.partner', 'fetch_patient_data', [])  →  Charge liste patients
        ↓
ORM.call('doctor.allocation', 'search_read', [])   →  Charge liste médecins
        ↓
Remplit dropdowns patients/médecins
        ↓
Utilisateur sélectionne patient
        ↓
fetch_patient_id()
        ↓
ORM.call('res.partner', 'reception_op_barcode', {patient_id, phone})
                                            →  Récupère données patient
        ↓
Remplit champs patient (automatique)
        ↓
Utilisateur renseigne: date, médecin, motif
        ↓
Click "Créer rendez-vous"
        ↓
save_out_patient_data()
        ↓
fetch_out_patient_data()
        ↓
ORM.call('res.partner', 'create_patient', [data])
                                            →  Crée consultation externe
        ↓
Alerte "Rendez-vous créé"
        ↓
Vide formulaire
```

### 4.3 Affichage de la liste des chambres

```
FRONTEND                                BACKEND
========================================================

Click "Chambres/Services"
        ↓
fetchRoomWard()
        ↓
Click "Chambres" (ou rechargement)
        ↓
fetchRoom()
        ↓
state.current_room_ward_type = 'room'
        ↓
ORM.call('patient.room', 'search_read', [])
                                    →  PatientRoom.search_read([])
                                    ← Toutes les chambres avec champs
        ↓
state.room_data = result
        ↓
Template re-render (t-if="...=='room'")
        ↓
Boucle t-foreach sur state.room_data
        ↓
Affiche tableau: Nom, Bâtiment, Étage, Type, Prix, Statut (badge couleur)
```

---

## 5. États et transitions

### 5.1 États du composant (this.state)

```javascript
{
    patient_lst: [],                    // [{ id, name, patient_seq, ... }, ...]
    ward_data: [],                      // [{ id, ward_no, building_id, ... }, ...]
    room_data: [],                      // [{ id, name, state, rent, ... }, ...]
    dr_lst: [],                         // [{ id, display_name, ... }, ...]
    currentDate: "2026-02-16",
    current_appointment_type: 'outpatient' | 'inpatient',
    current_room_ward_type: 'ward' | 'room'
}
```

### 5.2 Transitions d'état

```
current_appointment_type:
  'outpatient' ←→ 'inpatient'
  (Déclenche re-render template)

current_room_ward_type:
  'ward' ←→ 'room'
  (Déclenche re-render tableau)
```

---

## 6. Points d'intégration API

### 6.1 Appels ORM depuis le frontend

| Modèle | Méthode | Arguments | Retour |
|--------|---------|-----------|--------|
| `res.partner` | `fetch_patient_data` | `[]` | `[{id, name, patient_seq, ...}]` |
| `res.partner` | `create` | `[{nom, phone, ...}]` | `int (ID)` |
| `res.partner` | `create_patient` | `[{op_name, doctor, ...}]` | `int (ID)` |
| `res.partner` | `reception_op_barcode` | `[{patient_data, phone}]` | `{name, date_of_birth, ...}` |
| `doctor.allocation` | `search_read` | `[]` | `[{id, display_name, ...}]` |
| `hospital.outpatient` | search_read | `[]` | `[{op_reference, patient_id, ...}]` |
| `hospital.inpatient` | `create_new_in_patient` | `[null, {patient_id, ...}]` | `int (ID)` |
| `hospital.ward` | `search_read` | `[]` | `[{ward_no, bed_count, ...}]` |
| `patient.room` | `search_read` | `[]` | `[{name, state, rent, ...}]` |
| `hr.employee` | `search_read` | `[['job_id.name','=','Doctor']]` | `[{id, display_name, ...}]` |

---

## 7. Configurations et constantes

### 7.1 Classes CSS principales pour le design

```css
/* Conteneurs */
.r_Container              /* Conteneur principal */
.r_dashButtonContainer    /* Navigation top */
.r_View                   /* Section de contenu */

/* Formulaires */
.form-section            /* Bloc formulaire */
.form-group              /* Ligne formulaire */
.form-group-required     /* Champ obligatoire (affiche *) */
.hsp_table              /* Tableau de formulaire */

/* Tables de données */
.data-table             /* Tableau de données (chambres/services) */
.data-table-header      /* En-tête tableau */
.data-table-title       /* Titre tableau */

/* Navigation */
.r_dashButton           /* Bouton navigation principale */
.r_active               /* Bouton nav actif */
.r_AppointmentBtn       /* Onglet sous-nav */
.r_active1              /* Onglet sous-nav actif */
.r_RoomWard             /* Onglet services/chambres */
.r_active2              /* Onglet service/chambre actif */

/* Badges de statut */
.badge                  /* Badge générique */
.badge-success          /* Vert (disponible) */
.badge-warning          /* Orange (réservé) */
.badge-danger           /* Rouge (occupé) */
```

---

## 8. Guide de modification du design

### 8.1 Changement des couleurs primaires

**Fichier:** `reception_dashboard.css`

```css
:root {
    --primary-color: #017E84;        /* Changez ici */
    --primary-dark: #015a5f;         /* Et ici */
    --secondary-color: #00A09D;      /* Et ici */
    --accent-color: #875A7B;         /* Et ici */
    /* etc... */
}
```

### 8.2 Modification des boutons de navigation

**Fichier:** `reception_dashboard_templates.xml`

```xml
<!-- Dans r_dashButtonContainer, modifiez: -->
<button class="r_dashButton r_active o_patient_button" t-on-click="createPatient">
    <!-- Changez l'SVG, le texte, la CSS class, etc -->
</button>
```

### 8.3 Ajout de nouveaux champs dans les formulaires

**Fichier:** `reception_dashboard_templates.xml`

```xml
### Pour ajouter dans le formulaire patient:

<div class="form-group">
    <label for="new-field-id">Libellé</label>
    <input type="type" id="new-field-id" placeholder="..."/>
</div>
```

**Fichier:** `reception_dashboard.js`

```javascript
// Dans fetch_patient_data(), ajoutez:
const data = {
    // ... champs existants
    new_field: getElementValue('new-field-id')
};
```

**Fichier:** `reception_dashboard_methods.py`

```python
# Mettez à jour le modèle correspondant pour accepter le nouveau champ
```

### 8.4 Changement du layout des tableaux

**Fichier:** `reception_dashboard_templates.xml`

Modifiez les `<th>` dans les tableaux pour ajouter/supprimer colonnes.

**Fichier:** `reception_dashboard.css`

Ajustez les widths et grid-template-columns si nécessaire.

---

## 9. Variables d'état et leur usage

### État global (this.state)

```javascript
{
    patient_lst: []           // Utilisé dans: templates patient select
    ward_data: []             // Utilisé dans: tableau services
    room_data: []             // Utilisé dans: tableau chambres
    dr_lst: []                // Utilisé dans: select médecin
    currentDate: string       // Utilisé dans: champs input date (default)
    current_appointment_type  // Détermine quel formulaire afficher (t-if)
    current_room_ward_type    // Détermine quel tableau afficher (t-if)
}
```

### Utilisation dans les templates

```xml
<!-- Affichage conditionnel -->
<div t-if="state.current_appointment_type == 'outpatient'">
    <!-- Formulaire consultation -->
</div>

<!-- Boucles de données -->
<select>
    <t t-foreach="state.patient_lst" t-as="patient">
        <option t-att-value="patient.id">
            <t t-esc="patient.name"/>
        </option>
    </t>
</select>

<!-- Références DOM -->
<div t-ref="patient_creation"><!-- Accès via this.patient_creation.el --></div>
```

---

## 10. Résumé pour modification de design

Pour modifier le portail, vous devez agir sur ces fichiers dans cet ordre:

1. **CSS** (`reception_dashboard.css`)
   - Changez les couleurs via `:root`
   - Modifiez les espacements, polices, dimensions
   - Ajustez les breakpoints responsive

2. **Templates** (`reception_dashboard_templates.xml`)
   - Modifiez la structure HTML
   - Changez les labels, placeholders
   - Ajoutez/Supprimez des champs de formulaires
   - Modifiez la disposition

3. **JavaScript** (`reception_dashboard.js`)
   - Si vous ajoutez des champs: mettez à jour fetch_*_data()
   - Ajoutez des méthodes si vous modifiez la navigation
   - Changez la logique de validation si nécessaire

4. **Backend** (`reception_dashboard_methods.py`)
   - Ajoutez des méthodes si vous avez besoin de nouvelles données
   - Mettez à jour les modèles si vous ajoutez des champs persistants

---

## Changelog

| Date | Version | Changements |
|------|---------|-------------|
| 2026-02-16 | 1.0 | Version initiale complète |

---

## Contact & Support

Pour les questions techniques, consultez:
- Documentation Odoo: https://www.odoo.com/documentation/18.0/
- OWL Framework: https://github.com/odoo/owl
- Modèle hospitalier: `base_hospital_management`
