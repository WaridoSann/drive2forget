## Mise à jour 0.2 — performances et vitrage

Le rendu extérieur utilise des fenêtres opaques et réfléchissantes pour occulter l’habitacle incomplet. Les fichiers sources GLB et gzip ne sont pas modifiés. Au chargement, Meshoptimizer prépare des indices LOD des roues avec erreur relative bornée à 0,004, normales et UV pondérés, et frontières protégées ; les attributs originaux restent inchangés. Le rendu complet reste disponible en Élevée. Le feuillage éloigné réutilise un quart ou la moitié des cartes originales. Les colliders et la simulation à 120 Hz restent indépendants de ces choix.

La qualité Automatique est désormais proposée par défaut. Elle plafonne les pixels à 1,28 million, puis adapte progressivement la résolution après plusieurs fenêtres lentes. Économe plafonne à 720 000 pixels ; Élevée à 2,0736 millions. Automatique et Économe désactivent les ombres dynamiques ; Élevée utilise une carte de 1024², plafonnée à 20 mises à jour par seconde. Une ombre de contact légère reste visible. Les quatre lumières inutiles de la maquette ont été désactivées. Voir `docs/PERFORMANCE.md` pour les mesures ; les sections suivantes décrivent la recherche et le socle initial 0.1, que ces changements de rendu remplacent lorsqu’ils diffèrent.

# drive2forget — Décisions techniques

Recherche réalisée le **13 novembre 2026**. Les liens ci-dessous ont été effectivement consultés par HTTP dans cet environnement. Ce document distingue les possibilités des bibliothèques, les choix de conception et les résultats qui devront être mesurés dans le projet. Il ne constitue pas un benchmark GPU.

## Décision

Retenir **Three.js + TypeScript + Vite + Rapier 3D WASM**, avec un modèle de véhicule piloté par des forces aux quatre contacts roue-sol. Utiliser WebGL pour cette première version afin de conserver une compatibilité navigateur large. Aucun serveur de jeu ni service externe n'est requis pendant une session : le build et ses assets peuvent être servis par GitHub Pages.

Three.js assure le rendu, Rapier l'intégration du corps rigide et les collisions ; ni Three.js seul ni l'ajout d'un moteur physique ne fournit automatiquement une simulation fidèle de BMW. La suspension, les pneus, le groupe motopropulseur et les paramètres de caméra doivent être développés et validés séparément.

## Comparaison ciblée

| Solution | Physique automobile | Rendu et performances | Streaming | Maintenance / exemples | Décision |
|---|---|---|---|---|---|
| Three.js + TypeScript + Vite, sans physique | Aucun modèle de véhicule. Écrire seulement des positions serait insuffisant. | PBR, glTF, instancing, HDR, ombres ; contrôle fin de la boucle. | Géométries et ressources à gérer explicitement. | Écosystème vaste, modules simples. | Base de rendu retenue, insuffisante seule. |
| Three.js + Rapier | Corps rigides, raycasts, colliders et contrôleur véhicule à rayons ; suspension/friction configurables. Pneus et transmission doivent être complétés pour le niveau demandé. | WASM, pas fixe et CCD disponibles. Coût des rayons/colliders à mesurer. | Sol et obstacles statiques créés/détruits par chunk ; requêtes physiques synchronisées avec le streaming. | Exemple officiel réellement accessible, API typée ; séparation claire rendu/simulation. | **Retenu.** |
| React Three Fiber + Rapier | Même moteur physique sous-jacent. Le modèle de pneus ne devient pas plus fidèle grâce à React. | R3F permet mutations impératives dans `useFrame`, mais ne pas faire passer les mises à jour à 60/120 Hz par l'état React. | Faisable ; cycle React et ressources physiques doivent rester coordonnés. | Excellente option dans une application React existante. Ici elle ajoute un cycle de vie inutile. | Non retenu pour ce projet autonome. |
| Babylon.js + Havok | Plugin physique officiel, corps rigides et contraintes. Aucune voiture F90 complète documentée dans la page étudiée ; un modèle de suspension/pneus reste à écrire. | Moteur intégré, inspector, PBR, loaders, outils et instancing solides. | Possible avec gestion explicite des objets et corps physiques. | Infrastructure plus intégrée, excellent choix d'équipe déjà familière de Babylon. | Alternative crédible, bénéfice insuffisant pour changer le choix initial. |
| Three.js + Jolt Physics.js | Jolt possède un système véhicule et un port WebAssembly ; intéressant pour une évolution plus poussée de la simulation. | Moteur C++ performant ; binding et mémoire WASM ajoutent des exigences d'intégration. | Requiert les mêmes stratégies de chunks et de précision. | Moins d'exemples web TypeScript directement adaptés à ce projet ; évaluation spécifique nécessaire. | Alternative à réexaminer si Rapier limite les pneus/contacts. |
| Godot export Web | Véhicule ou forces personnalisées, environnement de création complet. | Export web WASM/WebGL ; contraintes d'export, tailles et parfois d'en-têtes HTTP à vérifier. | Faisable, mais chaîne d'édition et export distincte. | Éditeur puissant, moins direct pour la demande TypeScript/statique. | Non retenu pour cette première version navigateur. |

Ces appréciations sont qualitatives. Aucun chiffre de FPS comparatif n'est revendiqué. WebGPU peut être étudié ultérieurement ; introduire simultanément un nouveau renderer et une simulation véhicule compliquerait la validation initiale.

## Étude des références demandées

### Three.js — exemple officiel Rapier Vehicle Controller

Sources : [exemple](https://threejs.org/examples/physics_rapier_vehicle_controller.html), [source consultée](https://github.com/mrdoob/three.js/blob/dev/examples/physics_rapier_vehicle_controller.html), [API Rapier](https://rapier.rs/javascript3d/classes/DynamicRayCastVehicleController.html).

Le code crée un châssis physique, ajoute quatre roues avec une direction de rayon vers le bas, configure raideur et friction et transfère longueur de suspension, braquage et rotation aux roues visuelles. `setWheelEngineForce`, `setWheelBrake` et `updateVehicle` montrent une véritable intégration physique. L'exemple utilise un pas `1/60` ; ce n'est pas, à lui seul, une boucle de simulation indépendante du taux de rendu ni une calibration automobile réaliste. Ses valeurs de friction et de moteur sont pédagogiques et ne doivent pas devenir silencieusement les caractéristiques d'une M5.

### Rapier — Character Controller

Source : [guide demandé](https://rapier.rs/docs/user_guides/javascript/character_controller/).

Le contrôleur de personnage traite notamment du déplacement cinématique, de la pente et des marches. Il n'est pas un contrôleur automobile : il ne remplace ni un corps rigide dynamique, ni quatre suspensions, ni les forces des pneus. La page supposée `user_guides/javascript/dynamic_ray_cast_vehicle_controller/` renvoyait 404 lors de cette recherche ; l'API typée du contrôleur véhicule ci-dessus est accessible.

### pmndrs/racing-game

Commit consulté : `7816a5d954b75e6ad853ae4e4f0cbbd628072643`.

Sources : [dépôt](https://github.com/pmndrs/racing-game), [véhicule](https://github.com/pmndrs/racing-game/blob/7816a5d954b75e6ad853ae4e4f0cbbd628072643/src/models/vehicle/Vehicle.tsx), [licence MIT](https://github.com/pmndrs/racing-game/blob/7816a5d954b75e6ad853ae4e4f0cbbd628072643/LICENSE.md).

Le dépôt utilise React Three Fiber et **Cannon**, pas Rapier (`@react-three/cannon`, `useRaycastVehicle`). Il sépare roues/châssis, commandes, effets, audio et interface. Les forces moteur, le frein et le braquage passent par l'API du véhicule. Certains mouvements visuels de caisse et vibrations sont ajoutés artificiellement, et sa direction artistique est celle d'un jeu de course ; ils ne répondent pas à l'objectif contemplatif et au transfert de masse physique demandé. La caméra est lissée dans la boucle de rendu. L'organisation modulaire est une référence utile, pas un socle à copier. Aucun fichier ni asset de ce dépôt n'est intégré à drive2forget par cette recherche.

### seancope357/apex-drive

Commit consulté : `f3443c79024345dcd74d18ebe4eb90c0d988d195`.

Sources : [dépôt](https://github.com/seancope357/apex-drive), [Vehicle.tsx](https://github.com/seancope357/apex-drive/blob/f3443c79024345dcd74d18ebe4eb90c0d988d195/src/game/Vehicle.tsx), [ChaseCamera.tsx](https://github.com/seancope357/apex-drive/blob/f3443c79024345dcd74d18ebe4eb90c0d988d195/src/game/ChaseCamera.tsx).

R3F + Rapier, quatre rayons, ressorts et réglages de compression/détente ; application des forces avant le pas de physique. Les groupes de collision empêchent les rayons de toucher le châssis, un point crucial. La caméra mélange l'orientation de la caisse et la direction de vitesse, suit une position amortie et adapte modérément le FOV. Les paramètres observés visent une voiture générique d'environ 1 200 kg, pas une F90. Le code fournit une piste de vérification des conventions d'axes et du suivi caméra.

**Pas de licence annoncée dans les métadonnées et aucun fichier LICENSE présent dans l'arbre inspecté.** Le fait que le dépôt soit public n'accorde pas de droit de réutilisation : consultation seulement, aucun code ni asset repris.

### StarKnightt/nightdrive

Commit consulté : `4ca3db84652aa953da86e645f492299e4a5325e2`.

Sources : [dépôt](https://github.com/StarKnightt/nightdrive), [index.html](https://github.com/StarKnightt/nightdrive/blob/4ca3db84652aa953da86e645f492299e4a5325e2/index.html).

Le jeu principal est un HTML volumineux avec Three.js, une représentation de route en coordonnées longitudinales/latérales (`roadToWorld`, courbure), une physique personnalisée, une caméra à ressort et interpolation entre états physiques. Le monde garde des chunks devant et derrière le véhicule et détruit les géométries éloignées. L'analytique commune au rendu et à la route est une leçon utile pour les raccords ; son organisation monolithique ne convient pas ici. Le post-traitement propose aussi flou, aberration chromatique, vignette et lignes de vitesse, effets à éviter pour le brief actuel. Il ne faut pas présenter son état de véhicule en coordonnées de route comme un véhicule Rapier.

**Aucune licence annoncée ni fichier LICENSE identifié.** Aucun code, shader ou asset repris.

### franpiaggio/infinite-forest

Commit consulté : `6178a1e47be09f2d569f89237f12dfba3b09e47a`.

Sources : [dépôt](https://github.com/franpiaggio/infinite-forest), [world.js](https://github.com/franpiaggio/infinite-forest/blob/6178a1e47be09f2d569f89237f12dfba3b09e47a/src/world.js), [chunk.js](https://github.com/franpiaggio/infinite-forest/blob/6178a1e47be09f2d569f89237f12dfba3b09e47a/src/chunk.js).

Séparation des chunks, terrain, collision et modèles d'arbres ; génération avec seed, candidats proches et pools d'instances pour les branches/feuilles. Les instances sont limitées aux arbres visibles/proches et les caches peuvent être régénérés. Les collisions décrites sont dédiées à l'exploration du personnage, pas à une voiture 1,9 tonne. Retenir le principe de plusieurs modèles d'arbres, déterminisme et instancing borné, en développant notre propre implémentation.

**Aucune licence globale annoncée ni fichier LICENSE identifié.** Des fichiers de crédits d'assets existent ; ils n'autorisent pas à considérer tout le dépôt comme libre. Aucun code, texture ou son repris.

### Anderson Mancini — Vehicle Physics

Source réellement accessible : [A realistic car, then an arcade car on top of it](https://andersonmancini.dev/blog/vehicle-physics), publication indiquée du 25 septembre 2026.

L'article décrit un châssis Rapier à masse et inertie explicites, quatre rayons, ressort/amortisseur/antiroulis, courbes de pneus avec glissement combiné, ellipse de friction et longueurs de relaxation ; moteur et boîte séparés ; simulation à 120 Hz avec sous-pas pneus. Il explique un problème pertinent : projeter la vitesse de l'amortisseur sur l'axe de caisse inclinée peut introduire un faux mouvement vertical à grande vitesse. Une vitesse relative au contact et une convention cohérente avec la normale évitent cette excitation artificielle.

La seconde partie ajoute une couche arcade forte (assistance en lacet, accélération latérale, maintien de drift et freinage additionnel). **Ces ajouts ne sont pas retenus** pour drive2forget. Les résultats numériques de l'article sont les affirmations de l'auteur pour son jeu, pas des résultats de tests de ce projet.

### GLTFLoader

Source : [documentation Three.js](https://threejs.org/docs/pages/GLTFLoader.html).

`GLTFLoader` est le point d'entrée des voitures et de la végétation. Les décodeurs DRACO, Meshopt et KTX2 se configurent explicitement selon les extensions effectivement présentes. Conserver les décodeurs localement, normaliser l'échelle en mètres et les axes, séparer les pivots des quatre roues, vérifier l'espace de couleur des textures et ne pas remplacer la carrosserie physique par les transformations du modèle.

## Modèle physique implémenté dans l’alpha et limites

1. Un châssis Rapier dynamique de **1 855 kg**, collider de **4,70 × 1,82 × 0,50 m**, empattement physique **2,96 m**, voie **1,62 m** et rayon de roue **0,35 m**. Le centre de masse est abaissé de **0,24 m** par rapport au repère de caisse. Masse, dimensions et puissance s’inspirent de la F90 ; inerties, CG, raideurs, pneus et pertes restent des approximations de développement. Le rendu utilise désormais la **BMW M5 Competition « The Midnight Spectre » d’Echoo**, fournie en USDZ par l’utilisateur et chargée au démarrage après conversion technique ; sa géométrie est indépendante du collider simplifié.
2. Quatre rayons excluent le corps du châssis. Chaque contact calcule compression, vitesse au point projetée sur la normale et force de ressort/amortisseur ; compression et détente ont des coefficients distincts. Un couplage antiroulis agit par essieu. Des **impulsions force × dt** appliquées aux contacts produisent les mouvements de caisse ; les positions et rotations physiques ne sont modifiées directement que pour reset et floating origin.
3. Pneus : les vitesses longitudinale et latérale au contact alimentent un modèle simplifié. La force latérale demandée est proportionnelle à la vitesse latérale ; les forces longitudinale et latérale sont ensuite bornées ensemble par un **cercle de friction**, avec coefficient du collider touché (asphalte **1,08**, accotement **0,63**). Ce modèle n’intègre **ni inertie de rotation des roues, ni vrai taux de glissement longitudinal, ni courbe Pacejka calibrée, ni ABS/contrôle de traction**. Le champ `slip` est un indicateur de saturation de force ; la rotation visuelle des roues ne constitue pas une simulation de leur dynamique. Une perte d’adhérence est possible, mais le modèle n’a pas de courbe de chute d’adhérence après le pic.
4. `Drivetrain` approxime une boîte automatique à huit rapports, une marche arrière, un couple moteur variable jusqu’à **750 N·m**, le frein moteur et une réduction de couple pendant les passages. Le moteur alimente les quatre contacts à parts égales. Aucun différentiel ni embrayage dynamique n’est simulé. Le régime suit une estimation couplée à la vitesse, avec ralenti et lissage ; les rapports et rendements sont configurables.
5. Commandes AZERTY/QWERTY et manette standard ; pédales et direction sont interpolées. L’angle maximal de direction baisse avec la vitesse, puis est encore lissé au pas physique. Le signe du braquage est adapté au repère +Z avant pour que la touche gauche produise une trajectoire à gauche. L’assistance ne téléporte pas la caisse et n’impose pas son lacet. Le frein de stationnement agit sur les roues arrière.
6. La boucle principale utilise un pas fixe de **1/120 s**, **au maximum huit sous-étapes par image**, un temps accumulé borné et une interpolation de la position et du quaternion entre les deux derniers états. Le temps excédentaire d’une forte saccade est abandonné. Le rendu reste indépendant de ce pas ; une variante 60 Hz demanderait un retest et n’est pas un réglage actuellement exposé.
7. Avant la révélation, 300 pas sans commande stabilisent le véhicule. Un maintien automatique à faible vitesse et la mise en sommeil évitent le creep au ralenti. Aucun moteur propulsif tant qu’aucune pédale n’est demandée. La réinitialisation explicite replace le véhicule sur l’accotement à la station longitudinale actuelle et remet vitesses, régime, roues et interpolation à zéro.

Le contrôleur véhicule intégré Rapier a été étudié, mais **n’est pas utilisé par cette alpha** : les quatre contacts et impulsions sont calculés dans `VehiclePhysics`. Cette approche donne accès aux charges, à l’antiroulis et au partage d’adhérence. Elle valide un prototype physique et n’équivaut pas à une simulation certifiée de M5 F90. L’étape suivante sur les pneus est de simuler les vitesses de rotation et le couple de freinage pour obtenir un véritable glissement longitudinal.

## Architecture et streaming implémentés

- **Core / FixedStep** : initialisation dans `main.ts`, boucle fixe, pause, interpolation et métriques. Les systèmes de simulation n’importent pas l’interface.
- **VehiclePhysics / Drivetrain / VehicleCamera** : corps dynamique et quatre contacts ; moteur/rapports ; caméra à ressort critique amorti, collisions par rayon, trois cadrages, FOV sensible à la vitesse et orbite au repos. La caméra suit le cap de caisse lissé ; elle n’effectue pas encore un mélange explicite avec la direction de vitesse lors d’une dérive.
- **RoadGenerator** : courbe **analytique à sommes de sinus**, dérivable et déterministe par seed, échantillonnée tous les trois mètres. Ce n’est pas une spline à points de contrôle. Les mêmes stations globales sont évaluées des deux côtés des raccords, avec tangentes et UV continus. La route fait sept mètres de large et ses variations de pente sont légères. La trajectoire ne comporte ni intersections ni réseau de routes.
- **TerrainGenerator / VegetationSystem** : corridor de terrain de 320 m de large ; instances originales de trois variantes d’arbres ramifiés avec cartes de feuilles, buissons, herbe et pierres. Les positions sont déterministes par seed + indice de chunk ; la chaussée est exclue du placement. Ce monde est extensible longitudinalement, pas un terrain infini dans toutes les directions.
- **WorldManager** regroupe aussi les responsabilités de **ChunkManager** : chunks de **96 m**, jusqu’à **neuf chunks** dans la fenêtre cible (six devant et deux derrière la station centrale). Six chunks sont construits à l’initialisation, puis au plus **un nouveau chunk par image**. La génération est synchrone sur le thread principal ; aucun worker ni pipeline de tâches asynchrones de géométrie n’est implémenté. Le budget d’une construction doit donc être mesuré, surtout à haute qualité. Le sens de priorité suit la vitesse globale en Z, avec maintien du dernier sens près de zéro, pour rester correct après un demi-tour.
- **CollisionManager** : deux maillages statiques par chunk (terrain avec découpe de chaussée et route) et colliders cylindriques des troncs proches. Les géométries de route, terrain, marquages, les instances et colliders sont retirés explicitement lorsque le chunk sort de la fenêtre. Les petits rochers et buissons sont décoratifs et n’ont pas de collider.
- **EnvironmentManager / AssetManager** : textures et HDR chargés localement, PMREM pour les reflets, soleil et ombres mobiles. Les modèles d’arbres, matériaux et textures sont partagés entre chunks et libérés à la fermeture, pas à chaque retrait d’instance.
- **BiomeProvider** : interface de métadonnées (identifiant, densités, essences) avec une seule forêt européenne. Elle constitue un point d’extension initial ; les générateurs ne sont pas encore entièrement pilotés par un fournisseur de biome injectable.
- **Audio / Input / UI** : synthèse provisoire explicitement indiquée, activation audio sur geste utilisateur, commandes AZERTY/QWERTY, pause, qualité et réduction de lumière. Il n’y a ni enregistrement BMW, ni musique commerciale.

Le **floating origin** déclenche un déplacement de l’origine en Z lorsque la position locale dépasse 1 536 m, par multiples de 768 m. Châssis, colliders, chunks rendus, états précédents d’interpolation et caméra sont déplacés ensemble. Le recentrage se produit **après le calcul des forces de roue dans l’ancien repère et avant `physics.step()`**, afin que Rapier rafraîchisse ses structures de raycast avant les contacts suivants. La génération conserve ses coordonnées globales indépendantes de l’origine locale. Le retour sur une zone retirée régénère les mêmes données. Les valeurs X restent bornées par la courbe analytique actuelle ; un recentrage XYZ deviendrait nécessaire avec une trajectoire qui dérive librement.

## Rendu et assets implémentés

- Textures locales Poly Haven : albedo/normal OpenGL/roughness **2K** pour `asphalt_02` et `forest_ground_04`, écorce `bark_brown_02` **1K**, environnement `forest_slope` **1K HDR**. L’inventaire des fichiers et licences est documenté séparément dans les crédits d’assets.
- Albedo en sRGB, normales et roughness traitées comme données ; mipmaps, répétition UV métrique et anisotropie. Le sol répète la texture tous les cinq mètres, l’asphalte tous les quatre mètres. L’AO indépendante n’est pas utilisée.
- **BMW réellement intégrée** : `main.ts` attend `VehicleVisual.loadLicensedModel()` avant de rendre COMMENCER disponible. Le fichier local `public/assets/cars/model.json` et ses deux parties gzip est téléchargé, décompressé par `DecompressionStream('gzip')` puis interprété par `GLTFLoader.parseAsync()`. Un navigateur sans cette API affiche une erreur explicite. Le modèle de développement original reste dans le code, mais sa carrosserie et ses roues sont masquées après le chargement de la BMW.
- Le modèle fourni est conservé sans décimation : **917 348 triangles, 56 meshes, 33 matériaux, 11 textures embarquées** après conversion. Le GLB représente **16 443 596 octets**, son gzip **13 001 607 octets**. La réduction du poids réseau ne réduit pas le nombre de triangles ni la mémoire GPU. L’archive USDZ source pèse **13 681 029 octets**. Le [manifeste de conversion](public/assets/cars/CONVERSION_MANIFEST.json) consigne les empreintes et les transformations techniques.
- Les pneus, jantes, disques et étriers existent déjà dans des nœuds distincts de la source. Des pivots de scène les rattachent aux quatre contacts physiques ; suspension, braquage et rotation utilisent leurs transformations à l’exécution, sans découpe de géométrie dans le fichier converti. Les étriers suivent le braquage et la suspension sans tourner avec les pneus. Les matériaux d’optiques existants sont utilisés pour le changement d’intensité au freinage.
- Arbres instanciés avec branches géométriques et cartes de feuillage à alpha test ; tailles et orientations déterministes. Il n’existe **ni LOD, ni imposteurs lointains** dans cette alpha. Les trois modèles et leur feuillage sont originaux et provisoires, avec une écorce photographique licenciée.
- Soleil de fin d’après-midi, éclairage hémisphérique, reflets HDR locaux, tone mapping ACES, antialiasing matériel et carte d’ombres 2048². La carte d’ombres est conservée au repos et actualisée lors du déplacement ou de la rotation du véhicule et des changements de chunks ; le profil léger désactive les ombres dès le démarrage. Pas de profondeur de champ, motion blur ou aberration chromatique.
- L’introduction utilise des sprites lumineux additifs, des volumes coniques visuels, des spots et une rampe d’exposition. La transition blanche est une surcouche DOM animée. Il n’y a pas de passe de bloom dédiée ni de diffusion volumétrique physique ; les spots n’éclairent pas de décor dans la scène noire. La réduction d’effets et le passage de l’introduction sont exposés.
- Les textures d’environnement restent en JPEG/HDR et la végétation en géométrie générée. La BMW utilise un GLB à textures embarquées, enveloppé dans gzip pour le transfert statique. **Aucun KTX2, Basis, Draco ou Meshopt n’est intégré.** Toute optimisation qui modifierait artistiquement ou décimerait le modèle BMW demanderait des droits adaptés, distincts de la conversion technique actuelle.
- Les profils légère/élevée règlent le pixel ratio, les ombres et la densité initiale de végétation. La distance cible de streaming reste la même. La simulation et le relief ne dépendent pas du profil. Les modifications de densité nécessitent une reconstruction du monde ou un rechargement dans cette version.

## Licences et provenance

| Composant étudié | Licence vérifiée | Conséquence |
|---|---|---|
| Three.js | MIT, [LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE) | Conserver les mentions requises. |
| Rapier | Apache-2.0, [LICENSE](https://github.com/dimforge/rapier/blob/master/LICENSE) | Conserver licence et notices applicables. |
| Babylon.js | Apache-2.0, [license.md](https://github.com/BabylonJS/Babylon.js/blob/master/license.md) | Alternative seulement. |
| `@babylonjs/havok` | Métadonnées npm de la version 1.3.14 : MIT, [registre](https://registry.npmjs.org/@babylonjs/havok/latest) | Vérifier aussi le texte du package si adopté ; non intégré ici. |
| Jolt Physics | MIT, [LICENSE](https://github.com/jrouwe/JoltPhysics/blob/master/LICENSE) | Alternative seulement ; vérifier aussi le binding utilisé. |
| pmndrs/racing-game | MIT | Aucun réemploi dans ce projet. |
| apex-drive / nightdrive / infinite-forest | Pas de licence globale identifiée dans les arbres inspectés | Aucun réemploi. |

Une licence de code ne couvre pas automatiquement un modèle de voiture, une texture ou un enregistrement. L’inventaire effectivement vérifié figure dans [ASSET_AUDIT.md](docs/ASSET_AUDIT.md). Les fichiers et licences des autres modèles du brief ne doivent pas être confondus avec ceux du modèle fourni ensuite par l’utilisateur.

### Modèle BMW utilisé

- **Auteur :** [Echoo (`echoo.`)](https://sketchfab.com/echoo.), avec crédit supplémentaire **`@thelightning`**.
- **Source exacte :** [Bmw M5 Competition ( The Midnight Spectre )](https://sketchfab.com/3d-models/bmw-m5-competition-the-midnight-spectre-2831975e80604b58b88237e8c5174a93), identifiant `2831975e80604b58b88237e8c5174a93`.
- **Licence :** [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). La distribution de cet asset et de sa conversion dans le jeu reste **non commerciale**, avec attribution et liens source/licence ; aucune affiliation BMW ou approbation de l’auteur n’est revendiquée.
- **Provenance :** auteur, titre, URL et licence incorporés dans `scene.usdc` correspondent à la réponse officielle de l’API Sketchfab. Voir [preuve USDZ](docs/license-evidence/uploaded-usdz-provenance.json) et [réponse API](docs/license-evidence/bmw_midnight_spectre.json).
- **Conversion technique :** USDZ → GLB avec conversion d’unités, adaptation d’origine UV et rangement des canaux metallic/roughness ; géométrie, normales, valeurs PBR et transforms source conservés, déduplication à octets identiques, sans décimation, recoloration ni découpe de roues. Le texte juridique [§2(a)(4)](https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode.en) autorise les modifications techniques nécessaires au changement de média/format sans en faire à elles seules une adaptation. Les adaptations artistiques ne peuvent pas être partagées sous cette licence sans autorisation supplémentaire. Le [manifeste](public/assets/cars/CONVERSION_MANIFEST.json) distingue ces opérations et fournit les empreintes source/GLB.

Cette licence reste attachée au modèle ; les textures Poly Haven demeurent CC0 et les dépendances gardent leurs licences propres. La présente conversion ne prétend pas autoriser une exploitation commerciale du jeu contenant ce modèle.

## Validation prévue

- Tests de physique headless : immobilité initiale, accélération, freinage, marche arrière, stabilité, contacts/suspensions, braquage à plusieurs vitesses et reset.
- Tests géométriques : mêmes sommets/tangentes aux frontières, même seed/mêmes données, fenêtre bornée, retour arrière, recentrage à grande distance.
- Playwright : écran noir/bouton, passage/réduction intro, entrée dans le jeu, commandes, pause, reset, chargements réseau et erreurs console.
- Build TypeScript et production, chemin de base relatif pour GitHub Pages, absence de dépendances réseau essentielles.
- Captures 1920 × 1080 et 2560 × 1440. Un Chromium logiciel peut valider les interactions mais ne permet pas de conclure à 60 FPS sur GPU dédié.
- Mesures à publier avec configuration exacte : temps frame/physique, draw calls, triangles, chunks, colliders, ressources GPU ; trajets longs et demi-tours. L'objectif 60 FPS/1080p reste non validé tant qu'aucun matériel cible n'est mesuré.

## Autres sources consultées

- [R3F introduction](https://r3f.docs.pmnd.rs/getting-started/introduction) et [performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls).
- [Babylon — Using a Physics Engine](https://doc.babylonjs.com/features/featuresDeepDive/physics/usingPhysicsEngine/).
- [JoltPhysics.js README](https://github.com/jrouwe/JoltPhysics.js).
- [Godot — Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
- [Three.js WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html).
