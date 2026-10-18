---
name: deway-blog-publish
description: Rédiger, illustrer, créer un brouillon, modifier ou publier un article ou une session sur le blog Deway Field Notes (blog.deway.fr), avec les widgets Payload et le thème Astro, via API authentifiée ou SSH. À utiliser pour transformer une session de travail en billet ou gérer ses contenus, sans redéployer le site.
---

# Publier sur Deway

Créer un contenu éditorial dans Payload, en conservant les composants du blog. Le site public est **https://blog.deway.fr**, le studio **https://blog.deway.fr/admin**, les billets **/notes/{slug}**. Ce skill est autonome : ses scripts API nécessitent seulement Node.js 22, pas une copie du dépôt.

## Choisir le chemin

- **API disponible** : lire [references/access.md](references/access.md), section API. Utiliser un JWT Payload existant ou les identifiants d'un auteur. Aucune clé API native n'est configurée dans le schéma actuel.
- **SSH disponible** : lire la même référence, section SSH. Préférer un tunnel et l'API quand des identifiants existent. Sans identifiants CMS, utiliser l'API locale Payload dans un environnement source déjà disponible, avec le schéma de production et `push: false`. Ne pas manipuler les tables SQL directement.
- **Écriture et widgets** : lire [references/content.md](references/content.md) avant de composer le JSON. Les noms de champs Payload diffèrent de ceux du frontend.

Les chemins `scripts/…` et `assets/…` ci-dessous sont relatifs au dossier de ce skill. Les résoudre depuis l'emplacement réel du skill, jamais depuis le dépôt de la session courante.

## Conduire le travail

1. Déduire le sujet, la langue et le format de la demande et du contexte. Choisir `article` pour une explication autonome, `session` pour raconter un travail par tours Paul/Agent. Rechercher les sources nécessaires et distinguer résultats constatés, exemples et pistes futures. Une création de skill n'autorise pas la publication d'un billet.
2. Rechercher le slug existant avec `node scripts/blog.mjs find SLUG`. Pour une modification, récupérer le dernier brouillon avec `get ID`, conserver les champs et les identifiants de lignes existants, et préparer une fusion des seuls champs éditables. Ne pas écraser un article homonyme ni recréer un billet après une erreur réseau.
3. Composer un JSON complet et relisible. Utiliser [scripts/content.mjs](scripts/content.mjs) et les modèles [assets/article.mjs](assets/article.mjs) / [assets/session.mjs](assets/session.mjs) pour produire du Lexical valide. Choisir les widgets selon leur utilité, pas selon un quota.
4. Valider hors réseau : `node scripts/blog.mjs validate /chemin/post.json`. Charger les médias utiles puis insérer leur ID. Enregistrer avec `draft /chemin/post.json [ID]`. Une modification en brouillon doit garder la version publique actuelle accessible.
5. Relire le brouillon retourné et vérifier le véritable rendu si la preview est accessible. Contrôler les titres, les widgets à leur emplacement, les liens, les médias, le code et le mobile. Pour une session, vérifier aussi l’ordre paragraphe → bloc → paragraphe à l’intérieur de chaque message ; comparer seulement le texte et le nombre d’extraits ne suffit pas. La preview nécessite le secret de preview ; un JWT seul n'ouvre pas cette page. Si aucun rendu ne peut être inspecté, signaler cette limite sans prétendre l'avoir vérifié.
6. Quand la demande autorise **publier**, poursuivre sans redemander la même autorisation : `publish /chemin/post.json ID`. Quand elle demande un brouillon, de la préparation ou laisse le statut ambigu, conserver le brouillon. La publication envoie le contenu complet revu et `_status: "published"`, jamais seulement un changement de statut qui risquerait de publier l'ancien contenu.
7. Après publication, vérifier **sans authentification** `/api/posts/{id}` et `/notes/{slug}` sur l'URL publique. Le frontend lit les contenus à chaque requête : aucun build ni redémarrage n'est nécessaire. Rendre le lien public, le statut réel et les éventuelles limites de vérification. Pour un brouillon, rendre l'ID et le lien du studio, pas une URL publique présentée comme disponible.

## Règles propres au blog

- `summary` est obligatoire et limité à **220 caractères**. Un titre concret, une introduction directe et des `h2`/`h3` structurent l'article et son sommaire ; ne pas ajouter un second `h1` dans le corps.
- Le corps est du **Lexical JSON**, pas du Markdown ou du HTML. `bodyHTML`, `contentHTML` et `readingTime` sont calculés ; ne pas les écrire.
- Les blocs `Code`, `InlineMedia`, `InlineCallout`, `InlineMetrics`, `InlineSteps` et `InlineResource` se placent entre les paragraphes de `body.root.children` (article) ou `messages[].content.root.children` (session). Le champ top-level `widgets` n’existe plus. `messages[].widgets` est réservé aux modules voulus **après tout le message**.
- Les convertisseurs sont configurés sur **bodyHTML et contentHTML**. Dans un message ordinaire, utiliser `rich(p(...), code(...), p(...))` pour garder l’extrait au bon endroit. `messages[].code` est affiché après tout le texte et son champ est masqué dans l’éditeur hors tool call : le réserver aux outils. Le validateur refuse désormais ce champ dans un message ordinaire afin d’éviter les extraits déplacés.
- Le bloc Code existant rend les diagrammes avec `language: "mermaid"` et les équations avec `language: "latex"` (formule sans délimiteurs dollar). Les PDF se déposent dans Médias, puis leur URL va dans `InlineResource` ou un module `resource`, jamais dans un widget image/vidéo. Voir les exemples de la référence de contenu.
- Une session n'a que deux voix : `role: "user"` (Paul), `role: "assistant"` (Agent). Les outils sont `assistant` + `kind: "tool"`, les décisions `assistant` + `kind: "note"`. Le `content` d'un tool call n'est pas affiché : utiliser `code` et/ou ses widgets.
- `archived: true` force le statut brouillon et retire le billet du public. Ne pas désarchiver implicitement. `publishedAt` décrit une date, **pas une programmation** de publication. La liste publique est triée par `_order`, pas par cette date ; elle est actuellement limitée à 100 contenus.
- Conserver secrets, données privées et sorties sensibles hors des billets et du skill. Ne pas fabriquer des tours de conversation, des métriques ou des résultats de commandes. Une session raccourcie ou reformulée doit être annoncée comme telle.

## Limites d'exécution

Les scripts ne créent pas de compte, ne changent pas de mot de passe, n'archivent pas, ne suppriment pas et ne déploient rien. Ils ne réessayent pas les mutations automatiquement. Après timeout ou connexion interrompue, rechercher le slug ou relire l'ID avant toute nouvelle écriture. Sur erreur de schéma, comparer les fichiers `Posts.ts`, `contentWidgets.ts`, `InlineWidgets.ts` et les convertisseurs du serveur si accessibles ; ajuster le contenu plutôt que le service.
