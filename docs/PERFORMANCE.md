# Correctif 0.2 — vitrage et coût de rendu

Comparaison d’une même scène immobile, même seed et caméra, en 960×540, preset Économe, Chromium/SwiftShader logiciel.

| Mesure | Avant | Après |
|---|---:|---:|
| Triangles de la passe couleur | 1 232 056 | 482 822 |
| Draw calls | 154 | 119 |
| Triangles de la BMW | 917 348 | 331 668 |
| Chunks | 9 | 9 |
| Colliders | 133 | 133 |

Cela représente environ **61 % de triangles affichés en moins**, sans réduction des colliders ni de la fréquence physique. Ce chiffre ne signifie pas 61 % de FPS supplémentaires. Les fichiers sources du modèle et leurs empreintes restent identiques.

Les roues en LOD conservent les positions, normales, UV et frontières ; leur budget d’indices est réduit au chargement avec Meshoptimizer. La version complète reste accessible en Élevée. Le feuillage lointain réutilise la moitié ou le quart des cartes. Les quatre éclairages de l’ancienne maquette sont désactivés. Les vitrages sont rendus opaques et réfléchissants pour occulter l’habitacle ; des captures arrière et latérales ont été inspectées.

Automatique plafonne l’image à 1,28 million de pixels et ajuste ensuite sa résolution par fenêtres de performance ; Économe plafonne à 720 000 pixels. Ces deux modes utilisent une ombre de contact légère. Élevée conserve les ombres dynamiques à 1024², limitées à 20 mises à jour par seconde. La pause n’émet plus continuellement de rendus GPU.

19 tests numériques et 3 scénarios Playwright passent, dont les fenêtres opaques, les roues allégées et les changements de qualité sans déplacement en pause. Le moteur physique est toujours à 120 Hz ; le test de 3,1 km avec deux recentrages reste validé.

Aucun GPU matériel n’est disponible ici. La première mesure temporelle après modification partageait la machine avec d’autres tests navigateur ; elle n’est pas employée comme comparaison de FPS. Les chiffres ci-dessus proviennent des compteurs de rendu. Une validation sur la machine de l’utilisateur reste nécessaire. F3 affiche les dimensions réelles de rendu et les métriques ; le menu pause propose Automatique et Économe.
