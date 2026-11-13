# drive2forget

Une expérience de conduite libre en forêt, pour navigateur PC. Aucun classement, adversaire ou objectif imposé.

**Version 0.1 : prototype physique jouable / alpha.** La BMW M5 Competition « The Midnight Spectre » fournie par l'utilisateur est intégrée, avec ses roues d'origine animées par les suspensions. Le modèle et ses roues ont été inspectés visuellement ; la végétation et l'audio restent provisoires. Le rendu photoréaliste final n'est pas validé. L'état détaillé des critères figure dans [docs/STATUS.md](docs/STATUS.md).

## Installer et lancer

Prérequis : Node.js **22.12 ou plus récent** et npm. L'environnement de développement utilise Node 24.

```sh
npm ci
npm run dev
```

Ouvrir **http://localhost:5173**, attendre le chargement, puis cliquer sur **COMMENCER**. Le décor reste caché avant l'introduction. Le son démarre après cette interaction, conformément aux règles des navigateurs. L'option de réduction des effets lumineux est accessible dès l'accueil ; l'introduction peut être passée.

```sh
npm test          # tests physique, monde, intégration et pas fixe
npm run check     # vérification TypeScript
npm run test:e2e  # scénarios navigateur Playwright
npm run build     # compilation de production dans dist/
npm run preview   # http://localhost:4173
```

Les tests Playwright démarrent Vite si nécessaire. La configuration utilise `/usr/bin/chromium` par défaut. Sur une autre machine, définir `CHROMIUM_PATH` avec le chemin d'un Chromium installé. `npx playwright install chromium` permet aussi d'installer celui de Playwright ; renseigner ensuite son chemin dans `CHROMIUM_PATH`. Les options actuelles de test forcent **SwiftShader**, donc un rendu logiciel : leurs résultats ne prouvent aucune performance sur GPU dédié. Pour calibrer un véritable GPU, adapter ces options puis mesurer sur la machine cible.

## Commandes

| Commande | Action |
|---|---|
| Z / W / ↑ | Accélérer |
| S / ↓ | Freiner, puis maintenir à l'arrêt pour reculer |
| Q / A / ← | Braquer à gauche |
| D / → | Braquer à droite |
| Espace | Frein de stationnement |
| C | Parcourir les trois distances de caméra |
| Glisser la souris à l'arrêt | Regarder autour de la voiture |
| R | Replacer la voiture sur l'accotement à la position actuelle |
| Échap / bouton pause | Mettre en pause ou reprendre |
| F3 | Afficher les métriques de diagnostic |

AZERTY et QWERTY fonctionnent sans changement de configuration. Une prise en charge initiale des manettes au mapping standard est présente : stick gauche, gâchettes droite/gauche, bouton principal pour le frein à main et Start pour la pause. Elle nécessite une validation sur du matériel réel.

Le menu pause propose le volume, la réduction des effets lumineux et la qualité. **Légère** réduit immédiatement la résolution et désactive les ombres ; recharger la page applique aussi la densité réduite de végétation. Le choix est conservé localement. Une perte de focus efface les commandes ; masquer l'onglet met le jeu en pause.

## Ce qui est implémenté

- Three.js, TypeScript et Vite ; Rapier WASM pour le châssis rigide et les collisions.
- Physique à **120 Hz**, accumulation bornée et interpolation du rendu. Quatre rayons de suspension indépendants, ressorts, amortisseurs, antiroulis et forces de pneus appliquées aux points de contact.
- Courbe de couple, rapports automatiques, frein moteur, freinage, marche arrière, frein à main et direction adoucie selon la vitesse. Masse et réglages inspirés d'une berline sportive, avec approximations configurables dans `src/config/vehicle.ts`.
- Adhérence longitudinale et latérale combinée par ellipse de friction ; différence entre route et accotement. Ce modèle réglable ne constitue pas une validation automobile expérimentale ni un modèle Pacejka complet.
- Caméra amortie, champ de vision variable, modes de distance et rayons de collision.
- Route déterministe de 7 m, terrain et collisions continus, chunks de 96 m, conservation bornée et floating origin. Les demi-tours reconstruisent les mêmes segments depuis la seed.
- Modèle BMW local avec quatre ensembles de roues d'origine raccordés à la physique ; géométrie et matériaux conservés lors de la conversion USDZ → GLB.
- Textures PBR locales, éclairage HDRI local, ombres, végétation instanciée et introduction lumineuse progressive. Les cartes d'ombres se recalculent lors des changements de pose ou de chunks ; elles sont réutilisées à l'arrêt.
- Audio synthétisé : moteur, pneus, vent et ambiance. Aucun enregistrement moteur réel n'est revendiqué.

L'architecture est séparée entre `core/`, `vehicle/`, `world/`, `graphics/`, `input/` et `audio/`. `BiomeProvider` permet de préparer d'autres environnements ; seule la forêt est implémentée. Les motivations et références figurent dans [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md).

## Ressources et BMW M5

Les textures d'asphalte, sol forestier et écorce ainsi que le HDRI proviennent de **Poly Haven, CC0**. Ils sont inclus dans `public/assets/` : aucun asset essentiel ne dépend d'un CDN pendant le jeu. Les dépendances JavaScript et WASM sont compilées localement. Voir [l'audit et les crédits](docs/ASSET_AUDIT.md), [le manifeste avec empreintes SHA-256](docs/asset-manifest.json) et les preuves de licence dans `docs/license-evidence/`.

Le modèle chargé au démarrage est **« Bmw M5 Competition ( The Midnight Spectre ) »**, par [Echoo](https://sketchfab.com/echoo.), crédit supplémentaire **@thelightning**. [Source Sketchfab](https://sketchfab.com/3d-models/bmw-m5-competition-the-midnight-spectre-2831975e80604b58b88237e8c5174a93), **[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)**. Cette licence est celle du fichier USDZ effectivement fourni, corroborée par ses métadonnées et l'API Sketchfab. Elle diffère de la CC BY 4.0 du modèle Res1n initialement étudié, qui n'est pas utilisé.

Le modèle peut être partagé avec attribution **à des fins non commerciales**. Le §2(a)(4) de la licence autorise les changements techniques de format nécessaires ; il n'autorise pas le partage d'adaptations artistiques ou de géométrie. La conversion conserve la géométrie, les normales et les paramètres de matériaux d'origine : conversion d'unités et d'UV, regroupement technique des canaux de textures et déduplication exacte, **sans décimation ni recoloration**. Les roues et jantes étaient déjà séparées ; leurs meshes sont animés à l'exécution sans découpe de topologie. Les opérations et empreintes sont consignées dans [CONVERSION_MANIFEST.json](public/assets/cars/CONVERSION_MANIFEST.json). Aucune affiliation ou approbation BMW/Echoo n'est revendiquée.

`VehicleVisual.loadLicensedModel()` charge réellement `public/assets/cars/model.json` et ses deux parties gzip : **13 001 607 octets**, décompressés en un GLB de **16 443 596 octets**, contenant **56 meshes, 917 348 triangles, 33 matériaux et 11 textures**. La décompression utilise `DecompressionStream` dans un navigateur récent. Ce poids géométrique est conservé pour respecter le contenu fourni ; son coût, les matériaux et le raccordement visuel des roues restent à vérifier sur GPU réel. Aucune optimisation de topologie ou LOD du modèle n'est revendiquée.

## Production et GitHub Pages

Le build produit un site statique dans `dist/`. La base Vite est **`./`**, compatible avec un sous-chemin tel que `/drive2forget/`. Le workflow GitHub Actions du dépôt construit et publie cet artefact.

Dans le dépôt, choisir **Settings → Pages → Build and deployment → Source : GitHub Actions**, puis exécuter le workflow de déploiement. L'activation de Pages et le succès du déploiement sont nécessaires avant de considérer une URL publique comme disponible. Pour un autre hébergeur statique, publier le contenu de `dist/` avec ses sous-dossiers. Ouvrir directement `index.html` en `file://` ne convient pas au chargement des modules et du WASM.

## Validation et limites

Les 15 tests numériques couvrent notamment le repos, l'accélération et le freinage, la marche arrière, les contacts indépendants, les raccords, le déterminisme, la destruction des colliders et un parcours de **plus de 3 km avec deux déplacements d'origine**. Ils ne remplacent pas une session de conduite humaine. Le build de production et TypeScript passent. Les résultats navigateur et des captures sont consignés dans [docs/STATUS.md](docs/STATUS.md).

Restent notamment : validation sur GPU réel de la BMW et de ses roues, arbres et sons de production, compression KTX2/Basis, LOD/imposteurs, génération par worker, calibration des pneus et suspensions et validation prolongée sur GPU réel. Les métriques F3 indiquent FPS, temps par frame, temps physique, chunks, draw calls, triangles et objets graphiques ; elles ne mesurent pas la VRAM réelle. **Aucun objectif de 60 FPS en 1080p sur GPU dédié n'est annoncé comme atteint.**

## Licences

Aucune licence de redistribution du **code original** n'a encore été choisie. Les licences de Three.js, Rapier et des autres dépendances continuent de s'appliquer à leurs propres fichiers ; elles ne placent pas automatiquement ce projet sous la même licence. Les assets Poly Haven restent CC0 ; la BMW est CC BY-NC-ND 4.0. La distribution du jeu avec ce modèle doit rester non commerciale et conserver les attributions ; cette condition ne donne pas automatiquement une licence de redistribution au code original. Les références étudiées ne constituent pas une autorisation de réutiliser du code sans licence.
