# Guide Utilisateur — Gestion Commerciale

> **À destination des tenants (commerçants).** Ce guide explique toutes les fonctionnalités disponibles et comment les utiliser au quotidien.

---

## Table des matières

1. [Connexion et navigation](#1-connexion-et-navigation)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Caisse POS](#3-caisse-pos)
4. [Ventes](#4-ventes)
5. [Factures](#5-factures)
6. [Produits](#6-produits)
7. [Fournisseurs et Achats](#7-fournisseurs-et-achats)
8. [Clients](#8-clients)
9. [Stock](#9-stock)
10. [Rapports](#10-rapports)
11. [Paramètres](#11-paramètres)

---

## 1. Connexion et navigation

### Se connecter

1. Ouvrez votre navigateur et accédez à l'URL de votre boutique
2. Saisissez votre **email** et votre **mot de passe**
3. Cliquez sur **Se connecter**

> **Note :** Si vous avez oublié votre mot de passe, contactez votre administrateur.

### Navigation principale

Le menu latéral (sidebar) donne accès à tous les modules :

| Icône | Module | Description rapide |
|---|---|---|
| 🏠 | Tableau de bord | Vue d'ensemble du jour |
| 🛒 | Caisse POS | Point de vente |
| 💰 | Ventes | Historique des ventes |
| 📄 | Factures | Gestion des factures clients |
| 📦 | Produits | Catalogue produits |
| 🚛 | Fournisseurs | Gestion des fournisseurs |
| 🛍️ | Achats | Bons de commande fournisseurs |
| 👥 | Clients | Répertoire clients |
| 📊 | Stock | Mouvements et alertes |
| 📈 | Rapports | Analyses et exports |
| ⚙️ | Paramètres | Configuration de la boutique |

Cliquer sur le **logo** en haut à gauche retourne toujours au tableau de bord.

---

## 2. Tableau de bord

Le tableau de bord affiche un résumé en temps réel de votre activité.

### Indicateurs du jour (KPIs)

| Indicateur | Description |
|---|---|
| **Ventes du jour** | Nombre de transactions confirmées aujourd'hui |
| **Chiffre d'affaires** | Total des ventes du jour en FCFA |
| **Bénéfice** | CA du jour − coût d'achat des produits vendus |
| **Paiements en attente** | Montant dû par les clients (crédit) |

### Graphique CA 7 jours

- Affiche l'évolution de votre chiffre d'affaires sur les 7 derniers jours
- La barre du jour actuel est mise en évidence (couleur secondaire)

### Top 5 produits

Les 5 produits les plus vendus en chiffre d'affaires sur la période.

### Alertes stock

Produits dont le stock est en dessous du seuil d'alerte défini. Cliquer sur un produit ouvre sa fiche détail.

### Ventes récentes

Les dernières transactions enregistrées avec leur statut et montant.

---

## 3. Caisse POS

Le Point de Vente (POS) est l'outil principal pour enregistrer les ventes au comptoir.

### Accéder à la caisse

Cliquez sur **Caisse POS** dans le menu. La caisse s'ouvre en plein écran.

### Interface de la caisse

L'écran est divisé en deux zones :
- **Gauche** : catalogue des produits disponibles
- **Droite** : panier en cours

### Processus de vente — étape par étape

#### Étape 1 — Rechercher un produit

- Utilisez la **barre de recherche** en haut pour chercher par nom, SKU ou code-barres
- Ou utilisez les **filtres de catégorie** (boutons colorés sous la barre)
- Les produits affichent leur nom, prix et stock disponible

#### Étape 2 — Ajouter au panier

- **Clic simple** sur un produit l'ajoute au panier (quantité 1)
- Pour les **produits à variantes** (couleur, taille…) : une fenêtre s'ouvre pour choisir la variante
- Pour les **produits au poids** : saisissez le poids en kg

#### Étape 3 — Gérer le panier

Dans le panier (colonne droite) :
- **−** / **+** : modifier la quantité
- **Remise** : saisir une remise en FCFA sur une ligne
- **Corbeille** : retirer un article
- **Remise globale** : appliquer une remise en % ou montant fixe sur toute la commande

#### Étape 4 — Associer un client (optionnel)

- Tapez le nom du client dans le champ en haut du panier (au moins 2 caractères)
- **Cliquez sur le nom dans la liste déroulante** pour le sélectionner
- Le client sélectionné apparaît avec un ✕ pour l'effacer

> ⚠️ **Important :** il faut cliquer sur le client dans la liste pour qu'il soit associé à la vente. Taper le nom sans cliquer ne suffit pas.

#### Étape 5 — Encaisser

1. Cliquez sur **Encaisser — X FCFA**
2. Choisissez le(s) mode(s) de paiement : Espèces / Carte / Mobile Money / Virement / Crédit
3. Saisissez le montant pour chaque mode
4. Cliquez sur **Confirmer la vente**

#### Mode hors-ligne

Si vous perdez la connexion internet, le POS continue de fonctionner. Les ventes sont mises en file d'attente et synchronisées automatiquement dès la reconnexion.

### Raccourcis clavier

| Touche | Action |
|---|---|
| Focus sur la barre de recherche | Cliquer sur la barre ou utiliser la souris |

---

## 4. Ventes

### Consulter les ventes

Accédez à **Ventes** pour voir l'historique complet.

**Filtres disponibles :**
- Recherche par référence (ex : VNT-2026-00019) ou nom client
- Filtrer par statut : Confirmée / Brouillon / Annulée
- Filtrer par période (dates de début et fin)

**Colonnes du tableau :**
- **Référence** : identifiant unique `VNT-YYYY-NNNNN`
- **Client** : client associé ou "Anonyme"
- **Date** : date de confirmation
- **Montant** : total de la vente
- **Payé** : montant encaissé
- **Reste dû** : montant en attente
- **Statut** : Confirmée / Brouillon / Annulée

### Voir le détail d'une vente

Cliquez sur une ligne pour ouvrir le détail complet : articles, paiements, client, etc.

### Télécharger un reçu PDF

Sur la liste ou le détail d'une vente, cliquez sur l'icône **PDF** pour générer et télécharger le reçu.

### Annuler une vente

Sur le détail d'une vente **Confirmée**, cliquez sur **Annuler**. Le stock est automatiquement réintégré.

---

## 5. Factures

Les factures permettent de facturer des clients avec des délais de paiement.

### Statuts d'une facture

```
Brouillon → Envoyée → Payée
                    → En retard
         → Annulée
```

### Créer une facture

1. Cliquez sur **+ Nouvelle facture**
2. Sélectionnez un client (obligatoire)
3. Définissez la date d'émission et la date d'échéance
4. Ajoutez les lignes de produits/services
5. Appliquez une remise et/ou une TVA si nécessaire
6. Cliquez sur **Créer**

### Workflow d'une facture

| Action | Résultat | Condition |
|---|---|---|
| **Envoyer** | Statut → "Envoyée" | Facture en brouillon |
| **Enregistrer un paiement** | Incrémente le montant payé | Facture envoyée ou en retard |
| **Annuler** | Statut → "Annulée" | Facture brouillon ou envoyée |

### Télécharger en PDF

Cliquez sur l'icône PDF sur la liste ou dans le détail.

---

## 6. Produits

### Consulter le catalogue

La page **Produits** affiche tous vos produits avec filtres :
- Recherche par nom, SKU ou code-barres
- Filtrer par catégorie
- Filtrer par statut (Actif / Inactif)

**Cliquer sur un produit** ouvre sa **fiche détail**.

### Page détail d'un produit

La fiche détail affiche :
- **Tarification** : prix de vente, prix d'achat, bénéfice unitaire et marge
- **Stock** : quantité disponible, seuil d'alerte, alerte si stock bas
- **Informations** : statut, code-barres, options
- **Variantes** : tableau de toutes les variantes avec leur stock individuel
- **Mouvements de stock** : historique des entrées/sorties pour ce produit

### Ajouter un produit

1. Cliquez sur **+ Nouveau produit**
2. Renseignez les informations de base :
   - **Nom** (obligatoire)
   - **SKU** : code unique du produit (facultatif)
   - **Catégorie** : pour organiser le catalogue
   - **Image** : JPEG, PNG ou WebP, max 2 Mo
3. Définissez les prix :
   - **Prix de vente** : prix affiché au client
   - **Prix d'achat** : coût d'acquisition (pour le calcul de la marge)
   - **Unité** : pièce, kg, L, etc.
   - **Seuil d'alerte stock** : déclenche une alerte quand le stock descend en dessous
4. Activez les options si besoin :
   - **Produit à variantes** : pour les produits avec taille, couleur, format…
   - **Vendu au poids** : saisie en kg au POS
   - **Gestion par lots / expiration** : suivi des dates de péremption
5. Cliquez sur **Créer le produit**

### Créer un produit avec variantes

Activez **Produit à variantes**, puis suivez les 3 étapes :

**Étape 1 — Sélectionner les attributs**
- Cliquez sur les attributs existants (ex : COULEUR, TAILLE)
- Ou créez un nouvel attribut en tapant son nom et en cliquant **Créer**

**Étape 2 — Sélectionner les valeurs**
- Cliquez sur les valeurs existantes (ex : Rouge, Bleu, XL, L)
- Ou tapez une nouvelle valeur et cliquez sur **+** pour l'ajouter
- Sélectionnez au moins une valeur par attribut

**Étape 3 — Configurer les combinaisons**
- Le système génère automatiquement toutes les combinaisons possibles
- Pour chaque combinaison, saisissez un SKU et/ou un prix spécifique (optionnel)
- Supprimez les combinaisons non souhaitées avec la corbeille

### Modifier un produit

Depuis la liste ou la fiche détail, cliquez sur l'icône **crayon** ou le bouton **Modifier**.

> **Note :** L'option "Produit à variantes" ne peut pas être modifiée après création.

### Importer des produits en masse (CSV)

1. Cliquez sur **Importer CSV**
2. Téléchargez d'abord le **modèle CSV** pour respecter le format
3. Remplissez le fichier (séparateur `;`, encodage UTF-8)
4. Uploadez le fichier et cochez "Mettre à jour les existants" si nécessaire
5. Consultez le rapport d'import (créés / mis à jour / erreurs)

**Format du fichier CSV :**
```
nom;sku;categorie;prix_vente;prix_achat;stock;seuil_alerte;unite;description
T-shirt blanc;TSH-BL;Mode;5000;2500;50;5;pièce;T-shirt en coton
```

### Catégories

Depuis la création/modification d'un produit, cliquez sur **+ Nouvelle** à côté du champ Catégorie pour créer une catégorie directement.

---

## 7. Fournisseurs et Achats

### Fournisseurs

**Ajouter un fournisseur :**
1. Cliquez sur **Nouveau fournisseur**
2. Renseignez le nom, le pays, le téléphone et l'email
3. Cliquez sur **Créer**

**Actions disponibles :**
- **Modifier** : mettre à jour les informations
- **Désactiver / Activer** : gérer la disponibilité du fournisseur
- **Supprimer** : suppression définitive

### Bons de commande (Achats)

Les bons de commande permettent de gérer les approvisionnements auprès des fournisseurs.

**Statuts d'un bon de commande :**
```
Brouillon → Commandé → Partiellement reçu → Reçu
          → Annulé
```

**Créer un bon de commande :**
1. Cliquez sur **+ Nouveau bon de commande**
2. Sélectionnez le fournisseur (optionnel)
3. Définissez la date de livraison prévue (optionnel)
4. Ajoutez les lignes de produits avec quantité et prix unitaire
5. Cliquez sur **Enregistrer**

**Workflow :**

| Action | Résultat | Quand ? |
|---|---|---|
| **Confirmer** | Statut → Commandé | Bon en brouillon |
| **Réceptionner** | Stock incrémenté automatiquement | Bon commandé ou partiel |
| **Annuler** | Statut → Annulé | Bon brouillon ou commandé |

**Réception partielle :** lors de la réception, saisissez la quantité réellement reçue pour chaque ligne. Le bon passe en "Partiellement reçu" si toutes les lignes ne sont pas complètes.

---

## 8. Clients

### Gérer les clients

**Ajouter un client :**
1. Cliquez sur **Nouveau client**
2. Renseignez le nom, le pays, le téléphone et l'email
3. Cliquez sur **Créer**

**Voir la fiche client :**
Cliquez sur l'icône **œil** ou sur le nom du client pour accéder à son profil complet avec l'historique de ses achats.

**Actions disponibles :**
- **Modifier** les informations
- **Désactiver / Activer** : un client désactivé n'apparaît plus dans la liste du POS
- **Supprimer** : suppression définitive

### Rechercher un client

Utilisez la barre de recherche pour filtrer par nom, email ou téléphone. Filtrez également par statut (Actif / Inactif).

---

## 9. Stock

La page Stock centralise le suivi des mouvements, alertes et lots.

### Onglets disponibles

#### Mouvements de stock

Historique de tous les flux d'entrée et sortie :

| Type | Description |
|---|---|
| **Entrée** | Réception de marchandises (achat, retour) |
| **Sortie** | Vente de produits |
| **Inventaire** | Ajustement manuel du stock |

Filtrez par type de mouvement et par période.

#### Alertes stock

Liste des produits dont le stock est en dessous du seuil d'alerte défini. Réapprovisionnez rapidement via un bon de commande.

#### Lots expirants

Liste des lots de produits dont la date de péremption approche (pour les produits avec suivi d'expiration activé).

### Ajustement de stock

Pour corriger manuellement le stock d'un produit :

1. Depuis la page **Stock** ou la **fiche détail du produit**, cliquez sur **Ajuster stock**
2. Sélectionnez le produit (et la variante si applicable)
3. Choisissez le type : Entrée / Sortie / Inventaire
4. Saisissez la quantité
5. Ajoutez une note explicative (obligatoire)
6. Cliquez sur **Enregistrer**

> **Inventaire :** utilisez ce type pour corriger une différence entre le stock théorique et le stock réel après comptage physique.

---

## 10. Rapports

La page Rapports propose 3 analyses téléchargeables en CSV.

### Rapport Ventes

Analyse du chiffre d'affaires sur une période donnée :
- CA total, nombre de ventes, panier moyen
- Répartition par méthode de paiement
- Évolution jour par jour

**Utilisation :** sélectionnez les dates de début et fin, cliquez sur **Générer**, puis **Exporter CSV** si besoin.

### Rapport Produits

Top produits vendus sur la période :
- Quantité vendue et chiffre d'affaires par produit
- Permet d'identifier les best-sellers et les produits peu performants

### Rapport Stock

Synthèse du stock actuel :
- Valeur totale du stock (à prix d'achat)
- Produits en rupture ou sous le seuil d'alerte
- Liste complète avec quantités disponibles

---

## 11. Paramètres

### Onglet Boutique

Configurez les informations de votre commerce :

| Champ | Description |
|---|---|
| **Logo** | Image affichée dans la barre latérale (JPEG, PNG, SVG, max 2 Mo) |
| **Nom du commerce** | Affiché dans l'interface et sur les PDF |
| **Secteur d'activité** | Commerce général, Alimentation, Mode, Cosmétique |
| **Devise** | XOF (FCFA), EUR, USD, etc. |
| **Téléphone** | Avec sélecteur de pays (+221 pour Sénégal) |
| **Email** | Adresse de contact |
| **Adresse / Ville** | Coordonnées géographiques |

> **Note :** Les couleurs de l'interface (charte graphique) sont définies par l'administrateur de la plateforme et ne peuvent pas être modifiées ici.

### Onglet Mon profil

Modifiez vos informations personnelles :
- Nom d'affichage
- Adresse email
- Mot de passe (laisser vide pour ne pas modifier)

### Onglet Utilisateurs

Gérez les comptes de vos collaborateurs :

**Ajouter un utilisateur :**
1. Cliquez sur **Nouvel utilisateur**
2. Renseignez nom, email, mot de passe
3. Assignez un ou plusieurs **groupes** (définit les permissions)
4. Cliquez sur **Créer**

**Désactiver un utilisateur :** décochez "Compte actif" lors de la modification. L'utilisateur ne pourra plus se connecter.

### Onglet Groupes & Permissions

Les groupes définissent ce que chaque collaborateur peut faire dans l'application.

**Groupes par défaut :**

| Groupe | Accès typique |
|---|---|
| **Administrateur** | Accès complet à toutes les fonctionnalités |
| **Gestionnaire** | Tout sauf la suppression et les paramètres sensibles |
| **Vendeur** | POS, consultation des ventes et du stock |

**Créer un groupe personnalisé :**
1. Cliquez sur **Nouveau groupe**
2. Donnez-lui un nom
3. Cliquez sur **Permissions** pour définir les accès
4. Cochez les permissions souhaitées module par module

---

## Conseils pratiques

### Bonnes pratiques quotidiennes

1. **Démarrer la journée** → Vérifiez le tableau de bord pour les alertes de stock
2. **Avant une vente POS** → Assurez-vous que la session de caisse est ouverte
3. **Réception de marchandises** → Créez un bon de commande et réceptionnez-le pour mettre à jour le stock automatiquement
4. **Fin de journée** → Consultez les rapports ventes du jour et fermez la session de caisse

### Raccourcis utiles

| Raccourci | Action |
|---|---|
| Clic sur le logo/nom boutique | Retour au tableau de bord |
| Clic sur une ligne produit | Ouvrir la fiche détail |
| Clic sur une ligne vente | Ouvrir le détail de la vente |
| Clic sur une ligne client | Ouvrir le profil client |

### En cas de problème

| Problème | Solution |
|---|---|
| Le POS ne répond plus | Vérifiez votre connexion internet — le mode hors-ligne prend le relais |
| Stock incorrect | Faites un ajustement d'inventaire depuis la page Stock |
| Impossible de se connecter | Contactez votre administrateur |
| Prix ne se mettent pas à jour | Actualisez la page (F5) |

---

*Document généré pour la plateforme SaaS Gestion Commerciale — Afrique de l'Ouest*
