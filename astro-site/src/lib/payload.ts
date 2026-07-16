import { demoPosts } from '../content/demo';
import type { ContentWidget, MediaAsset, MessageKind, MessageRole, Post, PostType, SessionMessage } from './types';

const runtimeEnv = typeof process !== 'undefined' ? process.env : {};
const PAYLOAD_URL = runtimeEnv.PAYLOAD_URL || import.meta.env.PAYLOAD_URL || 'http://localhost:3000';
const PREVIEW_SECRET = runtimeEnv.PREVIEW_SECRET || import.meta.env.PREVIEW_SECRET || 'deway-local-preview-secret';
const PUBLIC_PAYLOAD_URL = runtimeEnv.PUBLIC_PAYLOAD_URL || import.meta.env.PUBLIC_PAYLOAD_URL || PAYLOAD_URL;
const allowDemoContent = import.meta.env.DEV || runtimeEnv.ALLOW_DEMO_CONTENT === 'true';

interface PayloadListResponse<T> {
  docs: T[];
}

interface PayloadMessage {
  id?: string;
  role?: string;
  kind?: MessageKind;
  label?: string;
  contentHTML?: string;
  code?: string | null;
  widgets?: PayloadWidget[];
}

interface PayloadMedia {
  id: number | string;
  url?: string | null;
  alt?: string;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
}

interface PayloadWidget {
  id?: number | string;
  widgetType?: ContentWidget['type'];
  media?: PayloadMedia | number | string | null;
  caption?: string | null;
  mediaLayout?: ContentWidget['media_layout'];
  tone?: ContentWidget['tone'];
  eyebrow?: string | null;
  title?: string | null;
  text?: string | null;
  metrics?: Array<{ value?: string; label?: string }>;
  steps?: Array<{ title?: string; text?: string | null }>;
  url?: string | null;
  linkLabel?: string | null;
}

interface PayloadPost {
  id: number | string;
  _status?: 'draft' | 'published';
  type?: PostType;
  title?: string;
  slug?: string;
  summary?: string;
  publishedAt?: string;
  readingTime?: number;
  bodyHTML?: string;
  widgets?: PayloadWidget[];
  messages?: PayloadMessage[];
}

function normalizeMedia(media: PayloadWidget['media']): MediaAsset | null {
  if (!media || typeof media !== 'object' || !media.url) return null;
  const url = media.url.startsWith('http')
    ? media.url
    : `${PUBLIC_PAYLOAD_URL.replace(/\/$/, '')}${media.url.startsWith('/') ? '' : '/'}${media.url}`;

  return {
    id: media.id,
    url,
    alt: media.alt || '',
    mime_type: media.mimeType || '',
    width: media.width,
    height: media.height,
  };
}

function normalizeWidgets(widgets: PayloadWidget[] = []): ContentWidget[] {
  return widgets.map((widget, index) => ({
    id: widget.id || `widget-${index + 1}`,
    type: widget.widgetType || 'callout',
    media: normalizeMedia(widget.media),
    caption: widget.caption || '',
    media_layout: widget.mediaLayout || 'inline',
    tone: widget.tone || 'note',
    eyebrow: widget.eyebrow || '',
    title: widget.title || '',
    text: widget.text || '',
    metrics: (widget.metrics || []).map((item) => ({ value: item.value || '', label: item.label || '' })),
    steps: (widget.steps || []).map((item) => ({ title: item.title || '', text: item.text || '' })),
    url: widget.url || '',
    link_label: widget.linkLabel || 'ouvrir la ressource',
  }));
}

function stripHTML(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
}

function widgetText(widgets: ContentWidget[]): string {
  return widgets.flatMap((widget) => [
    widget.caption,
    widget.eyebrow,
    widget.title,
    widget.text,
    ...(widget.metrics || []).flatMap((metric) => [metric.value, metric.label]),
    ...(widget.steps || []).flatMap((step) => [step.title, step.text]),
  ]).filter(Boolean).join(' ');
}

function calculateReadingTime(body: string | null, messages: SessionMessage[], widgets: ContentWidget[]): number {
  const prose = [
    stripHTML(body || ''),
    widgetText(widgets),
    ...messages.map((message) => `${stripHTML(message.content)} ${widgetText(message.widgets)}`),
  ].join(' ');
  const words = prose.trim().split(/\s+/u).filter(Boolean).length;
  const codeLines = messages.reduce(
    (total, message) => total + (message.code?.split('\n').filter((line) => line.trim()).length || 0),
    0,
  );

  return Math.max(1, Math.ceil(words / 220 + codeLines / 12));
}

function normalizePost(post: PayloadPost): Post {
  const body = post.bodyHTML || null;
  const widgets = normalizeWidgets(post.widgets);
  const messages = (post.messages || []).map(
    (message, index): SessionMessage => {
      const role: MessageRole = message.role === 'user' ? 'user' : 'assistant';
      const kind: MessageKind = role === 'user'
        ? 'message'
        : message.kind === 'tool' || message.role === 'tool' || message.role === 'terminal'
          ? 'tool'
          : message.kind === 'note' || message.role === 'note'
            ? 'note'
            : 'message';

      return {
        id: message.id || `${post.id}-${index + 1}`,
        sort: index + 1,
        role,
        kind,
        label: role === 'user' ? 'Paul' : 'Agent',
        content: message.contentHTML || '',
        code: message.code || null,
        widgets: normalizeWidgets(message.widgets),
      };
    },
  );

  return {
    id: post.id,
    status: post._status || 'draft',
    type: post.type || 'article',
    title: post.title || 'Sans titre',
    slug: post.slug || String(post.id),
    summary: post.summary || '',
    published_at: post.publishedAt || new Date().toISOString(),
    reading_time: calculateReadingTime(body, messages, widgets),
    body,
    widgets,
    messages,
  };
}

async function request<T>(path: string, headers: HeadersInit = {}): Promise<T> {
  const response = await fetch(`${PAYLOAD_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Payload ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

export async function getPublishedPosts(): Promise<Post[]> {
  try {
    const query = new URLSearchParams({
      depth: '1',
      limit: '100',
      sort: '-publishedAt',
      'where[_status][equals]': 'published',
    });
    const result = await request<PayloadListResponse<PayloadPost>>(`/api/posts?${query}`);
    return result.docs.map(normalizePost);
  } catch (error) {
    console.warn('[content] Payload unavailable.', error);
    return allowDemoContent ? demoPosts : [];
  }
}

export async function getPreviewPost(id: string, secret: string): Promise<Post | null> {
  if (!secret || secret !== PREVIEW_SECRET) return null;

  try {
    const query = new URLSearchParams({ draft: 'true', depth: '1' });
    const post = await request<PayloadPost>(`/api/posts/${encodeURIComponent(id)}?${query}`, {
      'x-payload-preview-secret': secret,
    });
    return normalizePost(post);
  } catch (error) {
    console.warn('[preview] Payload preview unavailable.', error);
    return allowDemoContent ? demoPosts.find((post) => String(post.id) === id) || null : null;
  }
}
