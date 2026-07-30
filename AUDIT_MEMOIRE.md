# Audit du mémoire « Digitalisation et centralisation de la gestion d'un centre hospitalier »

> Audit croisé **mémoire ↔ code réel** du module `base_hospital_management`.
> Objectif : préparer la soutenance, **justifier le résumé**, et lister chapitre par
> chapitre les corrections à faire. Établi le 2026-06-26.

---

## 0. Synthèse exécutive (à lire en premier)

Trois constats structurants :

1. **Le socle est le module open-source Cybrosys** (`__manifest__.py` → author: Cybrosys,
   licence AGPL-3, cité en référence #15). L'historique git montre que les commits propres
   portent surtout sur le **redesign du dashboard pharmacie** (CSS/JS « PharmaFlow »).
   → Il faut présenter le travail comme une **extension/adaptation** d'un module existant,
   pas comme un développement *ex nihilo*. C'est défendable et honnête ; le cacher est le
   risque n°1 en soutenance.

2. **Les affirmations fonctionnelles sont vraies et prouvables** (40 modèles, 6 rôles,
   183 ACL, 4 dashboards, portail, héritage natif). Ce sont tes points forts → à mettre en avant.

3. **Les affirmations sécurité / déploiement / tests ne sont PAS dans le code** (Docker, 2FA,
   sauvegarde 3-2-1, RPO/RTO, FHIR, tests unitaires). Elles sont *conçues/proposées* mais
   non implémentées. → Soit les implémenter (voir plan code), soit les reformuler au
   conditionnel (« proposé », « envisagé »).

---

## 1. Tableau de justification du résumé (le document que le prof demande)

Chaque phrase du résumé → preuve dans le code → action.

| # | Affirmation du résumé | Preuve dans le code | Statut | Action |
|---|---|---|---|---|
| 1 | « ~40 modèles métier » | `models/` = 42 fichiers | ✅ Prouvé | Garder. Renvoyer à Figure 9 |
| 2 | « six profils (médecin, infirmier, pharmacien, laborantin, réceptionniste, manager) » | `security/base_hospital_management_groups.xml` (6 groupes) | ✅ Prouvé | Garder |
| 3 | « quatre tableaux de bord par rôle » | `static/src/js/{doctor,lab,pharmacy,reception}_dashboard.js` | ✅ Prouvé | Garder. Figures 11-12 |
| 4 | « portail patient web (RDV en ligne + consultation dossier) » | `controllers/hospital_portal.py`, `patient_booking.py` | ✅ Prouvé | Garder. Figure 13 |
| 5 | « intégration native (compta, stock, RH) » | héritage `res.partner`, `hr.employee`, `product.template` ; dépendances `hr, stock, sale_management, purchase` | ✅ Prouvé | Garder |
| 6 | « DPI unique + matricule + EAN-13 » | `models/res_partner.py` (barcode), `data/ir_sequence_data.xml` | ✅ Prouvé | Garder |
| 7 | « PostgreSQL » | Odoo = PostgreSQL par défaut | ✅ Implicite | Garder |
| 8 | « framework OWL » | dashboards OWL + Chart.js | ✅ Prouvé | Garder |
| 9 | « >180 règles de contrôle » | `ir.model.access.csv` = 183 lignes | ✅ Prouvé | Garder |
| 10 | « traçabilité / journal de suivi » | `mail.thread` sur inpatient, outpatient, surgery, doctor_slot | ⚠️ Partiel | Préciser « sur les modèles sensibles » |
| 11 | « tâches planifiées » | 1 seul cron (Blood Bank, /3 mois) | ⚠️ Faible | Ajouter 1-2 crons OU adoucir |
| 12 | « déploiement conteneurisé Docker » | **aucun** Dockerfile | ❌ Absent | Créer Dockerfile OU écrire « proposé » |
| 13 | « 2FA, mdp 10 car., session 30 min » | **rien** dans le module | ❌ Absent | Reformuler « config serveur recommandée » |
| 14 | « sauvegarde 3-2-1, RPO 5 min, bascule <30 s » | **aucun** script | ❌ Absent | Reformuler « stratégie proposée » |
| 15 | « tests (4 niveaux, 80 %) » | **aucun** `test_*.py` | ❌ Absent | Créer qq tests OU écrire « plan de test » |
| 16 | « FHIR / HL7 / RBAC » | RBAC ✅ (groupes) ; FHIR/HL7 ❌ | ⚠️ Mixte | RBAC=garder ; FHIR=« perspective » |
| 17 | « validé sur environnement de test, non déployé » | cohérent | ✅ Honnête | **Garder cette prudence partout** |

**Règle d'or à présenter au prof :** « tout ce que j'affirme au présent de l'indicatif est
dans le code ; tout ce qui est proposé/futur est au conditionnel. » Le résumé applique déjà
cette prudence pour le déploiement — il faut l'étendre aux lignes 12-15.

---

## 2. Audit chapitre par chapitre

### Pages liminaires (Résumé / Abstract)
- **Artefact Markdown** : `**204 structures sanitaires**` — les `**` apparaissent en clair
  dans le PDF. À retirer.
- Harmoniser résumé FR et abstract EN (mêmes chiffres, même prudence).
- Ajouter 1 phrase : « solution construite sur le module open-source Cybrosys, étendue
  pour le contexte ivoirien ». **Indispensable.**

### Introduction
- Bonne contextualisation (chiffres CMU, SGCH). Vérifier la cohérence des chiffres :
  l'intro dit « 405 hôpitaux » et « 160 établissements », le résumé « 204 structures ».
  Sourcer chacun (DISD 2024) pour éviter les questions piège.

### Partie I (Chap. 1-2) — État de l'art
- Solide, bien documenté. Peu de corrections.
- **Tableau 7 « Comparatif des solutions SIH »** est listé mais **absent du corps**.
  → l'ajouter réellement (Epic, Cerner, SAP, Open Hospital, Bahmni, Odoo) ou retirer de la
  liste des tableaux.
- Chap. 2.4 : tu justifies « développer une solution personnalisée » — mais le code part de
  Cybrosys. Reformule : « *partir d'*une base open-source Odoo (Cybrosys) et l'adapter »
  plutôt que « développer une solution personnalisée » qui laisse entendre du sur-mesure complet.

### Partie II (Chap. 3-4) — Analyse & UML
- Chap. 3 : bon. Les 6 rôles, le DPI, la facturation correspondent au code. ✅
- **3.3.1** : il manque un mot en début de paragraphe (« filtres supplémentaires… »
  commence par une minuscule sans sujet). Corriger.
- **Diagrammes UML** : la numérotation des figures est incohérente. La « Figure 1 » désigne
  à la fois le cas d'utilisation (p.29) et l'architecture santé (liste des figures).
  → Renuméroter TOUTES les figures de façon continue et cohérente avec la liste p.V.
- Diagramme de classes : vérifier qu'il reflète les vrais modèles (Patient=res.partner,
  Medecin=hr.employee). Le préciser en légende, sinon le jury demandera « où est la classe Patient ? ».

### Partie III (Chap. 5-6) — Développement & Sécurité
**Problèmes majeurs de rédaction (copier-coller) :**
- **5.3 « Optimisation UI/UX »** reproduit MOT POUR MOT le texte de 5.2 (héritage de modèle /
  relation directe). → Réécrire 5.3 avec le VRAI contenu UI/UX : OWL, Chart.js, les 4 dashboards,
  le redesign pharmacie (ton apport principal !), les tuiles du portail. **C'est ici que tu dois
  VALORISER ton vrai travail.**
- **6.2 « Journalisation »** reproduit MOT POUR MOT le 6.1 (auth, tableau des groupes répété 2×).
  → Réécrire 6.2 sur le VRAI sujet : `mail.thread`, champs `create_uid/write_uid/write_date`
  natifs, chatter sur inpatient/outpatient/surgery.
- Le **tableau des 6 groupes est répété 3 fois** (p.27, p.28, p.29). N'en garder qu'un.

**Affirmations à requalifier (Chap. 6) :**
- « 2FA activée », « mdp ≥10 car. », « session 30 min », « blocage tentatives » →
  ce sont des **réglages serveur Odoo/Nginx**, pas du code de ton module. Écris :
  « la configuration de déploiement *recommandée* active… ». Sinon le jury demande le code.
- « Chiffrement disque / HTTPS / en-têtes sécurité » → idem, niveau infra. Reformuler.
- « Faille portail corrigée » → **VRAI et vérifiable** : `hospital_portal.py` filtre par
  `('patient_id.partner_id','=',request.env.user.partner_id.id)`. **Mets une capture du code**
  en annexe, c'est un vrai point fort sécurité.
- « 6.3 Sauvegarde 3-2-1 / RPO 5 min / RTO 15 min / bascule 30 s » → **non implémenté**.
  Soit script + docker-compose avec réplication (voir plan code), soit titre
  « Stratégie de sauvegarde *proposée* ».

### Partie IV (Chap. 7-8) — Déploiement, tests, BI
- **Chap. 7 (tests, Docker, CI/CD, 3 environnements)** : entièrement **théorique**, rien dans
  le repo. → Soit créer un minimum réel (Dockerfile + 4 tests + un `.gitlab-ci.yml`/`gh actions`),
  soit retitrer le chapitre « Stratégie *cible* de déploiement et de test ».
- **Tableau formation** : l'en-tête « Public/Durée/Format » est répété au milieu du tableau
  (artefact de saut de page). Refaire le tableau proprement.
- **Chap. 8 (dashboards)** : les 4 dashboards existent VRAIMENT (captures Figures 5-8). ✅
  Le « dashboard Direction », l'entrepôt analytique et le ML sont des **perspectives** —
  bien indiqué « évolution prévue », garder ce conditionnel.
- Cohérence des figures : Figures 5-8 appelées « Figure 5 DASHBOARD MEDECIN » alors que la
  capture montre « Administrator ». Recapturer avec un VRAI compte médecin pour prouver le
  filtrage par rôle (sinon le jury doute du RBAC).

### Conclusion / Références
- Conclusion honnête (« prototype non déployé ») — cohérent, garder.
- Références correctes. **Mettre Cybrosys (#15) en avant aussi dans le corps** (chap. 5) pour
  l'honnêteté de la filiation du code.

---

## 3. Liste de corrections prioritaires (checklist)

**Bloquant (intégrité — à faire absolument) :**
- [ ] Ajouter la mention « extension du module Cybrosys » (résumé + intro + chap. 5).
- [ ] Réécrire 5.3 (vrai contenu UI/UX = ton apport pharmacie/dashboards).
- [ ] Réécrire 6.2 (vraie journalisation `mail.thread`).
- [ ] Requalifier au conditionnel : Docker, 2FA, sauvegarde 3-2-1, tests, FHIR.

**Important (crédibilité) :**
- [ ] Renuméroter toutes les figures + corriger la liste p.V.
- [ ] Supprimer les 2 répétitions du tableau des groupes.
- [ ] Ajouter le Tableau 7 (comparatif SIH) ou le retirer de la liste.
- [ ] Recapturer les dashboards avec de vrais comptes par rôle.
- [ ] Capture du filtre de sécurité portail en annexe (preuve RBAC réel).

**Confort (présentation) :**
- [ ] Nettoyer l'artefact `**204**` du résumé.
- [ ] Corriger le tableau formation (en-tête dupliqué).
- [ ] Corriger la phrase tronquée 3.3.1.

**Renforcement code (pour rendre les affirmations vraies) — voir étape suivante :**
- [ ] `tests/test_*.py` (3-4 tests : unicité matricule, transition admission, ACL).
- [ ] `Dockerfile` + `docker-compose.yml` (Odoo + PostgreSQL + réplica).
- [ ] 1-2 crons utiles (péremption médicaments, rappel RDV).

---

## 4. Argumentaire de soutenance (préparer ces réponses)

- **« Qu'avez-vous développé vous-même ? »** → « Je suis parti du module open-source Cybrosys
  (AGPL-3) comme socle, et j'ai apporté : le redesign UX du module pharmacie, l'adaptation au
  contexte ivoirien (CMU, assurance), la sécurisation du portail patient (correction d'une faille
  d'accès direct aux dossiers), la configuration RBAC à 6 rôles, et la conception de l'architecture
  de déploiement sécurisée. »
- **« Où est la sécurité 2FA/HTTPS dans votre code ? »** → « Ce sont des mesures de niveau
  infrastructure (serveur Odoo + Nginx), documentées comme configuration de déploiement
  recommandée, pas du code applicatif. La sécurité applicative que j'ai implémentée, ce sont
  les 183 règles d'accès et la correction de la faille du portail. »
- **« Vos tests ? »** → présenter les tests réellement ajoutés (étape code), ou assumer
  « plan de test défini, implémentation partielle, c'est une limite assumée du prototype ».
