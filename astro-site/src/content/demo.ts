import type { Post } from '../lib/types';

export const demoPosts: Post[] = [
  {
    id: 1,
    status: 'published',
    type: 'session',
    title: 'Faire migrer le blog sans perdre le fil',
    slug: 'faire-migrer-le-blog-sans-perdre-le-fil',
    summary: 'Écrire dans Payload, prévisualiser dans Astro et garder un thème entièrement sur mesure.',
    published_at: '2026-07-15T14:20:00.000Z',
    reading_time: 7,
    body: null,
    messages: [
      {
        id: 1,
        sort: 1,
        role: 'user',
        kind: 'message',
        label: 'Paul',
        content: '<p>Je veux une vraie interface pour écrire, prévisualiser puis publier — mais je ne veux plus qu’un CMS décide de la forme du blog.</p>',
        code: null,
        widgets: [],
      },
      {
        id: 2,
        sort: 2,
        role: 'assistant',
        kind: 'message',
        label: 'Agent',
        content: '<p>On peut séparer complètement les deux responsabilités : Payload organise les contenus et Astro compose les pages.</p><p>Le thème n’est plus une adaptation du CMS. Il devient le produit lui-même.</p>',
        code: null,
        widgets: [],
      },
      {
        id: 3,
        sort: 3,
        role: 'assistant',
        kind: 'tool',
        label: 'Agent',
        content: '<p>La démo locale tient en deux applications.</p>',
        code: '$ npm run dev\n✔ payload  ready\n✔ astro    ready\n✔ preview  connected',
        widgets: [],
      },
      {
        id: 4,
        sort: 4,
        role: 'assistant',
        kind: 'message',
        label: 'Agent',
        content: '<p>Les articles classiques et les sessions vivent désormais dans la même collection. Sur la page d’accueil, chacun garde une seule ligne de résumé — assez pour comprendre, pas assez pour encombrer.</p>',
        code: null,
        widgets: [],
      },
      {
        id: 5,
        sort: 5,
        role: 'assistant',
        kind: 'note',
        label: 'Agent',
        content: '<p>Payload conserve les brouillons et les versions. Astro reste entièrement responsable du rendu public.</p>',
        code: null,
        widgets: [],
      },
    ],
    widgets: [],
  },
  {
    id: 2,
    status: 'published',
    type: 'article',
    title: 'Pourquoi je garde mes services sur Watson',
    slug: 'pourquoi-je-garde-mes-services-sur-watson',
    summary: 'Pourquoi un petit serveur compréhensible vaut encore le temps qu’il demande.',
    published_at: '2026-07-10T08:30:00.000Z',
    reading_time: 6,
    messages: [],
    widgets: [],
    body: `
      <p class="lead">Un serveur personnel n’est jamais totalement gratuit : il demande du temps, quelques sauvegardes et l’envie de comprendre ce qui se passe quand une page ne répond plus.</p>
      <p>Pourtant, Watson continue d’héberger les services que j’utilise chaque semaine. Pas par goût de la complexité, mais parce que cette petite machine me donne exactement le niveau de contrôle dont j’ai besoin.</p>
      <h2>Une infrastructure que je peux raconter</h2>
      <p>Chaque service a une adresse, un fichier de configuration et une raison d’être. Quand quelque chose casse, le chemin entre le navigateur et le processus reste court : DNS, Apache, conteneur, application.</p>
      <blockquote>La vraie valeur de l’auto-hébergement n’est pas de tout posséder. C’est de pouvoir expliquer comment chaque pièce tient avec les autres.</blockquote>
      <p>Cette lisibilité vaut davantage qu’un tableau de bord rempli de voyants verts. Elle permet de migrer une brique, d’en abandonner une autre et de conserver les données sans dépendre d’un format propriétaire.</p>
      <h2>Accepter une maintenance mesurée</h2>
      <p>Je ne cherche pas une disponibilité théorique de 99,999 %. Je cherche des sauvegardes vérifiées, des mises à jour prévisibles et une architecture assez petite pour tenir dans ma tête.</p>
      <p>Watson n’est donc pas seulement un serveur. C’est un atelier : imparfait, observable et suffisamment calme pour expérimenter.</p>
    `,
  },
];
