# État de validation — drive2forget 0.2

État au **13 novembre 2026**. Il s'agit d'une **alpha physique jouable**. La BMW M5 Competition « The Midnight Spectre » fournie par l'utilisateur est intégrée ; son contrôle visuel initial est effectué. La végétation procédurale et l'audio synthétisé restent provisoires. Le rendu final demandé n'est pas validé.

## Vérifications exécutées

- **19 tests numériques réussis** : véhicule, pas fixe, route, terrain, chunks et intégration.
- Parcours automatisé de **plus de 3 km**, avec **deux rebases** de l'origine, maintien du support physique et ressources bornées.
- Vérification TypeScript et **build de production réussis**.
- BMW : conversion USDZ → GLB effectuée, chargement local et raccordement aux quatre roues physiques implémentés. 56 meshes, 917 348 triangles, 33 matériaux et 11 textures ; aucune décimation.
- **3 scénarios Playwright réussis** : accueil, introduction, BMW chargée, immobilité, accélération clavier, pause/reprise Échap, reset, réduction des effets et passage de l’introduction. Captures 1920×1080 et 2560×1440 obtenues en mode léger ; commandes vérifiées ensuite en 640×360. Aucun échec HTTP ni erreur JavaScript dans le scénario principal.
- **Build de production démarré sous `/drive2forget/`** : 30 réponses HTTP contrôlées, aucune réponse en erreur et aucune erreur JavaScript.
- Une capture avec ombres élevées sous rendu logiciel avait dépassé le délai. La fluidité sur GPU réel reste à mesurer.
- Aucune calibration sur GPU dédié ni validation d'un objectif de 60 FPS. La configuration Playwright actuelle utilise Chromium avec **SwiftShader logiciel**.

## Critères du brief

| # | Critère | État et preuve disponible |
|---|---|---|
| 1 | Accueil noir et COMMENCER | Validé par Playwright. |
| 2 | Phares, transition blanche fluide | Séquence lumineuse progressive implémentée, réduction des effets et bouton passer ; fluidité sur GPU cible à vérifier. |
| 3 | BMW M5 crédible | Modèle BMW M5 Competition fourni intégré avec matériaux et géométrie conservés ; modèle inspecté visuellement ; coût sur GPU réel à mesurer. |
| 4 | Départ immobile près de la forêt | Repos validé par les tests physiques et Playwright ; quatre contacts et vitesse nulle au départ. |
| 5 | Quatre roues réagissant physiquement | Suspensions indépendantes et contact sur bosse testés ; roues et jantes d'origine du modèle raccordées à la suspension, au braquage et à la rotation. Contrôle visuel initial effectué. |
| 6 | Transferts et mouvements de carrosserie | Forces appliquées au châssis et antiroulis implémentés ; comportement de production à calibrer. |
| 7 | Caméra stable derrière le véhicule | Suivi amorti, interpolation et collision implémentés ; confort de conduite à valider humainement. |
| 8 | Asphalte PBR net | Textures locales 2K, répétition et filtrage intégrés ; raccords UV testés, contrôle visuel final à compléter. |
| 9 | Forêt et sol crédibles | Sol PBR et arbres ramifiés instanciés présents ; végétation procédurale de développement, réalisme final non atteint. |
| 10 | Long trajet sans limite longitudinale | Streaming déterministe testé sur plus de 3 km ; trajets prolongés et conduite libre humaine restent à vérifier. |
| 11 | Raccords entre chunks | Positions, normales, UV et support Rapier aux raccords testés ; absence de couture visible à confirmer sur les captures finales. |
| 12 | Cohérence après demi-tour | Destruction puis reconstruction identique des segments et de la forêt testées ; demi-tour conduit à valider en navigateur. |
| 13 | Physique sans comportement aberrant | Tests repos, pédales, direction, bosse et parcours long réussis ; cas extrêmes et réglage final encore ouverts. |
| 14 | Performances stables dans la durée | Nombre de chunks et colliders borné et nettoyage testés ; profilage GPU/mémoire prolongé non réalisé. |
| 15 | Build et chargement des assets | Build et démarrage statique sous `/drive2forget/` validés sans erreur HTTP/JavaScript ; publication publique non activée. |

« Implémenté » indique la présence d'un comportement fonctionnel dans le code ; cela ne signifie pas que tous les aspects visuels, matériels ou subjectifs du critère sont validés.

## Travail restant

1. Prolonger la validation sur GPU réel et en conduite humaine de la BMW fournie ; contrôle visuel initial effectué. Le modèle est chargé via `VehicleVisual.loadLicensedModel()` depuis `assets/cars/model.json` et ses deux parties gzip (13 001 607 octets ; GLB décompressé de 16 443 596 octets). Vérifier son coût élevé en géométrie sans présenter une décimation ou des LOD comme déjà réalisés.
2. Remplacer ou améliorer la végétation de développement ; obtenir des sons enregistrés sous licences compatibles. La synthèse actuelle n'est pas un enregistrement automobile.
3. Calibrer les suspensions, le couple et le modèle de pneus approximatif. Aucun modèle Pacejka complet ni validation par données mesurées.
4. Mesurer les performances sur matériel disponible, tester longuement la conduite et profiler les ressources. KTX2/Basis, LOD/imposteurs et génération par worker restent non implémentés.
5. Activer GitHub Pages avec la source **GitHub Actions** si une publication publique est souhaitée ; vérifier ensuite son URL et les chargements sous `/drive2forget/`.

Les réglages de rendu changent immédiatement les ombres, la résolution et les LOD. La densité initiale reste conservée sans reconstruction du monde. Les assets essentiels sont locaux ; les tests de chargement doivent néanmoins contrôler leurs réponses HTTP après déploiement.

Le modèle effectivement utilisé est **« Bmw M5 Competition ( The Midnight Spectre ) », Echoo, crédit supplémentaire @thelightning**, [source](https://sketchfab.com/3d-models/bmw-m5-competition-the-midnight-spectre-2831975e80604b58b88237e8c5174a93), **[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)**. Les métadonnées du USDZ et l'API officielle concordent. Cette licence est distincte de celle de la F90 Res1n initialement étudiée. La conversion de format conservant le contenu relève du §2(a)(4) ; la distribution doit conserver les crédits et rester non commerciale. Les roues étaient séparées dans le fichier d'origine. Aucun changement de topologie, de design ou de couleur n'a été effectué ; les opérations techniques sont consignées dans [CONVERSION_MANIFEST.json](../public/assets/cars/CONVERSION_MANIFEST.json).

Les sources et preuves sont détaillées dans [ASSET_AUDIT.md](ASSET_AUDIT.md). Aucun droit de redistribution du code original n'est choisi par défaut ; les licences tierces demeurent distinctes.

## Correctif 0.2 — retour utilisateur

- Vitrages extérieurs opaques et réfléchissants ; suppression de la vue traversante du sol et des plantes. Images de contrôle arrière et latérales inspectées.
- 331 668 triangles pour la BMW en Automatique/Économe contre 917 348 dans la source complète ; roue et jante restent indépendantes physiquement.
- Sur la scène de référence Économe 960×540 : 482 822 triangles et 119 draw calls après optimisation, contre 1 232 056 et 154 avant.
- Suppression de quatre lumières inutiles, LOD du feuillage éloigné, plafonds de pixels et qualité automatique adaptative. Les colliders et la simulation physique sont conservés.
- Les modifications de qualité s’appliquent en direct. La densité de génération initiale est conservée pour la cohérence de la forêt ; aucun rechargement n’est nécessaire pour changer les LOD, la résolution ou les ombres.
- Build et vérification TypeScript réussis ; 19 tests numériques et 3 scénarios navigateur réussis. Pas de benchmark GPU matériel ni promesse de 60 FPS.
