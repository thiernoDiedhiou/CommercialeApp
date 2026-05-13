# Guide Utilisateur — Gestion Commerciale

> **À destination des tenants (commerçants).** Ce guide explique toutes les fonctionnalités disponibles et comment les utiliser au quotidien.

---

## Table des matières

1. [Connexion et navigation](#1-connexion-et-navigation)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Caisse POS](#3-caisse-pos)
4. [Ventes](#4-ventes)
5. [Retours et Avoirs](#5-retours-et-avoirs)
6. [Factures](#6-factures)
7. [Produits](#7-produits)
8. [Fournisseurs et Achats](#8-fournisseurs-et-achats)
9. [Clients](#9-clients)
10. [Créances clients](#10-créances-clients)
11. [Stock](#11-stock)
12. [Rapports](#12-rapports)
13. [Paramètres](#13-paramètres)

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
| --- | --- | --- |
| 🏠 | Tableau de bord | Vue d'ensemble du jour |
| 🛒 | Caisse POS | Point de vente |
| 💰 | Ventes | Historique des ventes — sous-menu **Retours** |
| 📄 | Factures | Gestion des factures clients |
| 📦 | Produits | Catalogue produits avec marques et variantes |
| 🚛 | Fournisseurs | Gestion des fournisseurs |
| 🛍️ | Achats | Bons de commande fournisseurs |
| 👥 | Clients | Répertoire clients — sous-menu **Créances** |
| 📊 | Stock | Mouvements, alertes email, lots expirants |
| 📈 | Rapports | Analyses et exports CSV |
| ⚙️ | Paramètres | Configuration boutique, SMTP, utilisateurs |

Cliquer sur le **logo** en haut à gauche retourne toujours au tableau de bord.

---

## 2. Tableau de bord

Le tableau de bord affiche un résumé en temps réel de votre activité.

### Indicateurs du jour (KPIs)

| Indicateur | Description |
| --- | --- |
| **Ventes du jour** | Nombre de transactions confirmées aujourd'hui |
| **Chiffre d'affaires** | Total des ventes du jour en FCFA |
| **Bénéfice** | CA du jour − coût d'achat des produits vendus |
| **Encaissements du jour** | Total encaissé via toutes les méthodes de paiement |

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

> **Paiement partiel :** si un client ne règle pas la totalité, saisissez le montant reçu et associez un client — le reste sera enregistré comme créance.

#### Mode hors-ligne

Si vous perdez la connexion internet, le POS continue de fonctionner. Les ventes sont mises en file d'attente et synchronisées automatiquement dès la reconnexion.

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

Cliquez sur une ligne pour ouvrir le détail complet : articles, paiements, client, retours associés, etc.

### Télécharger un reçu PDF

Sur la liste ou le détail d'une vente, cliquez sur l'icône **PDF** pour générer et télécharger le reçu.

### Annuler une vente

Sur le détail d'une vente **Confirmée**, cliquez sur **Annuler**. Le stock est automatiquement réintégré.

---

## 5. Retours et Avoirs

Les retours permettent de traiter les articles renvoyés par un client suite à une vente. Chaque retour génère une référence unique `RET-YYYY-XXXXX` et réintègre automatiquement le stock.

### Accéder aux retours

Cliquez sur **Ventes** dans le menu latéral, puis sur le sous-menu **Retours**.

### Consulter les retours

**Filtres disponibles :**

- Recherche par référence de retour ou de vente d'origine
- Filtrer par type : Remboursement espèces / Avoir client / Sans remboursement
- Filtrer par période

### Créer un retour

Un retour se crée depuis le **détail d'une vente** :

1. Ouvrez la vente concernée (cliquez sur sa référence dans la liste)
2. Faites défiler jusqu'à la section **Retours associés**
3. Cliquez sur **+ Nouveau retour**
4. Sélectionnez les articles à retourner et les quantités
5. Choisissez le type de retour :
   - **Remboursement espèces** : le client est remboursé immédiatement
   - **Avoir client** : le montant est crédité sur le compte du client
   - **Sans remboursement** : retour pour défaut sans compensation
6. Ajoutez une note explicative (optionnel)
7. Cliquez sur **Enregistrer le retour**

> Le stock est automatiquement réintégré dès la validation du retour.

### Règles importantes

- Un retour ne peut pas dépasser la quantité vendue dans la vente d'origine
- Le stock réintégré reflète la quantité réelle (poids ou pièces) de l'article retourné
- Un retour est définitif — il ne peut pas être modifié ou supprimé

---

## 6. Factures

Les factures permettent de facturer des clients avec des délais de paiement. Quand vous **envoyez** une facture dont le client a une adresse email, un email avec le PDF en pièce jointe lui est automatiquement envoyé.

### Statuts d'une facture

```text
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
| --- | --- | --- |
| **Envoyer** | Statut → "Envoyée" + email PDF au client (si email renseigné) | Facture en brouillon |
| **Enregistrer un paiement** | Incrémente le montant payé | Facture envoyée ou en retard |
| **Annuler** | Statut → "Annulée" | Facture brouillon ou envoyée |

### Télécharger en PDF

Cliquez sur l'icône PDF sur la liste ou dans le détail.

---

## 7. Produits

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
- **Informations** : statut, code-barres, options actives
- **Lots / Expiration** : section visible uniquement pour les produits avec suivi d'expiration
- **Variantes** : tableau de toutes les variantes avec leur stock individuel
- **Mouvements de stock** : historique des entrées/sorties pour ce produit

### Ajouter un produit

1. Cliquez sur **+ Nouveau produit**
2. Renseignez les informations de base :
   - **Nom** (obligatoire)
   - **SKU** : code unique du produit (facultatif)
   - **Catégorie** : pour organiser le catalogue
   - **Marque** : fabricant ou fournisseur (facultatif)
   - **Image** : JPEG, PNG ou WebP, max 2 Mo
3. Définissez les prix :
   - **Prix de vente** : prix affiché au client
   - **Prix d'achat** : coût d'acquisition (pour le calcul de la marge)
   - **Unité** : pièce, kg, L, etc.
   - **Seuil d'alerte stock** : déclenche une alerte email quand le stock descend en dessous
4. Activez les options avancées si besoin (voir sections dédiées ci-dessous) :
   - **Produit à variantes** : pour les produits avec taille, couleur, format…
   - **Vendu au poids** : saisie du poids en kg au POS
   - **Gestion par lots / expiration** : suivi des dates de péremption
5. Cliquez sur **Créer le produit**

> **Règle importante :** les options **Produit à variantes**, **Vendu au poids** et **Gestion par lots** ne peuvent pas être modifiées après création. Choisissez bien dès le départ.

---

### Option 1 — Produits à variantes

**Quand l'utiliser ?**
Pour un produit vendu en plusieurs déclinaisons : T-shirt Blanc/M, T-shirt Blanc/L, Djellaba Bleu/XL, etc. Chaque variante a son propre stock, son propre SKU et peut avoir un prix différent.

#### Créer les variantes lors de la création du produit

Activez **Produit à variantes**, puis suivez les 3 étapes :

##### Étape 1 — Sélectionner les attributs

- Cliquez sur les attributs existants (ex : COULEUR, TAILLE)
- Ou créez un nouvel attribut en tapant son nom et en cliquant **Créer**

##### Étape 2 — Sélectionner les valeurs

- Cliquez sur les valeurs existantes (ex : Rouge, Bleu, XL, L)
- Ou tapez une nouvelle valeur et cliquez sur **+** pour l'ajouter
- Sélectionnez au moins une valeur par attribut

##### Étape 3 — Configurer les combinaisons

- Le système génère automatiquement toutes les combinaisons possibles
- Pour chaque combinaison, saisissez un SKU et/ou un prix spécifique (optionnel)
- Supprimez les combinaisons non souhaitées avec la corbeille

#### Gérer les variantes depuis la fiche détail

Depuis la fiche détail du produit, la section **Variantes** liste toutes les déclinaisons :

| Colonne | Description |
| --- | --- |
| **Combinaison** | Ex : Blanc / M |
| **SKU** | Code unique de cette variante |
| **Prix** | Prix spécifique ou "Hérité" (= prix du produit parent) |
| **Stock** | Quantité disponible pour cette variante |
| **Statut** | Actif / Inactif |

**Ajouter une variante** (bouton `+ Ajouter une variante`) : sélectionnez les valeurs d'attribut et saisissez un SKU et/ou prix si nécessaire.

**Modifier une variante** (bouton `Modifier`) : permet de changer le prix de vente, le prix d'achat, le SKU, le seuil d'alerte et activer/désactiver la variante.

**Ajuster le stock d'une variante** (bouton `Ajuster`) : ouvre le formulaire d'ajustement de stock pour cette variante uniquement.

#### Au POS avec une variante

Quand vous cliquez sur un produit à variantes à la caisse, une fenêtre s'ouvre avec toutes les variantes disponibles. Cliquez sur la variante souhaitée pour l'ajouter au panier.

> **Note :** Seules les variantes **actives** avec du **stock disponible** s'affichent à la caisse.

---

### Option 2 — Vendu au poids

**Quand l'utiliser ?**
Pour les produits vendus à la pesée : Farine de blé, Riz en vrac, Petit pois, viandes, etc. Le caissier saisit le poids exact en kg plutôt qu'une quantité en nombre de pièces.

#### Comment ça fonctionne

- Dans le formulaire produit, activez **Vendu au poids** et définissez l'unité (ex : kg, g, L)
- Le stock est exprimé dans cette unité (ex : 54 kg en stock)
- Le prix de vente est le prix **par unité de mesure** (ex : 700 FCFA/kg)

#### Au POS avec un produit au poids

1. Cliquez sur le produit dans le catalogue — une fenêtre s'ouvre
2. Saisissez le **poids** (ex : 2.5 pour 2,5 kg)
3. Cliquez sur **Ajouter au panier**
4. Dans le panier, la ligne affiche : `2.5 kg × 700 FCFA = 1 750 FCFA`

> Le stock est automatiquement décrémenté du poids vendu (−2.5 kg).

#### Ajuster le stock d'un produit au poids

Utilisez le bouton **Ajuster stock** sur la fiche détail. Vous pouvez entrer des décimales (ex : 12.750 pour 12 kg 750 g).

---

### Option 3 — Gestion par lots / expiration

**Quand l'utiliser ?**
Pour les produits ayant une date de péremption : médicaments, produits alimentaires (dentifrice, yaourts, conserves), cosmétiques, etc. Chaque arrivage est enregistré comme un **lot** avec sa date d'expiration.

**Principe :** à la vente, le système utilise automatiquement le lot qui expire **le plus tôt** en premier (méthode FEFO — First Expiry, First Out). Vous n'avez pas à choisir manuellement.

#### La fiche détail d'un produit avec lots

La section **Lots / Expiration** remplace l'affichage de stock simple. Elle affiche :

| Colonne | Description |
| --- | --- |
| **N° Lot** | Identifiant du lot (ex : LOT-2026-001) |
| **Expiration** | Date de péremption (orange = expire dans 30 jours, rouge = expiré) |
| **Reçu** | Quantité totale reçue pour ce lot |
| **Restant** | Quantité encore disponible (diminue à chaque vente) |
| **Statut** | Disponible / Bientôt expiré / Expiré / Épuisé / Inactif |

La **carte Stock** affiche :

- **Disponible** : total des lots actifs non expirés (ce qui peut être vendu)
- **Sans lot** : stock présent mais non affecté à un lot (bloqué à la caisse — voir "Régulariser")

#### Ajouter un lot manuellement

Depuis la fiche détail, cliquez sur **+ Ajouter un lot** (bouton en haut à droite ou dans la section Lots).

| Champ | Obligatoire | Description |
| --- | --- | --- |
| **N° de lot** | Oui | Numéro figurant sur l'emballage fournisseur |
| **Quantité** | Oui | Nombre d'unités de ce lot |
| **Date d'expiration** | Non | Date de péremption (format JJ/MM/AAAA) |
| **Prix d'achat** | Non | Coût unitaire de ce lot |

> Une entrée de stock est automatiquement créée — le total disponible augmente.

#### Modifier un lot

Cliquez sur **Modifier** à droite d'un lot pour changer :

- La date d'expiration (correction d'une erreur de saisie)
- Le statut actif/inactif (désactiver un lot abîmé ou retiré)
- Les notes

#### Régulariser le stock orphelin

Si la section Stock affiche une ligne **"Sans lot : X unités"** accompagnée d'une **bannière orange**, cela signifie que des unités existent en stock mais ne sont rattachées à aucun lot — elles ne peuvent pas être vendues à la caisse.

**Quand ça arrive ?**

- Stock saisi manuellement avant que l'option "Gestion par lots" soit activée
- Ajustement de stock effectué sans numéro de lot

**Comment corriger :**

1. Cliquez sur **Régulariser** dans la bannière orange
2. Vérifiez ou modifiez le numéro de lot proposé (ex : `REG-20260509`)
3. Ajoutez une date d'expiration si vous la connaissez
4. Cliquez sur **Affecter X unités**

> **Important :** la régularisation n'ajoute pas de stock — elle affecte simplement le stock existant à un lot pour le rendre vendable. Le compteur total ne change pas.

#### Au POS avec un produit à lots

La vente se déroule exactement comme un produit normal. Le caissier **n'a rien à choisir** — le système sélectionne automatiquement le lot qui expire le plus tôt.

Si aucun lot disponible n'a la quantité suffisante, la vente est bloquée avec le message *"Aucun lot disponible"*. Dans ce cas, réapprovisionnez le produit via un bon de commande ou ajoutez un lot manuellement.

#### Réceptionner un bon de commande avec lots

Lors de la réception d'un bon de commande (voir section 8), pour les articles avec suivi d'expiration, deux champs supplémentaires apparaissent :

- **N° de lot** : numéro indiqué sur les cartons reçus
- **Date d'expiration** : date de péremption du lot

Renseignez ces informations pour que le lot soit automatiquement créé et le stock mis à jour.

> Si vous ne renseignez pas le numéro de lot lors de la réception, le stock sera quand même incrémenté mais les unités seront "sans lot" et ne pourront pas être vendues à la caisse. Pensez à régulariser ensuite.

---

### Modifier un produit

Depuis la liste ou la fiche détail, cliquez sur l'icône **crayon** ou le bouton **Modifier**.

> **Note :** Les options **Produit à variantes**, **Vendu au poids** et **Gestion par lots** ne peuvent pas être modifiées après création.

### Importer des produits en masse (CSV)

1. Cliquez sur **Importer CSV**
2. Téléchargez d'abord le **modèle CSV** pour respecter le format
3. Remplissez le fichier (séparateur `;`, encodage UTF-8)
4. Uploadez le fichier et cochez "Mettre à jour les existants" si nécessaire
5. Consultez le rapport d'import (créés / mis à jour / erreurs)

**Format du fichier CSV :**

```text
nom;sku;categorie;prix_vente;prix_achat;stock;seuil_alerte;unite;description
T-shirt blanc;TSH-BL;Mode;5000;2500;50;5;pièce;T-shirt en coton
```

### Catégories et Marques

**Catégories :** depuis la création/modification d'un produit, cliquez sur **+ Nouvelle** à côté du champ Catégorie pour créer une catégorie directement.

**Marques :** le champ **Marque** permet de rattacher un produit à une marque (ex : Samsung, Nestlé, Kirène). Cliquez sur **+ Nouvelle** à côté du champ Marque pour créer une marque à la volée. La marque s'affiche sous le nom du produit dans la liste.

> Les marques sont partagées entre tous les produits de votre boutique. Si une marque est liée à des produits, elle ne peut pas être supprimée.

---

## 8. Fournisseurs et Achats

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

```text
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
| --- | --- | --- |
| **Confirmer** | Statut → Commandé | Bon en brouillon |
| **Réceptionner** | Stock incrémenté automatiquement | Bon commandé ou partiel |
| **Annuler** | Statut → Annulé | Bon brouillon ou commandé |

**Réception partielle :** lors de la réception, saisissez la quantité réellement reçue pour chaque ligne. Le bon passe en "Partiellement reçu" si toutes les lignes ne sont pas complètes.

**Réception avec suivi de lots :** pour les produits avec l'option **Gestion par lots / expiration** activée, deux champs supplémentaires apparaissent sur chaque ligne :

- **N° de lot** : le numéro figurant sur les cartons (ex : `LOT-2026-003`)
- **Date d'expiration** : la date de péremption imprimée sur l'emballage

Renseignez ces informations pour que le lot soit automatiquement créé et immédiatement disponible à la vente. Si vous ne les saisissez pas, le stock sera quand même incrémenté mais les unités seront "sans lot" et bloquées à la caisse jusqu'à régularisation.

---

## 9. Clients

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

## 10. Créances clients

La page **Créances** affiche tous les clients ayant un solde impayé sur leurs ventes à crédit.

### Accéder aux créances

Cliquez sur **Clients** dans le menu latéral, puis sur le sous-menu **Créances**.

### Lire le tableau de créances

| Colonne | Description |
| --- | --- |
| **Client** | Nom du client |
| **Ventes à crédit** | Nombre de ventes avec solde restant dû |
| **Montant dû** | Total impayé de ce client (hors trop-perçus) |

En haut du tableau, la carte **Total dû** affiche la somme globale de toutes les créances, quelle que soit la page affichée.

### Fonctionnement

- Seules les ventes avec un reste à payer (`total − montant payé > 0`) apparaissent
- Les trop-perçus (paiements supérieurs au total) ne créent pas de solde négatif
- Cliquez sur un client pour accéder à sa fiche et voir le détail de ses ventes impayées

> **Conseil :** pour régulariser une créance, ouvrez la vente concernée depuis la fiche client et enregistrez le paiement manquant.

---

## 11. Stock

La page Stock centralise le suivi des mouvements, alertes et lots.

### Onglets disponibles

#### Mouvements de stock

Historique de tous les flux d'entrée et sortie :

| Type | Description |
| --- | --- |
| **Entrée** | Réception de marchandises (achat, retour) |
| **Sortie** | Vente de produits |
| **Inventaire** | Ajustement manuel du stock |

Filtrez par type de mouvement et par période.

#### Produits en alerte de stock

Liste des produits dont le stock est en dessous du seuil d'alerte défini. Réapprovisionnez rapidement via un bon de commande.

> **Email automatique :** quand le stock d'un produit franchit son seuil d'alerte à la baisse (suite à une vente ou un ajustement), un email est envoyé automatiquement à tous les utilisateurs ayant la permission de voir le stock. L'email indique le produit, le stock actuel et le seuil configuré.

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
>
> **Produits avec suivi de lots :** le bouton "Ajuster stock" est remplacé par "Ajouter un lot" sur la fiche détail. Pour ces produits, toute entrée de stock passe obligatoirement par la création d'un lot afin de garantir la traçabilité.

---

## 12. Rapports

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

## 13. Paramètres

### Onglet Boutique

Configurez les informations de votre commerce :

| Champ | Description |
| --- | --- |
| **Logo** | Image affichée dans la barre latérale (JPEG, PNG, SVG, max 2 Mo) |
| **Nom du commerce** | Affiché dans l'interface et sur les PDF |
| **Secteur d'activité** | Commerce général, Alimentation, Mode, Cosmétique |
| **Devise** | XOF (FCFA), EUR, USD, etc. |
| **Téléphone** | Avec sélecteur de pays (+221 pour Sénégal) |
| **Email** | Adresse de contact |
| **Adresse / Ville** | Coordonnées géographiques |

> **Note :** Les couleurs de l'interface (charte graphique) sont définies par l'administrateur de la plateforme et ne peuvent pas être modifiées ici.

#### Configuration SMTP (emails sortants)

Vous pouvez configurer votre propre serveur email pour que les notifications (alertes stock, factures) soient envoyées depuis votre adresse professionnelle :

| Champ | Exemple |
| --- | --- |
| **Serveur SMTP** | `smtp.hostinger.com` |
| **Port** | `587` (TLS) ou `465` (SSL) |
| **Utilisateur** | `contact@ma-boutique.sn` |
| **Mot de passe** | Mot de passe de la boîte email |
| **Expéditeur (adresse)** | `contact@ma-boutique.sn` |
| **Expéditeur (nom)** | `Ma Boutique Dakar` |

Si ce champ est laissé vide, le serveur email de la plateforme est utilisé en fallback.

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
| --- | --- |
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
| --- | --- |
| Clic sur le logo/nom boutique | Retour au tableau de bord |
| Clic sur une ligne produit | Ouvrir la fiche détail |
| Clic sur une ligne vente | Ouvrir le détail de la vente |
| Clic sur une ligne client | Ouvrir le profil client |

### En cas de problème

| Problème | Solution |
| --- | --- |
| Le POS ne répond plus | Vérifiez votre connexion internet — le mode hors-ligne prend le relais |
| Stock incorrect | Faites un ajustement d'inventaire depuis la page Stock |
| Impossible de se connecter | Contactez votre administrateur |
| Prix ne se mettent pas à jour | Actualisez la page (F5) |

---

Document généré pour la plateforme SaaS Gestion Commerciale — Afrique de l'Ouest
