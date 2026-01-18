// Guide d'utilisation de la mesure AR des arbres

## 📏 Fonctionnalité de Mesure AR

### Qu'est-ce que c'est ?

La mesure AR (Réalité Augmentée) permet de mesurer la hauteur, la largeur et la circonférence des arbres en temps réel à l'aide de la caméra de votre appareil.

### Comment ça fonctionne ?

1. **Calibration** : Vous devez indiquer votre distance approximative par rapport à l'arbre (2 mètres par défaut)
2. **Capture** : Activez la caméra et pointez-la vers l'arbre
3. **Marquage** : Cliquez sur deux points pour effectuer une mesure
   - Pour la hauteur : Cliquez sur la base puis sur le sommet de l'arbre
   - Pour la largeur : Cliquez sur les deux extrémités de la couronne
   - Pour la circonférence : Mesurez le tronc à hauteur d'homme
4. **Enregistrement** : Sauvegardez vos mesures dans la base de données

### Fonctionnalités

#### ✅ Mesures disponibles
- **Hauteur** : Mesure verticale de la base au sommet
- **Largeur** : Diamètre de la couronne
- **Circonférence** : Périmètre du tronc

#### 🎯 Précision
La précision dépend de plusieurs facteurs :
- Distance par rapport à l'arbre (2-5m recommandé)
- Stabilité de la caméra
- Conditions d'éclairage
- Angle de vue

#### 💡 Conseils pour une meilleure précision

1. **Positionnement**
   - Tenez-vous à une distance fixe de l'arbre
   - Gardez le téléphone stable
   - Évitez les mouvements brusques

2. **Éclairage**
   - Privilégiez un bon éclairage naturel
   - Évitez les contre-jours
   - Mesurez de préférence en mi-journée

3. **Calibration**
   - Ajustez la distance de calibration selon votre position réelle
   - Plus la distance est précise, meilleure sera la mesure
   - Utilisez un mètre si possible pour calibrer

4. **Marquage des points**
   - Cliquez précisément sur les points de mesure
   - Pour la hauteur : base du tronc et point le plus haut
   - Pour la largeur : extrémités opposées de la couronne
   - Évitez les zones avec des ombres ou des occlusions

### Utilisation avancée

#### Mesures multiples
Vous pouvez effectuer plusieurs mesures sur le même arbre :
1. Mesurez d'abord la hauteur
2. Changez de mode pour mesurer la largeur
3. Puis la circonférence si nécessaire
4. Toutes les mesures seront enregistrées ensemble

#### Historique
L'application conserve un historique de vos mesures :
- Consultez les mesures passées
- Comparez les évolutions
- Exportez les données

### Technologies utilisées

#### Caméra Web API
- Accès à la caméra de l'appareil
- Streaming vidéo en temps réel
- Compatible mobile et desktop

#### Canvas API
- Dessin des points de mesure
- Visualisation des distances
- Interface interactive

#### Calculs géométriques
- Distance euclidienne entre deux points
- Calibration basée sur la distance réelle
- Conversion pixels → mètres

### Améliorations futures

1. **AR.js / WebXR**
   - Tracking 3D réel
   - Détection de surface
   - Marqueurs AR

2. **IA & Computer Vision**
   - Détection automatique des arbres
   - Segmentation d'image
   - Estimation automatique de la hauteur

3. **Capteurs**
   - Utilisation de l'accéléromètre
   - Gyroscope pour la stabilisation
   - GPS pour la localisation

4. **Précision**
   - Algorithmes de SLAM (Simultaneous Localization and Mapping)
   - Fusion de capteurs
   - Machine Learning pour l'amélioration

### Limitations actuelles

⚠️ **Points d'attention** :
- La précision actuelle est approximative (±10-20%)
- Nécessite une calibration manuelle
- Fonctionne mieux avec des arbres isolés
- Conditions météo peuvent affecter la mesure
- Nécessite des permissions caméra

### Support technique

Si vous rencontrez des problèmes :
1. Vérifiez les permissions de la caméra
2. Essayez avec un autre navigateur
3. Recalibrez la distance
4. Assurez-vous d'avoir une bonne connexion

### Compatibilité

✅ **Navigateurs supportés** :
- Chrome/Edge (recommandé)
- Firefox
- Safari (iOS 11+)
- Samsung Internet

✅ **Appareils** :
- Smartphones Android/iOS
- Tablettes
- Ordinateurs avec webcam

---

**Note** : Pour une précision professionnelle, il est recommandé d'utiliser des instruments de mesure dédiés (clinomètre, télémètre laser, etc.). Cette fonctionnalité AR est une aide pratique pour des estimations rapides sur le terrain.
