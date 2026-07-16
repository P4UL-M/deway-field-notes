import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../../lib/payload';
import { renderSocialImage } from '../../lib/socialImage';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const posts = await getPublishedPosts();
  const post = posts.find((candidate) => candidate.slug === params.slug);

  if (!post) return new Response('Image introuvable', { status: 404 });

  const publishedDate = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(post.published_at));

  const image = renderSocialImage({
    title: post.title,
    summary: post.summary,
    type: post.type,
    date: publishedDate,
  });

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
};
