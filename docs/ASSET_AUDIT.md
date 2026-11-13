# Audit des ressources — drive2forget

Vérification effectuée le 13 novembre 2026. Les fichiers listés comme obtenus sont réellement présents dans `public/assets/` une fois copiés dans le projet ; aucune URL distante n'est nécessaire à leur utilisation en jeu. Le manifeste `docs/asset-manifest.json` fournit pour chaque fichier l'URL de téléchargement officielle, la taille, la résolution et l'empreinte SHA-256.

## Ressources obtenues

| Ressource | Fichiers | Résolution | Licence | Source |
|---|---|---|---|---|
| Asphalte Poly Haven `asphalt_02` | `asphalt_02_diff_2k.jpg`, `asphalt_02_nor_gl_2k.jpg`, `asphalt_02_rough_2k.jpg` | 2048² | CC0 1.0 | https://polyhaven.com/a/asphalt_02 |
| Sol de forêt Poly Haven `forest_ground_04` | `forest_ground_04_diff_2k.jpg`, `forest_ground_04_nor_gl_2k.jpg`, `forest_ground_04_rough_2k.jpg` | 2048² | CC0 1.0 | https://polyhaven.com/a/forest_ground_04 |
| Écorce Poly Haven `bark_brown_02` | `bark_brown_02_diff_1k.jpg`, `bark_brown_02_nor_gl_1k.jpg`, `bark_brown_02_rough_1k.jpg` | 1024² | CC0 1.0 | https://polyhaven.com/a/bark_brown_02 |
| Environnement HDRI Poly Haven `forest_slope` | `forest_slope_1k.hdr` | 1024×512 | CC0 1.0 | https://polyhaven.com/a/forest_slope |

Volume total des dix fichiers obtenus : **26 502 292 octets**, environ 25,3 Mio. Les fichiers proviennent directement du CDN officiel `https://dl.polyhaven.org/file/ph-assets/`.

### Preuve de licence Poly Haven

Les pages `polyhaven.com` et l'API `api.polyhaven.com` renvoient HTTP 403 dans cet environnement, alors que le CDN officiel fonctionne. La politique de licence a donc été vérifiée dans le dépôt source officiel du site, fichier :

https://github.com/Poly-Haven/polyhaven.com/blob/master/public/locales/en/license.json

Ce texte officiel précise : « Our assets are all licensed as CC0 », autorise l'usage commercial et la redistribution, et n'impose pas d'attribution. Une copie de preuve est conservée dans `docs/license-evidence/ph_asset_license.json`. La licence de leur logiciel/add-on ne doit pas être confondue avec celle des assets : le présent projet ne réutilise pas le code de l'add-on.

Crédit de courtoisie recommandé : **Textures et HDRI : Poly Haven, CC0**. Aucun fichier AO, KTX2 ou texture 4K n'a été téléchargé et aucun modèle d'arbre tiers n'a été obtenu. Les cartes normales sont explicitement **OpenGL** (`nor_gl`). Les cartes diffuses doivent être chargées en sRGB ; les normales et rugosités restent en espace linéaire. Il faut appliquer répétition, mipmaps et filtrage anisotrope au chargement.

## BMW M5 Competition « The Midnight Spectre » — fichier fourni ensuite par l'utilisateur

Fichier reçu : `Bmw_M5_Competition__The_Midnight_Spectre.usdz`, **13,681,029 octets** (SHA-256 `99eeade5f88047cd1b0ac26bc336ce79d7cfd341c8a192d3b017ad52ec97863d`). Archive inspectée : `scene.usdc` et 16 textures JPEG. Aucun fichier de licence séparé n'est présent, mais la scène USD contient directement les métadonnées d'auteur, de licence, de titre et d'identifiant Sketchfab décrites ci-dessous.

Une recherche par le titre exact dans l'API publique Sketchfab donne un résultat correspondant :

- **Titre :** Bmw M5 Competition ( The Midnight Spectre ).
- **Auteur :** [Echoo](https://sketchfab.com/echoo.), nom d'utilisateur `echoo.`.
- **Source :** https://sketchfab.com/3d-models/bmw-m5-competition-the-midnight-spectre-2831975e80604b58b88237e8c5174a93
- **Identifiant :** `2831975e80604b58b88237e8c5174a93`.
- **Licence exacte déclarée :** [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/), attribution, usage non commercial, pas de partage d'adaptations.
- **Crédit supplémentaire dans la description :** `Credits : @thelightning`.
- **Métadonnées de la page :** 475 666 sommets, 917 348 faces ; publication le 5 novembre 2025 ; `isDownloadable: true`.
- **Preuve :** réponse complète de `https://api.sketchfab.com/v3/models/2831975e80604b58b88237e8c5174a93` conservée dans `docs/license-evidence/bmw_midnight_spectre.json`.

La provenance est corroborée par les chaînes de métadonnées incorporées dans `scene.usdc` : `Echoo (https://sketchfab.com/echoo.)`, `CC-BY-NC-ND-4.0 (http://creativecommons.org/licenses/by-nc-nd/4.0/)`, `Bmw M5 Competition ( The Midnight Spectre )` et l'identifiant `2831975e80604b58b88237e8c5174a93`. Elles correspondent à la réponse officielle de l'API. Les chaînes et l'empreinte du fichier sont consignées dans `docs/license-evidence/uploaded-usdz-provenance.json`. Le modèle relève de cette licence CC BY-NC-ND, et non de la CC BY des trois autres BMW du brief.

### Conversion intégrée et contrôlée

Le modèle fourni est maintenant inclus via **`public/assets/cars/model.json`**, qui référence deux parties statiques : **`m5-f90.glb.gz.001` (7 000 000 octets)** et **`m5-f90.glb.gz.002` (6 001 607 octets)**. Il ne s'agit plus de la berline procédurale de secours. La concaténation des parties dans l'ordre du manifeste reconstitue exactement le gzip de **13 001 607 octets**, soit environ 12,4 Mio ; le GLB décodé pèse **16 443 596 octets**. Le découpage concerne uniquement le transport des octets : aucun contenu du modèle n'est modifié. Le chargeur vérifie l'empreinte du gzip assemblé avant décompression. Aucun fichier combiné `m5-f90.glb.gz` n'est distribué dans `public/`.

Le contrôle indépendant des deux parties, de leur concaténation, du gzip et du JSON glTF confirme **56 meshes, 917 348 triangles, 602 519 entrées de sommets, 33 matériaux et 11 images intégrées**. Le nombre de triangles correspond exactement aux métadonnées de la source Sketchfab ; les entrées de sommets glTF incluent les doublons nécessaires aux normales/UV et ne doivent pas être confondues avec le nombre de sommets uniques affiché par Sketchfab.

- Empreinte SHA-256 du gzip : `285696191404155d293fe681deb2c86c6aeb3482b2064248b5606f45c88ba8e6`.
- Empreinte SHA-256 du GLB décodé : `0cd05b49b8320ec3437c26a56644897683b1c5007571035c29d048f0a3d8743b`.
- Le manifeste [CONVERSION_MANIFEST.json](../public/assets/cars/CONVERSION_MANIFEST.json) donne les correspondances entre chacun des 56 meshes et son chemin dans la scène USD d'origine.
- Le contrôle des tailles, empreintes et nombres d'éléments est conservé dans `docs/license-evidence/converted-glb-audit.json` et le modèle figure dans `docs/asset-manifest.json`.

**Opérations techniques déclarées et conservées :** changement de format USDZ → glTF 2.0 ; nœud de conversion d'unité centimètres/mètres ; conversion de la convention de coordonnées de texture ; rangement des canaux métalliques/rugosité en PNG sans redimensionnement ; déduplication de buffers strictement identiques ; compression gzip sans perte, puis découpage binaire de transport en deux parties. Les positions de géométrie, normales, transformations de meshes et valeurs PBR sont conservées. **Aucune décimation, recoloration, retouche artistique de matériau ni découpe de mesh.** Les animations réutilisent les nœuds de pneus et jantes déjà séparés dans l'original.

L'attribution distribuée est [public/assets/cars/ATTRIBUTION.md](../public/assets/cars/ATTRIBUTION.md). Le texte juridique complet est présent localement dans [LICENSE-CC-BY-NC-ND-4.0.txt](../public/assets/cars/LICENSE-CC-BY-NC-ND-4.0.txt). Le modèle conserve sa licence non commerciale CC BY-NC-ND 4.0, séparément du code du jeu et des textures CC0.

### Portée exacte de cette licence

Le texte juridique complet a été consulté dans le dépôt officiel Creative Commons et conservé dans `docs/license-evidence/cc_by_nc_nd_4_legalcode.html` :

https://github.com/creativecommons/cc-legal-tools-data/blob/main/docs/licenses/by-nc-nd/4.0/legalcode.en.html

- **§2(a)(1)(A)** autorise à reproduire et partager le matériel licencié, en tout ou partie, **à des fins non commerciales**.
- **§2(a)(1)(B)** autorise à produire et reproduire une adaptation à des fins non commerciales, mais **pas à la partager**.
- **§2(a)(4)** autorise explicitement les changements techniques nécessaires pour utiliser d'autres médias ou formats : « simply making modifications authorized by this Section 2(a)(4) never produces Adapted Material ». Une conversion de format USDZ → GLB, conservant le contenu, n'est donc pas interdite par principe.
- **§3(a)** impose de conserver l'identité des créateurs et autres personnes désignées pour attribution, les liens source/licence, les notices fournies et l'indication des modifications. Le crédit `@thelightning` doit donc être conservé.
- La définition **NonCommercial** vise un usage qui n'est pas principalement destiné à un avantage commercial ou à une compensation monétaire. Un accès public n'est pas à lui seul une utilisation commerciale ; la qualification dépend de l'usage réel.

**Conséquence pour ce projet :** l'original ou une conversion de format conservant son contenu peut être distribué à des fins non commerciales avec attribution. La licence n'interdit pas en elle-même une publication GitHub. L'inspection du modèle a trouvé les roues et jantes déjà séparées dans les meshes d'origine : leur réutilisation ne nécessite donc pas de découpe de topologie. La conversion technique à publier doit conserver la géométrie et les matériaux, sans décimation ni retouche artistique. Une adaptation du modèle (par exemple réduction de topologie ou retouche du design) ne peut pas être partagée sous cette licence sans autorisation supplémentaire. Les textures Poly Haven restent sous CC0 et les dépendances conservent leurs licences propres. Aucune licence de redistribution du code original du jeu n'a encore été choisie. La licence CC BY-NC-ND du modèle demeure distincte et ne doit pas être remplacée par celle d'une dépendance.

### Attribution à conserver avec ce modèle

> « Bmw M5 Competition ( The Midnight Spectre ) », Echoo (`echoo.`), crédit supplémentaire `@thelightning`. Source : https://sketchfab.com/3d-models/bmw-m5-competition-the-midnight-spectre-2831975e80604b58b88237e8c5174a93 — Licence CC BY-NC-ND 4.0 : https://creativecommons.org/licenses/by-nc-nd/4.0/. Conversion technique USDZ → glTF 2.0 pour navigateur, adaptation des unités/conventions UV, rangement des canaux métalliques/rugosité, déduplication exacte des buffers et compression gzip sans perte ; géométrie et valeurs PBR conservées, sans retouche artistique. Aucune affiliation ou approbation BMW/Echoo n'est revendiquée.

## Autres BMW du brief : licences vérifiées, modèles non obtenus

Les trois URL du brief ont été vérifiées via l'API publique officielle Sketchfab. Les réponses JSON complètes sont conservées dans `docs/license-evidence/`.

| Modèle | Auteur indiqué par Sketchfab | Licence exacte affichée | Téléchargement réel |
|---|---|---|---|
| [BMW M5 F90](https://sketchfab.com/3d-models/bmw-m5-f90-5478e978bd634337adc8e3dc413fbfa3) | [Res1n](https://sketchfab.com/Res1n) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | API indique `isDownloadable: true`, mais `/v3/models/5478e978bd634337adc8e3dc413fbfa3/download` renvoie **401 Unauthorized** sans authentification Sketchfab |
| [BMW M5 E60](https://sketchfab.com/3d-models/update-bmw-m5-e60-b636672276ef40bc9e2738d9de0377f2) | Res1n | CC BY 4.0 | Non téléchargé ; F90 prioritaire |
| [BMW M5 optimisée](https://sketchfab.com/3d-models/bmw-m5-a4b89af8a91a48b98eb464e1b5493e35) | [asset_garden](https://sketchfab.com/asset_garden) | CC BY 4.0 | Non téléchargé ; F90 prioritaire |

Aucun de ces meshes ou textures n'est intégré. Le caractère téléchargeable et la licence affichée ne garantissent pas à eux seuls les droits sur les marques ou une garantie de provenance de l'auteur. L'audit rapporte la licence exacte déclarée, sans prétendre avoir effectué une expertise juridique.

### Alternative sous licence plus permissive : F90 de Res1n

1. Se connecter à Sketchfab dans son propre navigateur.
2. Ouvrir la page de la F90 de Res1n ci-dessus, cliquer sur **Download 3D Model**, choisir glTF/GLB si proposé, et télécharger l'archive complète avec les textures et la licence.
3. Fournir ce fichier au projet. Ne pas transmettre de mot de passe ou de jeton de compte.
4. Inspecter le modèle, ses dimensions, son orientation et sa hiérarchie ; séparer les quatre roues dans Blender si nécessaire, puis produire un GLB optimisé. Cette inspection et cette optimisation **restent à faire**, puisque le fichier n'a pas été obtenu.
5. Conserver l'attribution : « Bmw M5 F90, Res1n, https://sketchfab.com/3d-models/bmw-m5-f90-5478e978bd634337adc8e3dc413fbfa3, CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ ». Indiquer les modifications réellement réalisées (optimisation, séparation des roues, changement de matériaux, etc.).

La F90 de Res1n constitue seulement une alternative : la voiture actuellement intégrée est la M5 Competition « The Midnight Spectre » d'Echoo décrite plus haut. La berline procédurale reste un véhicule de développement de secours.

## Éléments provisoires à remplacer/valider

- Le modèle M5 Competition d'Echoo est intégré par conversion technique préservant le contenu. Ses 917 348 triangles ne sont pas réduits ; les performances GPU et le rendu en jeu restent à valider. Sa licence réserve l'usage au non commercial et ne permet pas le partage d'adaptations artistiques. La F90 alternative de Res1n n'est pas incluse.
- La végétation procédurale créée par le projet est une ressource de développement ; aucun arbre scanné ou modèle tiers détaillé n'a été validé.
- Aucun enregistrement moteur/pneu/vent/forêt sous licence n'a été obtenu. Toute synthèse audio doit être indiquée comme telle.
- Le HDRI local est un éclairage d'environnement 1K ; il ne remplace pas une validation des ombres et de la végétation sur GPU réel.
- Aucune compression KTX2/Basis n'est revendiquée : les fichiers obtenus sont JPEG/HDR. Une conversion future devra préserver sRGB/linéaire et contrôler le résultat.
