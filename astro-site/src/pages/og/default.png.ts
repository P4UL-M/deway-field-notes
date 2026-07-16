import type { APIRoute } from 'astro';
import { renderSocialImage } from '../../lib/socialImage';

export const prerender = false;

export const GET: APIRoute = async () => {
  const image = renderSocialImage({
    title: 'Software, infrastructure and field notes.',
    summary: 'Notes de terrain sur le code, les systèmes et les outils que je construis.',
    type: 'website',
  });

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
};
