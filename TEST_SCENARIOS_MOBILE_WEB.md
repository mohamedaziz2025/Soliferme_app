# Scenarios de test mobile et web

## Objectif
Definir une base de scenarios de test fonctionnels pour valider l'application mobile (Flutter) et le front web.

## Portee
- Authentification et navigation
- Gestion des arbres (liste, recherche, details, ajout, edition)
- Analyse (mobile) et affichage des resultats
- Tableau de bord
- Gestion des erreurs reseau et permissions

## Environnements
- Mobile: Android 10+ et iOS 14+
- Web: Chrome/Edge/Firefox versions courantes
- API: baseUrl configuree vers l'environnement de test

## Donnees et comptes de test
- Compte admin: admin@test.local (mot de passe a fournir par l'equipe)
- Compte user: user@test.local (mot de passe a fournir par l'equipe)
- Arbre existant: treeId 12345, type Olivier, GPS valide
- Arbre sans fruits: fruits.present=false
- Arbre avec fruits: fruits.present=true, fruits.estimatedQuantity=10

---

## Mobile (Flutter)

### MOB-01 Connexion / deconnexion
- Objectif: verifier la connexion et la deconnexion
- Preconditions: compte valide
- Etapes:
  1. Ouvrir l'application
  2. Saisir email et mot de passe
  3. Valider la connexion
  4. Se deconnecter depuis le profil
- Resultat attendu: acces au tableau de bord puis retour a l'ecran de login

### MOB-02 Permissions camera et localisation
- Objectif: verifier les demandes de permissions
- Preconditions: permissions non accordees
- Etapes:
  1. Ouvrir l'ecran Analyse
  2. Tenter une capture photo
  3. Refuser puis re-tenter et accepter
  4. Demander la localisation
- Resultat attendu: messages clairs et analyse bloquee sans permissions

### MOB-03 Liste des arbres + recherche
- Objectif: filtrer la liste
- Preconditions: au moins 3 arbres
- Etapes:
  1. Aller a l'onglet Arbres
  2. Saisir un mot cle dans la barre de recherche
  3. Appliquer un filtre de statut
- Resultat attendu: la liste affiche seulement les arbres correspondants

### MOB-04 Process AR - selection d'arbre avec recherche
- Objectif: verifier la recherche dans la selection Process
- Preconditions: plusieurs arbres
- Etapes:
  1. Ouvrir Gestion des arbres (admin)
  2. Cliquer sur Process
  3. Saisir un mot cle dans la recherche
  4. Selectionner un arbre
- Resultat attendu: ouverture de la mesure AR pour l'arbre choisi

### MOB-05 Ajouter un arbre (admin)
- Objectif: verifier l'ajout depuis le bouton header
- Preconditions: compte admin
- Etapes:
  1. Ouvrir Gestion des arbres
  2. Cliquer sur Ajouter un arbre (bouton a cote de Process)
  3. Remplir le formulaire et valider
- Resultat attendu: nouvel arbre visible dans la liste

### MOB-06 Mesure AR + analyse auto
- Objectif: valider le flux AR -> analyse
- Preconditions: arbre existant
- Etapes:
  1. Ouvrir Process AR
  2. Mesurer une distance et sauvegarder
  3. Lancer la capture photo
- Resultat attendu: analyse demarree automatiquement

### MOB-07 Resultats analyse - fruits
- Objectif: afficher presence, nombre et estimation minimale
- Preconditions: resultat analyse disponible
- Etapes:
  1. Terminer une analyse
  2. Consulter la section Fruits detectes
- Resultat attendu: presence (Oui/Non), nombre, estimation minimale visibles

### MOB-08 Resultats analyse - redirection dashboard
- Objectif: rediriger apres analyse
- Preconditions: analyse terminee
- Etapes:
  1. Terminer une analyse
  2. Fermer la fenetre de resultats ou cliquer sur Dashboard
- Resultat attendu: retour au tableau de bord

### MOB-09 Details arbre - ergonomie
- Objectif: verifier la presentation des infos
- Preconditions: arbre existant
- Etapes:
  1. Ouvrir les details d'un arbre
  2. Verifier Resume, Mesures, Fruits, Localisation, Photos
- Resultat attendu: sections claires, valeurs lisibles, actions AR actives

### MOB-10 Offline / reseau indisponible
- Objectif: valider la gestion des erreurs reseau
- Preconditions: mode avion
- Etapes:
  1. Ouvrir l'app en mode avion
  2. Tenter un chargement de liste
- Resultat attendu: message d'erreur reseau et pas de crash

### MOB-11 Carte
- Objectif: valider l'affichage des arbres sur la carte
- Preconditions: arbres avec GPS
- Etapes:
  1. Ouvrir l'onglet Carte
  2. Verifier les marqueurs
- Resultat attendu: markers visibles et positions coherentes

### MOB-12 Archivage / restauration (admin)
- Objectif: verifier les actions admin
- Preconditions: compte admin
- Etapes:
  1. Ouvrir details d'un arbre
  2. Archiver
  3. Restaurer
- Resultat attendu: statut mis a jour et retour a la liste

---

## Web (Frontend)

### WEB-01 Connexion / deconnexion
- Objectif: verifier l'acces aux pages protegees
- Preconditions: compte valide
- Etapes:
  1. Ouvrir la page login
  2. Se connecter
  3. Se deconnecter
- Resultat attendu: navigation correcte entre login et dashboard

### WEB-02 Dashboard
- Objectif: verifier les stats et etats
- Preconditions: donnees en base
- Etapes:
  1. Ouvrir Dashboard
  2. Verifier les stats rapides
- Resultat attendu: chiffres coherents et aucun blocage

### WEB-03 Liste arbres + recherche + filtre
- Objectif: verifier le filtrage
- Preconditions: plusieurs arbres
- Etapes:
  1. Ouvrir la liste des arbres
  2. Rechercher par type ou ID
  3. Filtrer par statut
- Resultat attendu: liste filtree correctement

### WEB-04 Details arbre
- Objectif: verifier l'affichage des infos
- Preconditions: arbre existant
- Etapes:
  1. Ouvrir les details d'un arbre
  2. Verifier mesures, statut, fruits, localisation
- Resultat attendu: infos claires et completes

### WEB-05 Ajouter un arbre (admin)
- Objectif: valider le formulaire
- Preconditions: compte admin
- Etapes:
  1. Ouvrir l'ecran Ajout
  2. Remplir les champs obligatoires
  3. Valider
- Resultat attendu: arbre cree et visible

### WEB-06 Editer un arbre (admin)
- Objectif: valider la mise a jour
- Preconditions: compte admin
- Etapes:
  1. Ouvrir un arbre
  2. Modifier mesures et fruits
  3. Sauvegarder
- Resultat attendu: donnees mises a jour

### WEB-07 Archivage / restauration
- Objectif: valider le cycle de vie
- Preconditions: compte admin
- Etapes:
  1. Archiver un arbre
  2. Confirmer
  3. Restaurer
- Resultat attendu: statut change correctement

### WEB-08 Gestion erreurs reseau
- Objectif: verifier les messages d'erreur
- Preconditions: couper l'API
- Etapes:
  1. Charger la liste des arbres
- Resultat attendu: message clair et pas de crash

### WEB-09 Navigation et acces roles
- Objectif: controler les droits
- Preconditions: compte user et admin
- Etapes:
  1. Se connecter en user
  2. Verifier absence des actions admin
  3. Se connecter en admin et verifier presence
- Resultat attendu: actions admin visibles uniquement pour admin

### WEB-10 Responsive
- Objectif: valider l'affichage mobile web
- Preconditions: navigateur
- Etapes:
  1. Activer vue mobile dans le navigateur
  2. Verifier dashboard et liste arbres
- Resultat attendu: mise en page lisible sans debordement
