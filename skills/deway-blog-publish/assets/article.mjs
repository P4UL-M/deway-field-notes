// Run with Node, redirect stdout to a JSON file, then replace the example content.
import { rich, p, h, inline, code, link } from '../scripts/content.mjs';

console.log(JSON.stringify({
  type: 'article', _status: 'draft', archived: false,
  title: 'Écrire un billet avec les modules du blog', slug: 'exemple-billet-modules',
  summary: 'Un exemple de composition : texte, décision intégrée, étapes et lien ressource.',
  publishedAt: new Date().toISOString(),
  body: rich(
    p('Ce modèle illustre le placement des modules. Remplacer ce contenu avant toute publication.'),
    h('Une décision au bon endroit'),
    inline('InlineCallout', { tone: 'decision', eyebrow: 'Décision', title: 'Garder le rendu du blog',
      text: 'Les modules reprennent automatiquement le thème Astro.' }),
    p('Le paragraphe suivant reste après la décision : ce module est intégré au corps.'),
    h('Une procédure lisible'),
    inline('InlineSteps', { title: 'Préparer le billet', steps: [
      { title: 'Composer', text: 'Écrire le texte et choisir les modules utiles.' },
      { title: 'Relire', text: 'Vérifier le brouillon dans la preview.' },
    ] }),
    code('node /chemin/du/skill/scripts/blog.mjs validate /chemin/post.json'),
    p(link('Ouvrir le blog', 'https://blog.deway.fr')),
    inline('InlineResource', { eyebrow: 'Publication', title: 'Studio Deway',
      text: 'Cette ressource fait partie du corps.', url: 'https://blog.deway.fr/admin', linkLabel: 'ouvrir le studio' }),
  ),
}, null, 2));
