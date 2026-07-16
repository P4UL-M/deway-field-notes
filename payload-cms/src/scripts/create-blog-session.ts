import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

type MessageRole = 'user' | 'assistant'
type MessageKind = 'message' | 'tool' | 'note'

type LexicalNode = {
  type: string
  version: number
  [key: string]: unknown
}

const slug = 'construire-un-blog-sur-mesure-avec-astro-et-payload'

const text = (value: string): LexicalNode => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
})

const paragraph = (value: string): LexicalNode => ({
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  type: 'paragraph',
  version: 1,
})

const richText = (...children: LexicalNode[]) => ({
  root: {
    children,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const message = (
  role: MessageRole,
  content: string,
  kind: MessageKind = 'message',
  code?: string,
) => ({
  role,
  kind: role === 'user' ? 'message' : kind,
  label: role === 'user' ? 'Paul' : 'Agent',
  content: richText(paragraph(content)),
  code: code || null,
})

const messages = [
  message(
    'user',
    'Je veux un blog auto-hébergé, avec un seul auteur et pas de newsletter. Par contre je veux de l’analytique, et surtout quelque chose de beaucoup plus beau qu’un blog minimaliste.',
  ),
  message(
    'assistant',
    'Le besoin s’est vite précisé : une vraie direction artistique, des articles classiques et un second format qui se lirait comme une session de travail. L’idée n’était plus de trouver un thème existant, mais de construire une identité propre.',
  ),
  message(
    'user',
    'On pourrait publier les billets en mode chat session, avec les messages, les commandes et les résultats d’outils ? Et garder aussi un blog classique dans la même liste ?',
  ),
  message(
    'assistant',
    'Oui. Les deux formats peuvent partager la même chronologie : un article reste un texte éditorial, une session raconte la résolution d’un problème avec seulement deux voix. Les commandes deviennent des tool calls de l’Agent, pas une troisième voix.',
  ),
  message(
    'user',
    'Au début Publii semblait pratique, mais est-ce qu’il nous sert vraiment à quelque chose si on refait tout le thème et le mode de publication ?',
  ),
  message(
    'assistant',
    'Plus vraiment. Publii sait très bien générer un site statique, mais son modèle devient une contrainte dès que la session, la prévisualisation et les composants éditoriaux sont sur mesure. Astro permet de garder le site léger tout en contrôlant chaque détail du rendu.',
    'note',
  ),
  message(
    'user',
    'Ok, go Astro. Mais comment j’écris facilement après ? Je veux une interface avec des brouillons, des médias et une vraie preview avant publication.',
  ),
  message(
    'assistant',
    'On sépare l’édition et l’affichage. Payload conserve les contenus en base, les versions, les médias et les brouillons. Astro reste entièrement responsable du site public. La preview de Payload ouvre le véritable rendu Astro, pas une imitation dans le CMS.',
  ),
  message(
    'user',
    'Directus me paraît payant, compliqué et sa preview marche mal. Payload par contre, j’aime bien. Combien d’applications Node ça ajoute ?',
  ),
  message(
    'assistant',
    'Deux : Payload pour l’administration et Astro pour le site. PostgreSQL reste un service séparé déjà présent sur le serveur personnel. C’est une séparation nette : le CMS écrit, le frontend lit et compose.',
  ),
  message(
    'user',
    'Ok ça me va, go faire ça. Et je veux pouvoir ajouter du code, des notes, des étapes, des médias et des widgets sans perdre le thème fait maison.',
  ),
  message(
    'assistant',
    'La collection Publications reçoit les deux formats. Les articles disposent d’un corps riche et de modules visuels. Les sessions assemblent les tours Paul et Agent, avec des notes et des tool calls. Le temps de lecture est calculé automatiquement sur le contenu réel.',
  ),
  message(
    'user',
    'J’adore la démo. On déploie ça sur mon serveur, mais réutilise le PostgreSQL qui tourne déjà. Et garde Umami à l’extérieur du blog public, protégé comme le reste de l’admin.',
  ),
  message(
    'assistant',
    '',
    'tool',
    '$ docker compose up -d --build\n✔ payload      ready\n✔ astro        ready\n✔ postgresql   connected\n✔ umami        healthy\n✔ reverse proxy healthy',
  ),
  message(
    'user',
    'Le fond est bon. Maintenant je veux retrouver exactement la DA sombre et chaude du premier site, une lecture responsive, une barre de progression orange et une navigation d’article vraiment utile.',
  ),
  message(
    'assistant',
    'Le thème final garde le fond presque noir, la typographie éditoriale, les repères monospace et l’accent terre cuite. Les articles ont un sommaire actif, les sessions révèlent les réponses de l’Agent au défilement, et les tool calls restent de simples blocs terminal.',
  ),
  message(
    'user',
    'Donc au quotidien, je peux écrire, vérifier le vrai rendu puis publier sans avoir à modifier le thème ou relancer tout le projet à la main ?',
  ),
  message(
    'assistant',
    'Oui. Payload centralise l’écriture, les brouillons et les médias ; Astro applique le thème sur mesure ; le serveur héberge la pile et Umami mesure les visites sobrement. Le travail éditorial reste simple sans sacrifier le contrôle technique.',
    'note',
  ),
]

const payload = await getPayload({ config })
const existing = await payload.find({
  collection: 'posts',
  draft: true,
  limit: 1,
  overrideAccess: true,
  where: { slug: { equals: slug } },
})

if (existing.totalDocs > 0) {
  const post = await payload.update({
    collection: 'posts',
    id: existing.docs[0]!.id,
    data: { messages },
    draft: true,
    overrideAccess: true,
  })
  payload.logger.info(`Session réécrite en brouillon : ${post.id} — ${post.title}`)
  process.exit(0)
}

const post = await payload.create({
  collection: 'posts',
  data: {
    _status: 'draft',
    type: 'session',
    title: 'Construire un blog sur mesure avec Astro et Payload',
    slug,
    summary:
      'Les décisions clés derrière un blog auto-hébergé, éditable dans Payload et entièrement dessiné avec Astro.',
    publishedAt: '2026-07-16T08:00:00.000Z',
    messages,
  },
  draft: true,
  overrideAccess: true,
})

payload.logger.info(`Session créée en brouillon : ${post.id} — ${post.title}`)
process.exit(0)
