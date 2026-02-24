# Guide Complet : Création d'un Médecin dans Odoo Hospital

## 1. Préalables - Accès Utilisateur

### Ajouter l'accès au groupe "Manager"

1. Allez à **Paramètres** → **Utilisateurs et Compagnies** → **Utilisateurs**
2. Sélectionnez l'utilisateur qui doit créer les médecins
3. Dans l'onglet **Autorisations d'Accès**, ajoutez le groupe **Manager** (Gestionnaire)
4. Sauvegardez les modifications
5. L'utilisateur doit se reconnecter pour que les droits prennent effet

---

## 2. Configuration du Personnel (Staff)

### 2.1 Ajouter une Position de Travail (Job Position)

**Chemin** : Ressources Humaines → Configuration → Positions de Travail

#### Pas à pas :

1. Cliquez sur **+ Créer**
2. Remplissez les champs :
   - **Nom de la position** : "Médecin", "Infirmier", "Pharmacien", etc.
   - **Description** : Description optionnelle de la position
   - **Département** : Sélectionnez le département (ex: Consultation, Chirurgie, etc.)

3. Sauvegardez

#### Positions courantes :
- Médecin
- Infirmier
- Pharmacien
- Laborantin
- Réceptionniste

---

### 2.2 Ajouter un Employé (Médecin)

**Chemin** : Ressources Humaines → Employés

#### Pas à pas :

1. Cliquez sur **+ Créer**
2. Remplissez les informations personnelles :
   - **Nom** : Nom complet du médecin
   - **Email** : Email professionnel
   - **Téléphone** : Numéro de contact
   - **Adresse** : Adresse professionnelle

3. Dans l'onglet **Travail** :
   - **Position** : Sélectionnez "Médecin"
   - **Département** : Sélectionnez le département concerné
   - **Manager** : Définissez le responsable hiérarchique
   - **Date de début** : Date d'embauche

4. Sauvegardez

---

### 2.3 Ajouter le Lien avec un Compte Utilisateur

Pour que le médecin puisse accéder au tableau de bord :

1. Allez à **Paramètres** → **Utilisateurs et Compagnies** → **Utilisateurs**
2. Créez un nouvel utilisateur ou retrouvez l'utilisateur existant
3. Liez l'utilisateur à l'employé créé ci-dessus
4. Attribuez les permissions appropriées

---

## 3. Configuration des Types de Consultation

**Chemin** : Santé Hospitalière → Configuration → Types de Consultation

### Pas à pas :

1. Cliquez sur **+ Créer**
2. Remplissez les informations :
   - **Nom du type** : "Consultation générale", "Cardiologie", "Chirurgie", etc.
   - **Description** : Détails du type de consultation
   - **Code** : Code unique (ex: CONS-GEN, CARDIO)

3. Sauvegardez

#### Types de consultation courants :
- Consultation générale
- Cardiologie
- Pneumologie
- Gastroentérologie
- Pédiatrie
- Gynécologie
- Chirurgie générale
- Orthopédie

---

## 4. Configuration Médecin - Temps Moyen et Tarif

**Chemin** : Santé Hospitalière → Configuration → Allocation des Médecins

### Ajouter un Médecin avec ses paramètres :

1. Cliquez sur **+ Créer**
2. Remplissez les champs :
   - **Médecin** : Sélectionnez l'employé médecin créé précédemment
   - **Temps moyen par patient** : En minutes (ex: 15, 20, 30)
   - **Tarif de consultation** : Prix en devise locale
   - **Type de consultation** : Sélectionnez le type de consultation
   - **Jour et horaires** : Définissez les disponibilités

3. Sauvegardez

#### Exemple de configuration :
- **Médecin** : Dr. Ahmed Hassan
- **Temps moyen** : 20 minutes
- **Tarif** : 500 DZD (ou devise locale)
- **Type** : Consultation générale

---

## 5. Configuration Pharmacie

**Chemin** : Santé Hospitalière → Pharmacie → Pharmacies

### Ajouter une Pharmacie :

1. Cliquez sur **+ Créer**
2. Remplissez les informations :
   - **Nom de la pharmacie** : Nom du lieu de stockage
   - **Adresse** : Localisation
   - **Responsable** : Pharmacien responsable
   - **Téléphone** : Contact
   - **Email** : Email de la pharmacie

3. Configurez les détails :
   - **Horaires d'ouverture** : Heures de fonctionnement
   - **Code postal** : Code postal du lieu
   - **Ville** : Ville

4. Sauvegardez

#### Exemple :
- **Nom** : Pharmacie Principale
- **Responsable** : Pharmacien principal
- **Adresse** : Bâtiment A, Étage 1

---

## 6. Configuration des Médicaments

**Chemin** : Santé Hospitalière → Pharmacie → Médicaments

### Ajouter un Médicament :

1. Cliquez sur **+ Créer**
2. Remplissez les informations :

   **Informations générales :**
   - **Nom du médicament** : Nom générique ou commercial
   - **DCI** (Dénomination Commune Internationale) : Substance active
   - **Dose** : Quantité (ex: 500mg, 10ml)
   - **Forme** : Forme pharmaceutique (Comprimé, Injection, Sirop, etc.)
   - **Fabricant** : Entreprise pharmaceutique

   **Détails commerciaux :**
   - **Code-barres** : Identifiant unique
   - **Prix unitaire** : Coût du médicament
   - **Quantité en stock** : Stock actuel
   - **Pharmacie** : Lieu de stockage

   **Informations médicales :**
   - **Indication** : Conditions traitées
   - **Contre-indication** : Conditions où ne pas utiliser
   - **Posologie** : Dosage recommandé
   - **Effets secondaires** : Effets indésirables possibles

3. Sauvegardez

#### Exemple :
```
Nom : Amoxicilline
DCI : Amoxicilline
Dose : 500mg
Forme : Comprimé
Fabricant : Pharmaceutical Corp
Prix : 50 DZD
Stock : 100 unités
Indication : Infections bactériennes
Posologie : 1 comprimé x 3 fois par jour
```

---

## 7. Configuration des Vaccins

**Chemin** : Santé Hospitalière → Stockage des Vaccins

### Ajouter un Vaccin :

1. Cliquez sur **+ Créer**
2. Remplissez les informations :

   **Informations générales :**
   - **Nom du vaccin** : Nom du vaccin (ex: COVID-19, Polio, etc.)
   - **Code vaccin** : Code unique
   - **Type de vaccin** : Classification (Viral, Bactérien, etc.)
   - **Fabricant** : Producteur du vaccin

   **Caractéristiques :**
   - **Dose recommandée** : Quantité par injection
   - **Nombre de doses** : Nombre total requises
   - **Intervalle** : Temps entre les doses (ex: 21 jours)
   - **Âge minimum** : Âge minimum pour la vaccination
   - **Âge maximum** : Âge maximum recommandé

   **Gestion du stock :**
   - **Température de stockage** : Conditions requises (ex: 2-8°C)
   - **Durée de vie** : Mois avant expiration
   - **Quantité en stock** : Stock disponible
   - **Prix unitaire** : Coût du vaccin

   **Contre-indications :**
   - **Alergies** : Allergies connues
   - **Conditions** : Conditions médicales incompatibles

3. Sauvegardez

#### Exemple :
```
Nom : Vaccin COVID-19
Type : Viral (ARNm)
Fabricant : Pfizer-BioNTech
Dose : 0.3 ml
Nombre de doses : 3
Intervalle : 21 et 90 jours
Température : 2-8°C
Durée de vie : 9 mois
Stock : 500 doses
Prix : 1,500 DZD
```

---

## 8. Processus Complet - Résumé

### Flux de création d'un médecin :

```
1. PRÉPARATION
   ├─ Accorder l'accès Manager à l'utilisateur
   └─ Confirmer la reconnexion

2. CONFIGURATION INITIALE
   ├─ Créer la position "Médecin"
   ├─ Créer les types de consultation
   ├─ Créer les pharmacies
   ├─ Ajouter les médicaments
   └─ Ajouter les vaccins

3. CRÉATION DU MÉDECIN
   ├─ Créer l'employé médecin
   ├─ Ajouter à l'allocation des médecins
   ├─ Configurer les paramètres (temps, tarif)
   └─ Créer le compte utilisateur

4. ACTIVATION
   ├─ Vérifier le tableau de bord
   ├─ Assigner les consultations
   └─ Lancer les opérations
```

---

## 9. Dépannage Courant

### Le médecin n'apparaît pas dans la liste ?
- Vérifiez que la position "Médecin" est assignée à l'employé
- Vérifiez les permissions du groupe Manager
- Rechargez la page

### Les tarifs ne s'appliquent pas ?
- Vérifiez la configuration dans "Allocation des Médecins"
- Vérifiez le type de consultation sélectionné
- Assurez-vous que la devise est correcte

### Les médicaments n'y a pas de stock ?
- Ajoutez la quantité en stock dans le formulaire
- Vérifiez que la pharmacie est sélectionnée
- Mettez à jour le stock après utilisation

---

## 10. Conseils Pratiques

✅ **Avant de commencer :**
- Préparez une liste des médecins et leurs spécialités
- Rassemblez les informations sur les médicaments courants
- Établissez une structure de tarification

✅ **Lors de la création :**
- Utilisez des codes standards pour les médicaments
- Documentez les posologies courantes
- Mettez en place un système de suivi des stocks

✅ **Après la création :**
- Testez le tableau de bord médecin
- Vérifiez les consultations planifiées
- Planifiez des mises à jour régulières des stocks

---

## Contact et Support

Pour plus d'informations sur la gestion hospitalière dans Odoo 18, consultez :
- Documentation officielle Odoo
- Support technique du module base_hospital_management
- Guide administrateur du système hospitalier

**Date de création** : 12 février 2026  
**Version** : Odoo 18.0  
**Module** : base_hospital_management
