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

const text = (value: string, format = 0): LexicalNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
})

const paragraph = (value: string, format = 0): LexicalNode => ({
  children: [text(value, format)],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  type: 'paragraph',
  version: 1,
})

const heading = (value: string, tag: 'h2' | 'h3' = 'h2'): LexicalNode => ({
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  tag,
  type: 'heading',
  version: 1,
})

const quote = (value: string): LexicalNode => ({
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  type: 'quote',
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

const message = (role: MessageRole, label: string, content: string, code?: string, kind: MessageKind = 'message') => ({
  role,
  kind,
  label,
  content: richText(paragraph(content)),
  code: code || null,
})

const payload = await getPayload({ config })

const users = await payload.find({ collection: 'users', limit: 1 })
if (users.totalDocs === 0) {
  const seedEmail = process.env.SEED_ADMIN_EMAIL
  const seedPassword = process.env.SEED_ADMIN_PASSWORD

  if (!seedEmail || !seedPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to create the first local author.')
  }

  await payload.create({
    collection: 'users',
    data: {
      email: seedEmail,
      password: seedPassword,
    },
  })
  payload.logger.info('Auteur local créé depuis les variables SEED_ADMIN_*')
}

const posts = await payload.find({ collection: 'posts', limit: 1, draft: true })
if (posts.totalDocs === 0) {
  await payload.create({
    collection: 'posts',
    data: {
      _status: 'published',
      type: 'session',
      title: 'Faire migrer le blog sans perdre le fil',
      slug: 'faire-migrer-le-blog-sans-perdre-le-fil',
      summary: 'Écrire dans Payload, prévisualiser dans Astro et garder un thème entièrement sur mesure.',
      publishedAt: '2026-07-15T14:20:00.000Z',
      readingTime: 7,
      messages: [
        message(
          'user',
          'Paul',
          'Je veux une vraie interface pour écrire, prévisualiser puis publier — mais je ne veux plus qu’un CMS décide de la forme du blog.',
        ),
        message(
          'assistant',
          'Agent',
          'On peut séparer complètement les responsabilités : Payload organise les contenus et Astro compose les pages. Le thème devient le produit lui-même.',
        ),
        message(
          'assistant',
          'Agent',
          'La démo locale tient désormais en deux applications.',
          '$ npm run dev\n✔ payload  ready\n✔ astro    ready\n✔ preview  connected',
          'tool',
        ),
        message(
          'assistant',
          'Agent',
          'Les articles classiques et les sessions vivent dans la même collection. Chaque message se déplace, se replie et se prévisualise dans le véritable thème.',
        ),
        message(
          'assistant',
          'Agent',
          'Payload conserve les brouillons et les versions. Astro reste entièrement responsable du rendu public.',
          undefined,
          'note',
        ),
      ],
    },
  })

  await payload.create({
    collection: 'posts',
    data: {
      _status: 'published',
      type: 'article',
      title: 'Pourquoi je garde mes services auto-hébergés',
      slug: 'pourquoi-je-garde-mes-services-auto-heberges',
      summary: 'Pourquoi un petit serveur compréhensible vaut encore le temps qu’il demande.',
      publishedAt: '2026-07-10T08:30:00.000Z',
      readingTime: 6,
      body: richText(
        paragraph(
          'Un serveur personnel n’est jamais totalement gratuit : il demande du temps, quelques sauvegardes et l’envie de comprendre ce qui se passe quand une page ne répond plus.',
        ),
        paragraph(
          'Pourtant, mon serveur continue d’héberger les services que j’utilise chaque semaine. Pas par goût de la complexité, mais parce que cette petite machine me donne exactement le niveau de contrôle dont j’ai besoin.',
        ),
        heading('Une infrastructure que je peux raconter'),
        paragraph(
          'Chaque service a une adresse, un fichier de configuration et une raison d’être. Quand quelque chose casse, le chemin entre le navigateur et le processus reste court : DNS, Apache, conteneur, application.',
        ),
        quote(
          'La vraie valeur de l’auto-hébergement n’est pas de tout posséder. C’est de pouvoir expliquer comment chaque pièce tient avec les autres.',
        ),
        paragraph(
          'Cette lisibilité vaut davantage qu’un tableau de bord rempli de voyants verts. Elle permet de migrer une brique, d’en abandonner une autre et de conserver les données sans dépendre d’un format propriétaire.',
        ),
        heading('Accepter une maintenance mesurée'),
        paragraph(
          'Je ne cherche pas une disponibilité théorique de 99,999 %. Je cherche des sauvegardes vérifiées, des mises à jour prévisibles et une architecture assez petite pour tenir dans ma tête.',
        ),
        paragraph(
          'Ce serveur n’est donc pas seulement une machine. C’est un atelier : imparfait, observable et suffisamment calme pour expérimenter.',
        ),
      ),
    },
  })

  payload.logger.info('Deux publications Payload de démonstration ont été créées.')
} else {
  payload.logger.info(`Seed ignoré : ${posts.totalDocs} publication(s) déjà présente(s).`)
}

process.exit(0)
