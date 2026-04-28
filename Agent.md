# Agent.md

## Overview

**Description brève du projet et de sa finalité**

Ce projet est un terminal interactif développé en TypeScript qui exploite les modèles d'OpenAI pour offrir des capacités de lecture, d'écriture, d'exécution de commandes shell, de chargement de contexte JSON et de requête de ce contexte. Il sert de base extensible pour créer des agents conversationnels ou des outils d'automatisation intégrés à la ligne de commande.

---

## Tech Stack & Architecture

- **Node.js** : `v20.x`
- **TypeScript** : `^5.2.0`
- **OpenAI SDK** : `^4.x`
- **Babel / ESBuild** (pour le build) : `^7.x`
- **Jest** (tests) : `^29.x`

### Architecture du dossier
```
project-root/
├─ src/                # Code source principal
│   ├─ index.ts        # Point d'entrée du terminal
│   ├─ commands/       # Implémentations des commandes (read, write, bash, etc.)
│   └─ utils/          # Fonctions utilitaires et helpers
├─ tests/              # Tests unitaires et d'intégration
│   └─ *.test.ts
├─ .eslintrc.json      # Configuration ESLint
├─ tsconfig.json       # Configuration TypeScript
├─ package.json        # Dépendances et scripts
└─ README.md           # Documentation du projet
```

---

## Coding Conventions

- **Modules ES** (`import`/`export`) uniquement.
- **Typage strict** : `noImplicitAny`, `strictNullChecks` activés dans `tsconfig.json`.
- **Normes de nommage** :
  - Fichiers en *kebab-case* (`my-feature.ts`).
  - Classes et types en *PascalCase*.
  - Variables et fonctions en *camelCase*.
- **Commentaires** :
  - Utiliser JSDoc pour expliquer les fonctions publiques.
  - Ajouter des commentaires de bloc lorsque le code nécessite une explication supplémentaire.
- **Linting** : ESLint avec les règles `eslint:recommended` + `plugin:@typescript-eslint/recommended`.

---

## Workflow & Commands

| Action                     | Commande npm                         |
|----------------------------|---------------------------------------|
| Installer les dépendances  | `npm ci`                              |
| Lancer les tests unitaires | `npm test` (Jest)                     |
| Lancer le linter           | `npm run lint` (ESLint)               |
| Build du projet            | `npm run build` (esbuild)            |
| Démarrer le terminal en dev| `npm run dev` (ts-node ou nodemon)   |

> **Note** : Tous les scripts sont définis dans le `package.json` et respectent les conventions ci‑dessus.

---

*Ce fichier sert de référence rapide pour les contributeurs et mainteneurs du projet.*