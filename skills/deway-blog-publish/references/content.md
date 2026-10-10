# Composition, schéma et widgets

## Faire un billet utile

Écrire à partir du travail réel : problème concret, choix et raisons, exemple ou résultat, limite utile et suite éventuelle. Ce sont des critères de contenu, pas des rubriques obligatoires. Conserver la langue et la voix demandées par Paul. Expliquer juste assez pour qu'un lecteur absent de la session comprenne ; éviter les journaux bruts de commandes et les annonces commerciales sans preuve.

Un article porte une idée autonome. Une session expose les échanges qui changent la décision ; supprimer les tours répétitifs, sorties volumineuses et détails d'authentification. Signaler qu'une session a été éditorialisée si les messages sont condensés ou reformulés. Pour une citation verbatim, conserver le texte et son contexte ; ne pas attribuer à Paul une phrase créée pour fluidifier le récit.

Choisir un widget lorsque sa forme fait gagner en compréhension : décision isolée, résultats mesurés, procédure, capture ou ressource. Ne pas répéter le même paragraphe sous forme de callout. Ne pas inventer un chiffre pour remplir des cartes. Des métriques doivent préciser leur périmètre et leur source dans le texte voisin. Des titres `h2`/`h3` suffisent généralement au sommaire automatique.

## Publication

| Champ Payload | Valeur |
| --- | --- |
| `type` | `article` ou `session` |
| `title` | Obligatoire |
| `slug` | Unique ; fournir une adresse explicite stable, ASCII minuscule avec tirets |
| `summary` | Obligatoire, maximum 220 caractères ; une phrase lisible sur l'accueil |
| `publishedAt` | ISO 8601 ; date voulue, pas un scheduler. Convertir depuis le fuseau de Paul si nécessaire |
| `_status` | `draft` ou `published` ; le helper choisit selon la commande |
| `body` | Lexical pour un article |
| `messages` | Tours de session, dans l'ordre du tableau |
| `archived` | Un billet archivé reste hors du public ; le helper refuse de le modifier |

Ne pas envoyer `id`, `createdAt`, `updatedAt`, `_order`, `readingTime`, `bodyHTML` ou `contentHTML` au niveau du billet. `editablePost(doc)` retire ces champs et préserve les IDs de lignes. Les images de partage sont générées par le site ; il n'existe pas de champ `cover`, `hero`, `tags`, `author` ou `seo` dans cette collection.

L'API attend `publishedAt`, `widgetType`, `mediaLayout`, `linkLabel`, `mimeType`. Les noms frontend `published_at`, `type` (dans un widget), `media_layout`, `link_label`, `mime_type` ne sont pas des noms de champs CMS.

## Construire le Lexical

Utiliser les fonctions de `scripts/content.mjs`. Elles donnent les versions de nœuds nécessaires : root/text/paragraph/heading = 1, link/upload = 3, block = 2. Les blocs ont un ID hexadécimal de 24 caractères dans `fields.id`. Pour un update, conserver les IDs existants et en générer seulement pour les nouveaux blocs.

```js
import { rich, p, h, text, list, link, code, inline, upload } from '/chemin/du/skill/scripts/content.mjs';
const body = rich(
  p('Un début direct avec ', text('un passage important', 1), '.'),
  h('Le choix technique'),
  p(link('Source', 'https://example.org/reference')),
  list(['Premier constat', 'Deuxième constat']),
  code('npm run build', 'shell'),
  inline('InlineCallout', { tone: 'decision', title: 'Décision', text: 'Motif concret.' }),
  p('La suite du raisonnement.'),
  // Après un upload réel : upload(mediaID, 'Description de la capture'),
);
```

Format du texte : `0` normal, `1` gras, `2` italique, `16` code inline. Une chaîne contenant `**gras**` reste du texte littéral. Écrire des nœuds `link` pour les liens, et le bloc `Code` pour du code multiligne ; ne pas injecter du HTML arbitraire. Une image simple peut être intégrée avec `upload(ID, alt)`. Utiliser `InlineMedia` pour une image ou une vidéo avec contrôles, une légende et le choix de largeur.

## Widgets intégrés dans un article

Ces blocs se placent exactement parmi `body.root.children`, avec `inline(blockType, fields)`. Les champs sont des textes simples, pas du Markdown ou du HTML.

| `blockType` exact | Champs |
| --- | --- |
| `InlineMedia` | `media`: ID scalaire du document média ; `caption` facultative ; `mediaLayout`: `inline` ou `wide` |
| `InlineCallout` | `tone`: `note`, `decision`, `warning` ou `success` ; `eyebrow`, `title`, `text` facultatifs |
| `InlineMetrics` | `metrics`: 1 à 4 objets `{value, label}`, deux textes obligatoires |
| `InlineSteps` | `title` facultatif, `steps`: au moins un `{title, text}`, titre obligatoire |
| `InlineResource` | `url` obligatoire, `eyebrow`, `title`, `text`, `linkLabel` facultatifs |
| `Code` | `code`, `language` (par exemple `shell`, `typescript`, `json`, `text`) |
| `MemoryDiagram` | `variant`: `retrieval`, `system` ou `shared` |

`MemoryDiagram` représente uniquement les trois schémas prédéfinis de mémoire Obsidian : accès fichiers/retrieval, MCP + skills + vault, et mémoire projet partagée. Ce n'est pas un moteur Mermaid ni un diagramme personnalisable. Pour un autre schéma, créer une image adaptée avec les outils disponibles, l'uploader et la décrire.

```js
// Après avoir obtenu un véritable ID média :
// inline('InlineMedia', { media: mediaID, caption: 'Résultat observé', mediaLayout: 'wide' });
inline('InlineMetrics', { metrics: [
  { value: '220', label: 'Caractères maximum du résumé' },
  { value: '2', label: 'Formats éditoriaux' },
] });
inline('InlineSteps', { title: 'Publication', steps: [
  { title: 'Rédiger', text: 'Composer le corps et les modules.' },
  { title: 'Relire', text: 'Inspecter le brouillon et la preview.' },
] });
inline('InlineResource', { eyebrow: 'Documentation', title: 'Payload',
  text: 'Contrat REST du CMS.', url: 'https://payloadcms.com/docs/rest-api/overview', linkLabel: 'lire la documentation' });
```

Les exemples de chiffres ci-dessus décrivent des contraintes vérifiables du blog. Pour un article réel, ne conserver que les métriques utiles à son sujet.

## Modules après un message de session

Utiliser `widgetType`, **pas** `blockType`. Ces modules sont des lignes de `messages[].widgets`, pas des blocs Lexical. Leur ordre est celui du tableau. Ils acceptent un `id` existant lors d'une modification.

| `widgetType` | Champs |
| --- | --- |
| `callout` | `tone`, `eyebrow`, `title`, `text` ; mêmes tonalités que l'intégré |
| `metrics` | `metrics`: 1 à 4 `{value, label}` |
| `steps` | `title`, `steps`: au moins un `{title, text}` |
| `resource` | `url`, `eyebrow`, `title`, `text`, `linkLabel` |
| `media` | `media`: ID d'un document media ; `caption`, `mediaLayout`: `inline` ou `wide` |

```json
[
  { "widgetType": "callout", "tone": "decision", "eyebrow": "Décision", "title": "Choix retenu", "text": "Motif et conséquence." },
  { "widgetType": "metrics", "metrics": [{ "value": "2", "label": "Formats du blog" }] },
  { "widgetType": "steps", "title": "Procédure", "steps": [{ "title": "Relire", "text": "Ouvrir la preview." }] },
  { "widgetType": "resource", "title": "Deway", "url": "https://blog.deway.fr", "linkLabel": "ouvrir le blog" }
]
```

Pour un média, remplacer son ID par celui retourné par un upload réel ; ne pas inventer `media: 1`. Une URL externe seule ne constitue pas une relation média. Le schéma media exige `alt`. Un module de média peut afficher une légende, une image ou une vidéo selon son MIME.

## Sessions

Chaque message possède `role`, `kind`, `label`, éventuellement `content` Lexical, `code` et `widgets`. Le hook force les libellés Paul/Agent. Utiliser `message(role, content, options)` pour les nouveaux tours :

```js
message('user', 'Texte réel de la demande de Paul.');
message('assistant', 'Explication extraite de la session.');
message('assistant', 'Décision et raison.', { kind: 'note', widgets: [
  { widgetType: 'callout', tone: 'decision', title: 'Décision', text: 'Conséquence concrète.' },
] });
message('assistant', '', { kind: 'tool', code: '# Commande et résultat réel, expurgés' });
```

Les formes `tool` et `note` restent une voix Agent. Ne pas utiliser `role: tool`, `role: terminal` ou une voix système supplémentaire. Le champ top-level `widgets` n’existe plus ; attacher les modules de session aux messages. Pour les messages ordinaires, utiliser des paragraphes, listes, liens et code inline dans `content`. Les blocs Code/Inline*/MemoryDiagram ont des convertisseurs personnalisés uniquement dans les articles ; utiliser `code` / `widgets` dans une session pour bénéficier du rendu établi.
