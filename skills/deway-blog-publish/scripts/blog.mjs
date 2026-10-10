#!/usr/bin/env node
// Node 22; REST by default. Local Payload mode uses an existing CMS runtime.
import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

class BlogError extends Error {}
const fail = (message) => { throw new BlogError(message); };
const mediaTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime' };
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const validID = (v) => (typeof v === 'number' && v > 0) || (typeof v === 'string' && v.length > 0);
const httpURL = (v) => { try { return ['https:', 'http:'].includes(new URL(v).protocol); } catch { return false; } };

function widget(value, inline = false) {
  const type = inline ? value.blockType : value.widgetType;
  const types = inline
    ? ['InlineMedia', 'InlineCallout', 'InlineMetrics', 'InlineSteps', 'InlineResource', 'MemoryDiagram', 'Code']
    : ['callout', 'metrics', 'steps', 'resource', 'media'];
  if (!types.includes(type)) fail(`Type de widget inconnu : ${type}`);
  if (['callout', 'InlineCallout'].includes(type) && value.tone && !['note', 'decision', 'warning', 'success'].includes(value.tone)) fail('Tonalité inconnue.');
  if (['metrics', 'InlineMetrics'].includes(type) &&
      (!Array.isArray(value.metrics) || value.metrics.length < 1 || value.metrics.length > 4 || value.metrics.some(m => !nonempty(m.value) || !nonempty(m.label)))) fail('Chiffres : 1 à 4 paires value/label non vides.');
  if (['steps', 'InlineSteps'].includes(type) &&
      (!Array.isArray(value.steps) || !value.steps.length || value.steps.some(s => !nonempty(s.title)))) fail('Étapes : au moins une étape titrée.');
  if (['resource', 'InlineResource'].includes(type) && !httpURL(value.url)) fail('Ressource : URL HTTP(S) requise.');
  if (['media', 'InlineMedia'].includes(type) && (!validID(value.media) || (value.mediaLayout && !['inline', 'wide'].includes(value.mediaLayout)))) fail('Média : ID scalaire et largeur inline/wide requis.');
  if (type === 'Code' && !nonempty(value.code)) fail('Bloc Code vide.');
  if (type === 'MemoryDiagram' && !['retrieval', 'system', 'shared'].includes(value.variant)) fail('Variante MemoryDiagram inconnue.');
}

function lexical(value, session = false) {
  if (value?.root?.type !== 'root' || !Array.isArray(value.root.children) || !value.root.children.length) fail('Contenu Lexical root.children non vide requis.');
  function visit(node) {
    if (!node || typeof node.type !== 'string' || !Number.isInteger(node.version)) fail('Nœud Lexical sans type/version.');
    if (node.type === 'text' && typeof node.text !== 'string') fail('Nœud text sans texte.');
    if (node.type === 'heading' && !['h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag)) fail('Titre Lexical : utiliser h2/h3, jamais un deuxième h1.');
    if (node.type === 'block') {
      if (session) fail('Utiliser code/widgets du message : les convertisseurs personnalisés ne sont pas configurés sur contentHTML.');
      if (node.version !== 2 || !nonempty(node.fields?.id)) fail('Bloc Lexical : version 2 et fields.id requis.');
      widget(node.fields, true);
    }
    if (node.type === 'upload' && (node.relationTo !== 'media' || !validID(node.value))) fail('Upload Lexical : relationTo media et value = ID scalaire.');
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) fail('children doit être un tableau.');
      node.children.forEach(visit);
    }
  }
  visit(value.root);
}

export function validate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Objet publication requis.');
  const allowed = ['type', 'title', 'slug', 'summary', 'publishedAt', 'body', 'messages', '_status', 'archived'];
  for (const key of Object.keys(data)) if (!allowed.includes(key)) fail(`Champ non éditable/inconnu : ${key}. Extraire les champs éditables avant envoi.`);
  if (!['article', 'session'].includes(data.type)) fail('Format article/session requis.');
  if (!nonempty(data.title) || !nonempty(data.summary) || data.summary.length > 220) fail('Titre et résumé requis ; résumé <= 220 caractères.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug || '')) fail('Slug explicite requis : lettres minuscules, chiffres, tirets.');
  if (!nonempty(data.publishedAt) || !Number.isFinite(Date.parse(data.publishedAt))) fail('Date publishedAt ISO requise.');
  if (data._status !== undefined && !['draft', 'published'].includes(data._status)) fail('Statut inconnu.');
  if (data.archived !== undefined && data.archived !== false) fail('Ce helper ne modifie pas les archives.');
  const widgets = (items) => {
    if (items === undefined) return;
    if (!Array.isArray(items)) fail('widgets doit être un tableau.');
    items.forEach(item => widget(item));
  };
  if (data.type === 'article') lexical(data.body);
  else {
    if (!Array.isArray(data.messages) || !data.messages.length) fail('Session sans messages.');
    for (const m of data.messages) {
      if (!['user', 'assistant'].includes(m.role) || !['message', 'tool', 'note'].includes(m.kind)) fail('Rôle/kind de message inconnu.');
      if (m.role === 'user' && m.kind !== 'message') fail('Paul utilise kind message.');
      if (m.contentHTML !== undefined) fail('contentHTML est calculé, écrire content.');
      widgets(m.widgets);
      if (m.kind === 'tool') {
        if (!nonempty(m.code) && !m.widgets?.length) fail('Tool call sans code/widget visible.');
      } else lexical(m.content, true);
    }
  }
  return data;
}

async function restClient() {
  const base = new URL(process.env.BLOG_API_URL || 'https://blog.deway.fr');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== '/') fail('BLOG_API_URL doit être une origine, sans /api ni identifiants.');
  if (base.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) fail('HTTP autorisé seulement en loopback (tunnel SSH).');
  let token = process.env.BLOG_TOKEN;
  async function request(method, path, body, auth = true) {
    const headers = { Accept: 'application/json' };
    if (auth && token) headers.Authorization = `JWT ${token}`;
    const multipart = body instanceof FormData;
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    const response = await fetch(new URL(path, base), {
      method, headers, redirect: 'error', signal: AbortSignal.timeout(30000),
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    });
    // Do not echo server bodies: authentication responses may contain secrets.
    if (!response.ok) fail(`API HTTP ${response.status} (${method} ${path.split('?')[0]}). Aucun nouvel essai automatique.`);
    return response.json();
  }
  if (!token) {
    if (!process.env.BLOG_EMAIL || !process.env.BLOG_PASSWORD) fail('Fournir BLOG_TOKEN ou BLOG_EMAIL + BLOG_PASSWORD via environnement.');
    const login = await request('POST', '/api/users/login', { email: process.env.BLOG_EMAIL, password: process.env.BLOG_PASSWORD }, false);
    token = login.token;
    if (!nonempty(token)) fail('La connexion ne retourne pas de JWT.');
  }
  const me = await request('GET', '/api/users/me');
  if (!me.user) fail('JWT non authentifié.');
  const doc = (result) => result.doc || result;
  return {
    find: slug => request('GET', `/api/posts?${new URLSearchParams({ 'where[slug][equals]': slug, draft: 'true', depth: '0', limit: '2' })}`),
    get: id => request('GET', `/api/posts/${encodeURIComponent(id)}?draft=true&depth=0`),
    write: async (data, id, draft) => doc(await request(id ? 'PATCH' : 'POST', `/api/posts${id ? `/${encodeURIComponent(id)}` : ''}?draft=${draft}&depth=0`, data)),
    upload: async (file, alt) => {
      const form = new FormData();
      form.set('_payload', JSON.stringify({ alt }));
      const type = mediaTypes[extname(file).toLowerCase()];
      if (!type) fail('Extension média non prise en charge par le helper. Utiliser une image/vidéo courante.');
      form.set('file', new Blob([await readFile(file)], { type }), basename(file));
      return doc(await request('POST', '/api/media', form));
    },
    close: async () => {},
  };
}

async function localClient() {
  const cms = process.env.BLOG_CMS_DIR;
  if (!cms || !process.env.DATABASE_URL || !process.env.PAYLOAD_SECRET) fail('Mode local : BLOG_CMS_DIR, DATABASE_URL et PAYLOAD_SECRET requis.');
  const require = createRequire(resolve(cms, 'package.json'));
  const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href);
  const { postgresAdapter } = await import(pathToFileURL(require.resolve('@payloadcms/db-postgres')).href);
  const module = await import(pathToFileURL(resolve(cms, process.env.BLOG_PAYLOAD_CONFIG || 'src/payload.config.ts')).href);
  const config = await module.default;
  config.typescript = { ...config.typescript, autoGenerate: false };
  config.admin = { ...config.admin, importMap: { ...config.admin?.importMap, autoGenerate: false } };
  // The blog source hardcodes push:true. Replace its adapter before initialization.
  // Loading matched production source preserves collections and rendering hooks.
  config.db = postgresAdapter({ push: false, pool: { connectionString: process.env.DATABASE_URL } });
  const payload = await getPayload({ config, disableOnInit: true });
  const options = { collection: 'posts', overrideAccess: true, overrideLock: false, depth: 0 };
  return {
    find: slug => payload.find({ ...options, draft: true, limit: 2, where: { slug: { equals: slug } } }),
    get: id => payload.findByID({ ...options, id, draft: true }),
    write: (data, id, draft) => id
      ? payload.update({ ...options, id, data, draft })
      : payload.create({ ...options, data, draft }),
    upload: (file, alt) => payload.create({ collection: 'media', overrideAccess: true, data: { alt }, filePath: resolve(file) }),
    close: () => payload.destroy(),
  };
}

export async function main(args = process.argv.slice(2)) {
  const [command, first, second] = args;
  if (!['validate', 'find', 'get', 'draft', 'publish', 'upload'].includes(command) || !first || args.length > 3 ||
      (['validate', 'find', 'get'].includes(command) && second) || (['publish', 'upload'].includes(command) && !second)) {
    fail('Usage : blog.mjs validate FILE | find SLUG | get ID | draft FILE [ID] | publish FILE ID | upload FILE ALT');
  }
  let data;
  if (['validate', 'draft', 'publish'].includes(command)) {
    data = validate(JSON.parse(await readFile(first, 'utf8')));
    // Never unarchive as a side effect of sending a template.
    delete data.archived;
  }
  if (command === 'validate') return { valid: true, type: data.type, slug: data.slug };
  if (command === 'upload' && !nonempty(second)) fail('Texte alternatif requis.');
  const transport = process.env.BLOG_TRANSPORT || 'api';
  if (!['api', 'local'].includes(transport)) fail('BLOG_TRANSPORT : api/local.');
  const client = await (transport === 'local' ? localClient() : restClient());
  try {
    if (command === 'find') return await client.find(first);
    if (command === 'get') return await client.get(first);
    if (command === 'upload') return await client.upload(first, second);
    if (second) {
      const current = await client.get(second);
      if (current.archived) fail('Publication archivée : opération refusée.');
      if (current.slug !== data.slug) fail('Le slug du fichier diffère du billet ciblé.');
      if (process.env.BLOG_EXPECT_UPDATED_AT && current.updatedAt !== process.env.BLOG_EXPECT_UPDATED_AT) fail('Le contenu a changé depuis la lecture. Relire et fusionner.');
    } else {
      const existing = await client.find(data.slug);
      if (existing.totalDocs > 0 || existing.docs?.length) fail('Slug existant : relire le billet puis fournir son ID explicitement.');
    }
    data._status = command === 'publish' ? 'published' : 'draft';
    const result = await client.write(data, second, command !== 'publish');
    if (result._status !== data._status) fail('Statut retourné inattendu : relire avant toute nouvelle écriture.');
    return result;
  } finally { await client.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    // Only our deliberate errors are detailed; library errors may contain env values.
    console.error(error instanceof BlogError ? error.message : 'Échec fichier/transport/CMS. Relire le slug ou l’ID avant toute nouvelle écriture.');
    process.exitCode = 1;
  });
}
