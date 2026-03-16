# Modeles IA mobiles

Le modele principal attendu par l'application est:

- mobilenet_v2_tree_health.tflite

Chemin attendu:

- assets/models/mobilenet_v2_tree_health.tflite

Compatibilite legacy prise en charge par le code:

- assets/models/tree_health_model.tflite
- assets/models/tree_analysis_model.tflite

Contraintes minimales pour la compatibilite runtime:

- Format TFLite
- Entree image: [1, 224, 224, 3]
- Sortie: 5 classes (healthy, nutrient_deficiency, pest_infestation, disease, water_stress)

Validation rapide:

1. Lancer l'application
2. Ouvrir une analyse d'arbre
3. Verifier l'absence d'erreur de chargement de modele
4. Verifier que la reponse inclut model_path
