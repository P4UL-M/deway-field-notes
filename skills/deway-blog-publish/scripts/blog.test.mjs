// Offline contract checks: no network, credentials, or production writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { main, validate } from './blog.mjs';
import { rich, p, inline, code, message, upload, editablePost } from './content.mjs';

const article = () => ({ type: 'article', title: 'Titre', slug: 'test-post', summary: 'Résumé',
  publishedAt: '2026-10-10T10:00:00.000Z', body: rich(p('Texte')) });
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
async function fixture(t, data = article()) {
  const dir = await mkdtemp(join(tmpdir(), 'deway-skill-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'post.json');
  await writeFile(file, JSON.stringify(data));
  return { dir, file };
}
function env(t, values = {}) {
  const keys = ['BLOG_TRANSPORT', 'BLOG_TOKEN', 'BLOG_EMAIL', 'BLOG_PASSWORD', 'BLOG_API_URL', 'BLOG_EXPECT_UPDATED_AT', 'BLOG_CMS_DIR', 'BLOG_PAYLOAD_CONFIG', 'DATABASE_URL', 'PAYLOAD_SECRET'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  keys.forEach(k => delete process.env[k]);
  Object.assign(process.env, { BLOG_API_URL: 'http://127.0.0.1:18110', BLOG_TOKEN: 'fake-jwt', ...values });
  t.after(() => keys.forEach(k => saved[k] === undefined ? delete process.env[k] : process.env[k] = saved[k]));
}
function api(t, handler) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const call = { url: new URL(url), ...init };
    calls.push(call);
    if (call.url.pathname === '/api/users/me') return json({ user: { id: 1 } });
    return handler(call);
  });
  return calls;
}

test('offline validation accepts inline blocks and real media IDs; rejects computed fields and overlong summaries', async t => {
  const data = article();
  data.body = rich(p('Texte'), inline('InlineCallout', { tone: 'decision', text: 'Choix' }),
    inline('InlineMedia', { media: 12, caption: 'Capture', mediaLayout: 'wide' }), upload(12, 'Capture'));
  assert.equal(validate(data), data);
  assert.throws(() => validate({ ...data, summary: 'x'.repeat(221) }), /220/);
  assert.throws(() => validate({ ...data, bodyHTML: '<p>HTML</p>' }), /non éditable/);
  assert.throws(() => validate({ ...data, body: rich(inline('InlineMedia', { media: { id: 12 } })) }), /scalaire/);
  assert.throws(() => validate({ ...data, body: rich(inline('InlineMedia', { media: 12, mediaLayout: 'full' })) }), /largeur/);
  assert.throws(() => validate({ ...data, widgets: [] }), /non éditable/);
  const { file } = await fixture(t, data);
  t.mock.method(globalThis, 'fetch', () => assert.fail('validate must remain offline'));
  assert.equal((await main(['validate', file])).valid, true);
});

test('sessions preserve blocks between paragraphs, reserve trailing code for tools, and reject invisible top-level widgets', () => {
  const data = { ...article(), type: 'session', messages: [message('user', 'Demande'), message('assistant', '', { kind: 'tool', code: '$ node --version' })] };
  assert.equal(validate(data), data);
  const content = rich(p('Avant'), code('x', 'plaintext'), p('Après'),
    code('flowchart LR\nA --> B', 'mermaid'), code(String.raw`E = mc^2`, 'latex'));
  const session = { ...data, messages: [message('assistant', content)] };
  assert.equal(validate(session), session);
  assert.deepEqual(content.root.children.map(node => node.type), ['paragraph', 'block', 'paragraph', 'block', 'block']);
  assert.throws(() => validate({ ...data, messages: [message('assistant', 'Avant et après', { code: 'x' })] }), /messages\[0\].*après tout le message/);
  assert.throws(() => validate({ ...data, messages: [message('assistant', rich({ type: 'code', version: 1, children: [] }))] }), /bloc Payload Code/);
  assert.throws(() => validate({ ...data, widgets: [{ widgetType: 'callout' }] }), /non éditable/);
});

test('resource URLs support uploaded PDF paths and widget-only messages, but identify unfinished rows', () => {
  const resource = { widgetType: 'resource', url: '/api/media/file/cours.pdf', linkLabel: 'Télécharger' };
  const data = { ...article(), type: 'session', messages: [message('assistant', null, { widgets: [resource] })] };
  assert.equal(validate(data), data);
  for (const url of ['javascript:alert(1)', '//elsewhere.test/file.pdf', '/\\elsewhere.test/file.pdf', null]) {
    assert.throws(() => validate({ ...data, messages: [message('assistant', null, { widgets: [{ ...resource, url }] })] }), /messages\[0\].*widgets\[0\].*URL/);
  }
});

test('new draft forces draft status, strips archived=false, and sends Lexical content', async t => {
  env(t);
  const { file } = await fixture(t, { ...article(), _status: 'published', archived: false });
  const calls = api(t, c => {
    if (c.method === 'GET') return json({ docs: [], totalDocs: 0 });
    const data = JSON.parse(c.body);
    assert.equal(c.url.searchParams.get('draft'), 'true');
    assert.equal(data._status, 'draft');
    assert.equal(data.archived, undefined);
    assert.equal(data.body.root.children[0].children[0].text, 'Texte');
    return json({ doc: { ...data, id: 8 } });
  });
  assert.equal((await main(['draft', file])).id, 8);
  assert.equal(calls.filter(c => c.method === 'POST').length, 1);
  assert.ok(calls.every(c => c.headers.Authorization === 'JWT fake-jwt'));
});

test('duplicate slug prevents a second create', async t => {
  env(t);
  const { file } = await fixture(t);
  const calls = api(t, () => json({ docs: [{ id: 8, archived: true }], totalDocs: 1 }));
  await assert.rejects(main(['draft', file]), /Slug existant/);
  assert.ok(calls.every(c => c.method === 'GET'));
});

test('draft update uses draft=true; publication sends reviewed content with draft=false', async t => {
  env(t);
  const { file } = await fixture(t, { ...article(), body: rich(p('Version revue')) });
  const calls = api(t, c => c.method === 'GET'
    ? json({ id: 8, slug: 'test-post', _status: 'published', body: rich(p('Ancien texte')) })
    : json({ doc: { ...JSON.parse(c.body), id: 8 } }));
  await main(['draft', file, '8']);
  await main(['publish', file, '8']);
  const writes = calls.filter(c => c.method === 'PATCH');
  assert.deepEqual(writes.map(c => c.url.searchParams.get('draft')), ['true', 'false']);
  assert.deepEqual(writes.map(c => JSON.parse(c.body)._status), ['draft', 'published']);
  assert.equal(JSON.parse(writes[1].body).body.root.children[0].children[0].text, 'Version revue');
});

test('archived target and concurrently edited draft prevent mutations', async t => {
  env(t, { BLOG_EXPECT_UPDATED_AT: 'earlier' });
  const { file } = await fixture(t);
  let archived = true;
  const calls = api(t, () => json({ id: 8, slug: 'test-post', archived, updatedAt: 'later' }));
  await assert.rejects(main(['publish', file, '8']), /archivée/);
  archived = false;
  await assert.rejects(main(['draft', file, '8']), /changé/);
  assert.ok(calls.every(c => c.method === 'GET'));
});

test('upload supplies image MIME, alt metadata and file bytes', async t => {
  env(t);
  const { dir } = await fixture(t);
  const file = join(dir, 'capture.png');
  await writeFile(file, Buffer.from([137, 80, 78, 71]));
  api(t, async c => {
    assert.equal(c.url.pathname, '/api/media');
    assert.equal(c.body.get('file').type, 'image/png');
    assert.equal(c.body.get('file').name, 'capture.png');
    assert.equal(c.body.get('file').size, 4);
    assert.deepEqual(JSON.parse(c.body.get('_payload')), { alt: 'Une capture' });
    return json({ doc: { id: 12 } });
  });
  assert.equal((await main(['upload', file, 'Une capture'])).id, 12);
});

test('PDF upload supplies application/pdf, document title, and exact bytes', async t => {
  env(t);
  const { dir } = await fixture(t);
  const file = join(dir, 'cours.PDF');
  const bytes = Buffer.from('%PDF-1.4\nfixture bytes');
  await writeFile(file, bytes);
  api(t, async c => {
    assert.equal(c.url.pathname, '/api/media');
    const uploaded = c.body.get('file');
    assert.equal(uploaded.type, 'application/pdf');
    assert.equal(uploaded.name, 'cours.PDF');
    assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), bytes);
    assert.deepEqual(JSON.parse(c.body.get('_payload')), { alt: 'Cours mathématique' });
    return json({ doc: { id: 15, url: 'https://blog.deway.fr/api/media/file/cours.PDF' } });
  });
  assert.equal((await main(['upload', file, 'Cours mathématique'])).id, 15);
});

test('HTTP validation errors expose field paths without echoing server messages or values, and never retry', async t => {
  env(t);
  const { file } = await fixture(t);
  const calls = api(t, c => {
    if (c.method === 'GET') return json({ docs: [], totalDocs: 0 });
    return new Response(JSON.stringify({ errors: [{ message: 'private-server-detail', data: { errors: [
      { path: 'messages.31.content', message: 'private-submitted-value' },
      { path: '<unsafe path>', message: 'private-submitted-value' },
    ] } }] }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  });
  await assert.rejects(main(['draft', file]), error => /400.*messages\.31\.content/.test(error.message)
    && !/private|unsafe/.test(error.message));
  assert.equal(calls.filter(c => c.method === 'POST').length, 1);
});

test('login token is used in memory, never returned; HTTP failure is not retried', async t => {
  env(t, { BLOG_EMAIL: 'fake@example.org', BLOG_PASSWORD: 'fake-password' });
  delete process.env.BLOG_TOKEN;
  const calls = api(t, c => {
    if (c.url.pathname.endsWith('/login')) return json({ token: 'login-jwt' });
    assert.equal(c.headers.Authorization, 'JWT login-jwt');
    return new Response('fake-secret-body', { status: 503 });
  });
  await assert.rejects(main(['find', 'test-post']), error => /503/.test(error.message) && !error.message.includes('fake-secret-body'));
  assert.equal(calls.filter(c => c.url.pathname === '/api/posts').length, 1);
});

test('editable extraction preserves row IDs and normalizes media relationships', () => {
  const result = editablePost({ ...article(), type: 'session', id: 8, updatedAt: 'timestamp', readingTime: 3,
    bodyHTML: '<p>Texte</p>', messages: [message('assistant', 'Texte', { widgets: [
      { id: 'row-1', widgetType: 'media', media: { id: 12, url: '/media.png' } },
    ] })] });
  assert.equal(result.messages[0].widgets[0].id, 'row-1');
  assert.equal(result.messages[0].widgets[0].media, 12);
  assert.equal(result.widgets, undefined);
  assert.equal(result.updatedAt, undefined);
  assert.equal(result.bodyHTML, undefined);
  validate(result);
});

test('SSH local mode disables schema push, invokes Payload hooks API and closes runtime', async t => {
  const { dir, file } = await fixture(t);
  const cms = join(dir, 'cms');
  const moduleDir = join(cms, 'node_modules');
  await mkdir(join(moduleDir, 'payload'), { recursive: true });
  await mkdir(join(moduleDir, '@payloadcms/db-postgres'), { recursive: true });
  await writeFile(join(cms, 'package.json'), '{"type":"module"}');
  await writeFile(join(cms, 'config.mjs'), 'export default Promise.resolve({db:{push:true}});');
  await writeFile(join(moduleDir, '@payloadcms/db-postgres/package.json'), '{"type":"module","main":"index.mjs"}');
  await writeFile(join(moduleDir, '@payloadcms/db-postgres/index.mjs'), 'export const postgresAdapter = options => options;');
  await writeFile(join(moduleDir, 'payload/package.json'), '{"type":"module","main":"index.mjs"}');
  await writeFile(join(moduleDir, 'payload/index.mjs'), `
    export async function getPayload({config}) {
      globalThis.__dewayConfig = config;
      if (process.env.DEWAY_TEST_LINGER) setInterval(() => {}, 1000);
      return {
        find: async () => ({docs:[], totalDocs:0}),
        findByID: async () => ({id:8,slug:'test-post',title:'x'.repeat(200000)}),
        create: async options => { globalThis.__dewayWrite = options; return {...options.data,id:8}; },
        destroy: async () => {globalThis.__dewayClosed = true;},
      };
    }
  `);
  env(t, { BLOG_TRANSPORT: 'local', BLOG_CMS_DIR: cms, BLOG_PAYLOAD_CONFIG: 'config.mjs', DATABASE_URL: 'fake-db', PAYLOAD_SECRET: 'fake-secret' });
  t.mock.method(globalThis, 'fetch', () => assert.fail('local must not use HTTP'));
  assert.equal((await main(['draft', file])).id, 8);
  assert.equal(globalThis.__dewayConfig.db.push, false);
  assert.equal(globalThis.__dewayConfig.logger.options.level, 'silent');
  assert.equal(globalThis.__dewayWrite.overrideAccess, true);
  assert.equal(globalThis.__dewayWrite.overrideLock, false);
  assert.equal(globalThis.__dewayWrite.draft, true);
  assert.equal(globalThis.__dewayClosed, true);
  const { stdout, stderr } = await promisify(execFile)(process.execPath,
    [new URL('./blog.mjs', import.meta.url).pathname, 'get', '8'],
    { env: { ...process.env, DEWAY_TEST_LINGER: 'true' }, timeout: 5000, maxBuffer: 1000000 });
  assert.equal(JSON.parse(stdout).title.length, 200000, 'Flush the entire JSON before exiting despite leftover runtime handles');
  assert.equal(stderr, '');
  t.after(() => { delete globalThis.__dewayConfig; delete globalThis.__dewayWrite; delete globalThis.__dewayClosed; });
});
