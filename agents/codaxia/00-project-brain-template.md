# 🧠 Project Brain — [NOM DU PROJET]

> Fichier central partagé entre tous les agents Codaxia.
> TOUS les agents lisent ce fichier au démarrage et y écrivent leurs outputs.
> NE PAS modifier manuellement sauf la section "Brief client".

---

## 📋 Brief client (rempli par PM/Discovery)

```
[Copier le brief exact du client ici — mot pour mot]
```

**Objectif principal :**
**Deadline :**
**Budget estimé :**
**Contraintes connues :**

---

## 🎯 Features & User Stories (rempli par PM/Discovery)

| ID | Feature | Priorité MoSCoW | Tâches estimées |
|----|---------|----------------|----------------|
| F01 | | Must | |
| F02 | | Should | |
| F03 | | Could | |

**Anti-gold-plating :** Toute feature non citée explicitement dans le brief est exclue.

---

## 🏗️ Architecture (rempli par Architect)

**Stack choisie :**
**Raison du choix :**

**Structure des modules :**
```
[Arborescence des modules]
```

**Décisions architecturales (ADR) :**
| Décision | Raison | Alternative écartée |
|----------|--------|---------------------|
| | | |

---

## 🎫 Backlog de tickets (rempli par Architect)

| ID | Ticket | Agent | Statut | Dépendances |
|----|--------|-------|--------|-------------|
| T01 | | Developer | ⏳ Pending | - |
| T02 | | Developer | ⏳ Pending | T01 |

**Statuts possibles :** ⏳ Pending → 🔄 In Progress → 👀 In Review → 🔁 Rework → ✅ Done → ❌ Blocked

---

## 💻 Log de développement (rempli par Developer)

### Ticket en cours : [ID]
**Démarré le :**
**Fichiers modifiés :**
**Commits :**
**Notes techniques :**

---

## 🔍 Log CTO Review (rempli par CTO Reviewer)

### Review #[N] — Ticket [ID]
**Verdict :** APPROVED / REWORK NEEDED
**Points positifs :**
**Issues trouvées (min 3) :**
1.
2.
3.
**Suggestions :**

---

## 🧪 Log QA (rempli par QA)

### QA Run #[N] — Ticket [ID]
**Verdict :** ✅ PASSED / ❌ FAILED
**Environnement testé :**
**Issues trouvées :**
| # | Sévérité | Description | Steps to reproduce | Screenshot |
|---|---------|-------------|-------------------|------------|

**Déclencheurs FAIL automatique :**
- [ ] Erreur console JS
- [ ] 404 / 500 en navigation
- [ ] Formulaire non fonctionnel
- [ ] Layout cassé mobile
- [ ] Régression sur feature existante

---

## 🔒 Log Sécurité (rempli par Security)

### Audit #[N]
**Verdict :** ✅ SECURE / ⚠️ WARNING / 🚨 CRITICAL BLOCK
**OWASP checklist :**
**Vulnérabilités trouvées :**
**Redispatch vers Developer :** OUI / NON

---

## 🚀 Log Déploiement (rempli par Deploy)

### Deploy #[N] — [staging/production]
**Verdict :** ✅ DEPLOYED / ⚠️ NEEDS WORK / ❌ ROLLBACK
**Smoke tests :**
**Communication client envoyée :** OUI / NON

---

## ⏱️ Estimation (rempli par Estimation)

**Fourchette temps :** [X]h — [Y]h
**Fourchette coût :** [X]$ — [Y]$
**Hypothèses documentées :**
1.
2.
**Risques identifiés :**

---

## 📊 État global du projet

**Progression :** [X]/[N] tickets ✅
**Dernière mise à jour :**
**Prochain agent à activer :**
**Points de blocage :**

---

*Template Codaxia — pipeline multi-agents v1.0*
*Copier ce fichier dans chaque projet : `project-brain.md`*
