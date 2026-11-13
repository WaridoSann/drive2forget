# Conversion reproductible de la BMW

`convert_usdz.py` convertit le fichier original **Bmw M5 Competition (The Midnight Spectre)** d’Echoo en glTF 2.0 pour le navigateur. Le fichier USDZ doit être fourni localement ; le script ne télécharge aucun modèle et n’exécute aucun contenu de l’archive.

La licence du modèle est **CC BY-NC-ND 4.0** : conservez les crédits et la licence, et réservez la redistribution à un usage non commercial. La conversion conserve le contenu dans un autre format selon la section 2(a)(4) de la licence. Le code du jeu et les ressources du modèle ont des licences distinctes. Voir [l’audit des ressources](../docs/ASSET_AUDIT.md) pour les sources et les restrictions.

## Installation

Utilisez Python 3.12 dans un environnement virtuel local, depuis la racine du projet :

```sh
python3 -m venv work/usd-tools
work/usd-tools/bin/python -m pip install usd-core==26.11 pillow==13.0.0 numpy==2.5.4
```

Blender n’est pas nécessaire. La version de Blender installée dans l’environnement de création ne possédait pas l’importeur USD ; le script utilise directement les bibliothèques officielles OpenUSD (`usd-core`).

## Conversion

```sh
work/usd-tools/bin/python scripts/convert_usdz.py \
  /chemin/Bmw_M5_Competition__The_Midnight_Spectre.usdz \
  public/assets/cars
```

La commande crée :

- `model.json` : liste ordonnée des parties, taille totale et empreintes SHA-256 ;
- `m5-f90.glb.gz.001` et `.002` pour le fichier source fourni : deux parties de 7 000 000 et 6 001 607 octets ;
- `CONVERSION_MANIFEST.json` : provenance embarquée, empreintes, nombres de triangles et opérations de conversion.

Pour conserver aussi le GLB complet et son gzip dans un dossier de travail :

```sh
work/usd-tools/bin/python scripts/convert_usdz.py \
  /chemin/Bmw_M5_Competition__The_Midnight_Spectre.usdz \
  public/assets/cars --raw-dir work/car-import
```

Les fichiers complets ne sont pas écrits dans le dossier public par défaut. Le découpage en parties permet le transfert vers le dépôt avec la limite de taille des requêtes de l’outil GitHub. Le chargeur du jeu réassemble les parties, contrôle les empreintes SHA-256, décompresse le gzip puis charge le GLB ; le découpage ne modifie pas le modèle.

## Contenu conservé et vérification

La conversion conserve **917 348 triangles**, 56 meshes et 33 matériaux pour le fichier fourni. Elle ne décime pas la géométrie, ne recolore pas les matériaux et ne sépare aucun maillage. Les roues étaient déjà des objets distincts dans la source ; le jeu anime ces objets à l’exécution.

Les opérations de représentation sont : nœud d’unités centimètres → mètres, convention verticale des coordonnées de texture, regroupement des canaux de rugosité et métal dans les canaux glTF, partage des tampons strictement identiques et compression gzip sans perte. Le convertisseur rejette les systèmes de coordonnées différents et les dispositions de données non prises en charge. Il est destiné à ce modèle précis et ne constitue pas un convertisseur USD généraliste.

Le GLB du fichier fourni possède l’empreinte SHA-256 :

```text
0cd05b49b8320ec3437c26a56644897683b1c5007571035c29d048f0a3d8743b
```

Le gzip réassemblé possède l’empreinte :

```text
285696191404155d293fe681deb2c86c6aeb3482b2064248b5606f45c88ba8e6
```

Le timestamp gzip est fixé à zéro. Utilisez les versions de dépendances ci-dessus pour reproduire les mêmes octets ; une autre version de la compression PNG/zlib peut produire un encodage différent tout en conservant les mêmes données.
