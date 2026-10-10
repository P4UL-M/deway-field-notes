# Accès et publication

## API

Node.js 22 suffit. `BLOG_API_URL` est l'origine du blog, **sans `/api`** ; valeur par défaut `https://blog.deway.fr`. `BLOG_TOKEN` est un **JWT d'auteur Payload**, pas `PAYLOAD_SECRET` ni `PREVIEW_SECRET`. Sinon fournir `BLOG_EMAIL` et `BLOG_PASSWORD` : le helper fait `POST /api/users/login`, conserve le JWT en mémoire, vérifie `/api/users/me` et utilise `Authorization: JWT …`. Les sessions de connexion restent gérées par Payload.

Obtenir les secrets de l'environnement ou du gestionnaire autorisé. Ne pas les inscrire dans les commandes visibles, le dépôt, les modèles ou la réponse finale. Si absents, préparer et valider le contenu puis demander le moyen d'accès manquant. `Users.ts` définit `auth: true` sans `useAPIKey` : ne pas inventer de header `users API-Key`.

Dans les exemples, `skill_dir` désigne le chemin absolu réel du skill, `post_id` l'ID retourné par Payload. Ces variables ne contiennent pas de secrets.

```sh
node "$skill_dir/assets/article.mjs" > /tmp/post.json
# Remplacer le texte de démonstration avant envoi.
node "$skill_dir/scripts/blog.mjs" validate /tmp/post.json
node "$skill_dir/scripts/blog.mjs" find mon-slug
node "$skill_dir/scripts/blog.mjs" draft /tmp/post.json > /tmp/saved-post.json
# Reprendre l'ID de saved-post.json.
node "$skill_dir/scripts/blog.mjs" get "$post_id" > /tmp/latest-post.json
# Après relecture et lorsque la demande autorise la publication :
node "$skill_dir/scripts/blog.mjs" publish /tmp/post.json "$post_id"
```

Pour modifier, extraire les champs avec `editablePost` dans `scripts/content.mjs`, puis fusionner la modification dans ce résultat. Garder `messages[].id`, les IDs de widgets et ceux des blocs Lexical déjà présents. `get` demande `draft=true&depth=0` pour retourner la dernière version avec des relations scalaires. Les médias Lexical redeviennent des IDs grâce au hook du blog. Un fichier provenant directement de `get` contient des champs calculés : ne pas le renvoyer brut.

```js
import { readFile, writeFile } from 'node:fs/promises';
import { editablePost } from '/chemin/reel/du/skill/scripts/content.mjs';
const latest = JSON.parse(await readFile('/tmp/latest-post.json', 'utf8'));
const data = editablePost(latest);
// Appliquer ici les changements autorisés à data.
await writeFile('/tmp/post.json', JSON.stringify(data, null, 2));
```

Avant un update, renseigner `BLOG_EXPECT_UPDATED_AT` avec `updatedAt` issu de la dernière lecture. Le helper refuse si le document a changé entre cette lecture et son contrôle préalable. Ce contrôle n'est pas un verrou atomique ; éviter une édition simultanée dans le studio et relire si elle est détectée.

Les opérations correspondent à :

| Commande | Opération |
| --- | --- |
| `validate FILE` | Validation hors réseau, aucune authentification |
| `find SLUG` | GET `/api/posts?where[slug][equals]=…&draft=true&depth=0&limit=2` |
| `get ID` | GET `/api/posts/{id}?draft=true&depth=0` |
| `draft FILE` | Recherche du slug, puis POST `/api/posts?draft=true` avec `_status: draft` |
| `draft FILE ID` | GET de contrôle, puis PATCH `/api/posts/{id}?draft=true` avec `_status: draft` |
| `publish FILE ID` | GET de contrôle, puis PATCH `/api/posts/{id}?draft=false` avec **le contenu revu** et `_status: published` |
| `upload FILE ALT` | POST `/api/media` multipart : `file` et `_payload` contenant `{ "alt": "…" }` |

Le helper refuse les archives, les slugs différents pour un même ID, les doublons à la création et les champs calculés au niveau de la publication. La commande `draft` force le brouillon même si le fichier contient `_status: published`. Payload peut conserver la version publique tandis que la dernière version est en brouillon : ne pas confondre le statut de la version lue avec celui du document public. Les erreurs n'affichent pas les réponses d'authentification et n'entraînent aucune répétition automatique.

## Médias

```sh
node "$skill_dir/scripts/blog.mjs" upload /tmp/capture.png 'Vue du tableau de résultats'
```

Reprendre l’ID retourné, avec `upload(ID, alt)` pour une image simple ou `inline("InlineMedia", {media: ID, mediaLayout: "wide", caption: "…"})` pour une image/vidéo dans le corps de l’article. Dans une session, utiliser `{"widgetType":"media","media":ID,"mediaLayout":"wide","caption":"…"}` dans `messages[].widgets`. Le helper accepte JPG, PNG, GIF, WebP, AVIF, SVG, MP4, WebM et MOV. Le schéma autorise les images et les vidéos ; pas les PDF. Les médias sont lisibles publiquement dès l'upload, même si le billet est encore un brouillon. Préparer des fichiers déjà expurgés. Avant de répéter un upload dont le résultat est incertain, consulter `/api/media` avec l'auteur authentifié pour retrouver le fichier existant.

## SSH

Découvrir le serveur depuis l'environnement ou les indications de Paul. Sur le poste d'origine, `Mycroft` est un alias SSH et le checkout est `/home/paul/services/deway-blog` ; ce sont des indications à vérifier, pas des noms portables. Ne pas tester une autre machine au hasard. Lire `compose.yaml` et l'état des services sans afficher `.env` ni `docker inspect` avec tous les secrets.

### Tunnel quand l'auteur CMS est disponible

Le routeur Nginx du blog est publié sur **127.0.0.1:8110** du serveur, et distribue `/api` vers Payload. Ouvrir le tunnel dans un processus suivi que l'agent pourra fermer :

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18110:127.0.0.1:8110 "$ssh_target"
```

Utiliser `BLOG_API_URL=http://127.0.0.1:18110` pour le helper, avec les mêmes identifiants Payload. Garder l'origine publique pour les liens finaux. Le tunnel ne fournit pas d'authentification CMS par lui-même. Fermer uniquement le processus de tunnel lancé pour cette tâche.

### SSH seul : API locale Payload

Cette voie utilise les permissions du serveur (`overrideAccess: true`) et ne demande pas de mot de passe CMS. Elle préserve les hooks, les versions, le HTML et le temps de lecture. Elle nécessite **les sources du CMS correspondant au déploiement et ses dépendances**, ainsi que l'environnement existant `DATABASE_URL` / `PAYLOAD_SECRET`. Le helper résout Payload depuis `BLOG_CMS_DIR`, charge sa config, puis remplace l'adaptateur PostgreSQL avec **`push: false` avant `getPayload`**. Le code du blog met actuellement `push: true` en dur ; seulement définir `PAYLOAD_DB_PUSH=false` ne suffit pas.

Sur un serveur qui dispose déjà du runtime source : copier `scripts/blog.mjs` et le JSON dans un dossier temporaire de la tâche, puis exécuter, depuis le CMS, avec l'environnement secret déjà chargé :

```sh
BLOG_TRANSPORT=local BLOG_CMS_DIR=/chemin/du/payload-cms \
  node --import tsx /tmp/deway-editor/blog.mjs draft /tmp/deway-editor/post.json
```

Ne pas sourcer un fichier `.env` comme du shell. Si le runtime utilise `dotenv`, `node --import dotenv/config --import tsx …` depuis le CMS peut charger son `.env` sans l'imprimer. Vérifier que cet environnement pointe bien sur la base voulue.

La stack du dépôt définit aussi un service ponctuel **`payload-init`** avec sources + dépendances dans `/app` et le volume des médias. Si son image existe déjà **et correspond au code déployé**, le même helper peut s'y exécuter sans lancer le serveur de développement :

```sh
# Sur le serveur, depuis le dossier contenant compose.yaml.
# /tmp/deway-editor contient uniquement blog.mjs, post.json et les médias utiles.
docker compose run --rm --no-deps --pull never -T \
  -v /tmp/deway-editor:/editor:ro \
  -e BLOG_TRANSPORT=local -e BLOG_CMS_DIR=/app \
  payload-init node --import tsx /editor/blog.mjs draft /editor/post.json
```

Le service reçoit les secrets et la connexion de la stack, sans les imprimer. Les commandes `find`, `get`, `publish` et `upload` fonctionnent de la même façon. Pour un upload, le fichier doit être dans le dossier monté ; le service utilise `/app/media` et son volume existant. Pour publier, remplacer les derniers arguments par `publish /editor/post.json ID`, dans le périmètre autorisé.

L'image **runner** `deway-blog-payload` est une image Next standalone : les sources TypeScript et `tsx` n'y sont pas garantis. Ne pas supposer qu'un `docker exec … node --import tsx src/…` fonctionne. Si aucun runtime source correspondant n'existe, terminer le fichier éditorial et demander les identifiants API ou le runtime manquant. Ne pas démarrer un initializer Next, reconstruire des images, migrer la base ou redéployer pour publier un texte.

## Preview et vérification publique

La preview est `/preview/{id}?secret=…`. Le secret est vérifié par Astro puis transmis à Payload par `x-payload-preview-secret`. Il autorise des lectures, **pas des écritures**. Ouvrir la preview dans l'outil navigateur disponible en gardant le secret hors de la réponse finale ; sinon orienter vers le studio `/admin/collections/posts/{id}`. Inspecter à environ 390 px et en bureau si le navigateur est disponible.

Après publication, requêter l'origine publique **sans JWT, sans cookie et sans header de preview**. Vérifier l'ID, `_status: published`, le titre et le contenu attendu dans `/api/posts/{id}?depth=1`, puis la présence du texte et des widgets dans `/notes/{slug}`. Un simple HTTP 200 n'établit pas que la nouvelle version est visible. Vérifier aussi l'accueil si le billet doit y apparaître ; la liste est limitée à 100 contenus et utilise `_order`.

## Bases documentaires

Schéma et rendu observés dans le dépôt Deway le 10 octobre 2026 : `Posts.ts`, `Users.ts`, `Media.ts`, `contentWidgets.ts`, `InlineWidgets.ts`, `payload.config.ts`, `payload.ts`, `SessionTranscript.astro` et `compose.yaml`. En cas de divergence, le serveur courant fait autorité.

Contrats Payload : [REST](https://payloadcms.com/docs/rest-api/overview), [brouillons et versions](https://payloadcms.com/docs/versions/drafts), [API locale](https://payloadcms.com/docs/local-api/overview). Le multipart `_payload` est confirmé dans le [SDK Payload 3.86](https://github.com/payloadcms/payload/blob/v3.86.0/packages/sdk/src/index.ts).
