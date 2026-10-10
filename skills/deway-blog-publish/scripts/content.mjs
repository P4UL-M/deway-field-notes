// Payload Lexical constructors. No network or CMS dependency.
import { randomBytes } from 'node:crypto';

const id = () => randomBytes(12).toString('hex');
export const text = (value, format = 0) => ({
  type: 'text', version: 1, text: value, format, detail: 0, mode: 'normal', style: '',
});
const children = (values) => values.map(value => typeof value === 'string' ? text(value) : value);
const container = (type, values, extra = {}) => ({
  type, version: 1, children: children(values), direction: 'ltr', format: '', indent: 0, ...extra,
});
export const p = (...values) => container('paragraph', values, { textFormat: 0, textStyle: '' });
export const h = (value, tag = 'h2') => container('heading', [value], { tag });
export const quote = (...values) => container('quote', values);
export const rich = (...nodes) => ({ root: container('root', nodes) });
export const list = (values, ordered = false) => container('list',
  values.map((value, index) => container('listitem', Array.isArray(value) ? value : [value], { value: index + 1 })),
  { listType: ordered ? 'number' : 'bullet', start: 1, tag: ordered ? 'ol' : 'ul' });
export const link = (label, url) => ({
  ...container('link', [label]), version: 3,
  fields: { linkType: 'custom', newTab: true, url },
});
export const inline = (blockType, fields) => ({
  type: 'block', version: 2, format: '', fields: { ...fields, blockType, blockName: '', id: id() },
});
export const code = (value, language = 'shell') => inline('Code', { code: value, language });
export const upload = (mediaID, alt = '') => ({
  type: 'upload', version: 3, format: '', id: id(), relationTo: 'media', value: mediaID, fields: { alt },
});
export const message = (role, content, { kind = 'message', code = null, widgets = [] } = {}) => ({
  role, kind: role === 'user' ? 'message' : kind, label: role === 'user' ? 'Paul' : 'Agent',
  content: typeof content === 'string' ? rich(p(content)) : content, code, widgets,
});

// Strip calculated fields from a document read through blog.mjs get, keeping row IDs.
export function editablePost(doc) {
  const widgets = (items = []) => items.map(({ media, ...item }) => ({
    ...item, ...(media == null ? {} : { media: typeof media === 'object' ? media.id : media }),
  }));
  return {
    type: doc.type, title: doc.title, slug: doc.slug, summary: doc.summary,
    publishedAt: doc.publishedAt, _status: 'draft',
    ...(doc.type === 'article' ? { body: doc.body } : {
      messages: (doc.messages || []).map(({ contentHTML, widgets: items, ...m }) => ({ ...m, widgets: widgets(items) })),
    }),
  };
}
