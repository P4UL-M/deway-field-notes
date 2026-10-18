import { message, rich, p, code } from '../scripts/content.mjs';

console.log(JSON.stringify({
  type: 'session', _status: 'draft', archived: false,
  title: 'Exemple de session éditorialisée', slug: 'exemple-session-editorialisee',
  summary: 'Une démonstration des deux voix, des notes et des modules attachés aux messages.',
  publishedAt: new Date().toISOString(),
  messages: [
    message('assistant', 'Exemple fictif de structure. Remplacer ces tours par ceux de la session source avant publication.', { kind: 'note' }),
    message('user', 'La demande réelle de Paul sera insérée ici.'),
    message('assistant', rich(
      p('L’introduction réelle de l’extrait sera insérée ici.'),
      code('# Exemple de structure à remplacer par un extrait réel', 'plaintext'),
      p('L’explication qui suit reste après le bloc de code, dans le même message.'),
    )),
    message('assistant', '', { kind: 'tool', code: '# Exemple de commande, pas une exécution constatée\nnode --version' }),
    message('assistant', 'La décision réellement prise sera expliquée ici.', { kind: 'note', widgets: [
      { widgetType: 'callout', tone: 'decision', eyebrow: 'Décision', title: 'Point à retenir', text: 'Raison et conséquence de la décision.' },
      { widgetType: 'resource', title: 'Blog Deway', url: 'https://blog.deway.fr', linkLabel: 'ouvrir le blog' },
    ] }),
  ],
}, null, 2));
