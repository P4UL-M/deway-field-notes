export type PostType = 'article' | 'session';
export type MessageRole = 'user' | 'assistant';
export type MessageKind = 'message' | 'tool' | 'note';

export interface MediaAsset {
  id: number | string;
  url: string;
  alt: string;
  mime_type: string;
  width?: number | null;
  height?: number | null;
}

export interface ContentWidget {
  id: number | string;
  type: 'media' | 'callout' | 'metrics' | 'steps' | 'resource';
  media?: MediaAsset | null;
  caption?: string;
  media_layout?: 'inline' | 'wide';
  tone?: 'note' | 'decision' | 'warning' | 'success';
  eyebrow?: string;
  title?: string;
  text?: string;
  metrics?: Array<{ value: string; label: string }>;
  steps?: Array<{ title: string; text?: string }>;
  url?: string;
  link_label?: string;
}

export interface SessionMessage {
  id: number | string;
  sort: number;
  role: MessageRole;
  kind: MessageKind;
  label: string;
  content: string;
  code: string | null;
  widgets: ContentWidget[];
}

export interface Post {
  id: number | string;
  status: 'draft' | 'published';
  type: PostType;
  title: string;
  slug: string;
  summary: string;
  published_at: string;
  reading_time: number;
  body: string | null;
  widgets: ContentWidget[];
  messages: SessionMessage[];
}
