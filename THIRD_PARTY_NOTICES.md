# Ressources et dépendances tierces

## Modèle de voiture inclus

**« Bmw M5 Competition ( The Midnight Spectre ) »**, par [Echoo (`echoo.`)](https://sketchfab.com/echoo.). Crédit supplémentaire conservé depuis la description de l'auteur : **`@thelightning`**.

- Source : https://sketchfab.com/3d-models/bmw-m5-competition-the-midnight-spectre-2831975e80604b58b88237e8c5174a93
- Licence : **CC BY-NC-ND 4.0**, https://creativecommons.org/licenses/by-nc-nd/4.0/
- Attribution distribuée avec le modèle : [public/assets/cars/ATTRIBUTION.md](public/assets/cars/ATTRIBUTION.md).
- Texte juridique complet : [public/assets/cars/LICENSE-CC-BY-NC-ND-4.0.txt](public/assets/cars/LICENSE-CC-BY-NC-ND-4.0.txt).

L'utilisateur a fourni le fichier USDZ original. Le manifeste `public/assets/cars/model.json` et les deux parties `m5-f90.glb.gz.001` / `m5-f90.glb.gz.002` livrent une conversion technique pour le navigateur, conservant la géométrie, les normales, les transformations de meshes et les valeurs PBR. Les opérations sont limitées au changement de format USDZ → glTF 2.0, à une transformation d'unité centimètres/mètres, à la convention UV, au rangement des canaux métalliques/rugosité sans redimensionnement, à la déduplication exacte des buffers et à la compression gzip sans perte. Aucune décimation, recoloration, retouche artistique des matériaux ni découpe des meshes n'a été effectuée. Les roues réutilisent des nœuds déjà séparés dans le modèle original.

Les parties font 7 000 000 et 6 001 607 octets ; leur concaténation reconstitue exactement le gzip de 13 001 607 octets (GLB décodé : 16 443 596 octets). Ce découpage de transport ne modifie aucun octet du modèle.

Le modèle contient **56 meshes, 917 348 triangles, 33 matériaux et 11 images intégrées**. Le détail et les empreintes sont dans [CONVERSION_MANIFEST.json](public/assets/cars/CONVERSION_MANIFEST.json).

Ce modèle est distribué pour un usage **non commercial**, avec attribution, selon sa licence propre. Le §2(a)(4) permet les changements de formats et modifications techniques nécessaires ; le partage d'adaptations n'est pas autorisé par cette licence. Le modèle est fourni sans garantie selon les termes de la licence. BMW et M5 sont des marques de leurs propriétaires ; aucune affiliation, approbation ou commandite n'est revendiquée.

## Textures et environnement

Les textures d'asphalte, de sol forestier et d'écorce ainsi que le HDRI Poly Haven inclus dans `public/assets` sont sous **CC0 1.0**. Crédit de courtoisie : **Poly Haven**, https://polyhaven.com/. Le manifeste [docs/asset-manifest.json](docs/asset-manifest.json) contient les URL de téléchargement et les empreintes SHA-256. Les preuves sont dans [docs/ASSET_AUDIT.md](docs/ASSET_AUDIT.md) et `docs/license-evidence/`.

## Dépendances logicielles

- Three.js : MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE
- Rapier : Apache-2.0, https://github.com/dimforge/rapier/blob/master/LICENSE
- Vite : MIT, https://github.com/vitejs/vite/blob/main/LICENSE
- TypeScript : Apache-2.0, https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt
- Vitest : MIT, https://github.com/vitest-dev/vitest/blob/main/LICENSE
- Playwright : Apache-2.0, https://github.com/microsoft/playwright/blob/main/LICENSE

Aucun code des projets de référence n'a été copié dans ce dépôt. Les trois autres modèles Sketchfab du brief (F90 et E60 de Res1n, M5 optimisée d'asset_garden) ne sont pas inclus ; leurs licences ont seulement été étudiées.

La berline de secours, les végétaux procéduraux, les textures de feuillage générées et les sons synthétiques sont des ressources de développement originales créées pour ce projet. **Aucune licence de redistribution du code original n'est choisie dans cette version.** Les licences des dépendances, des textures et du modèle de voiture restent distinctes.
