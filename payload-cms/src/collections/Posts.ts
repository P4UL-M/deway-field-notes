import { lexicalHTMLField } from '@payloadcms/richtext-lexical'
import type { CollectionConfig, PayloadRequest } from 'payload'

import { contentWidgets } from '../fields/contentWidgets'
import { calculateReadingTime } from '../utilities/readingTime'

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const canPreview = (req: PayloadRequest) => {
  if (req.user) return true

  return req.headers.get('x-payload-preview-secret') === process.env.PREVIEW_SECRET
}

const escapeHTML = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[character] || character
  })

const memoryDiagramHTML = (variant = 'retrieval') => {
  if (variant === 'system') {
    return `<figure class="memory-diagram memory-diagram--system" aria-label="MCP, agent skills and vault architecture form one memory workflow">
      <div class="memory-diagram__pillars">
        <div><small>access</small><strong>MCP</strong><span>search · read · graph · capture</span></div>
        <i aria-hidden="true">+</i>
        <div><small>behaviour</small><strong>skills</strong><span>load · work · distill · maintain</span></div>
        <i aria-hidden="true">+</i>
        <div><small>shape</small><strong>vault</strong><span>human notes · _Agent · _Wiki</span></div>
      </div>
      <div class="memory-diagram__loop" aria-label="load, work, capture, distill, maintain">
        <span>load</span><b>→</b><span>work</span><b>→</b><span>capture</span><b>→</b><span>distill</span><b>→</b><span>maintain</span><b>↺</b>
      </div>
      <figcaption>One memory loop, not a bag of unrelated tools.</figcaption>
    </figure>`
  }

  if (variant === 'shared') {
    return `<figure class="memory-diagram memory-diagram--shared" aria-label="Two team members contribute to shared project memory which a teammate's agent can query">
      <div class="memory-diagram__contributors">
        <span><b>member A</b><small>sessions + decisions</small></span>
        <span><b>member B</b><small>sessions + decisions</small></span>
      </div>
      <b class="memory-diagram__flow" aria-hidden="true">→</b>
      <div class="memory-diagram__core"><strong>shared project<br>memory</strong><span>history · rationale · open loops</span></div>
      <b class="memory-diagram__flow" aria-hidden="true">→</b>
      <div class="memory-diagram__consumer"><small>ask + recover</small><strong>a teammate’s<br>agent</strong></div>
      <figcaption>Memory belongs to the project, not to one chat.</figcaption>
    </figure>`
  }

  return `<figure class="memory-diagram memory-diagram--retrieval" aria-label="Comparison between raw file access and project memory retrieval">
    <div class="memory-diagram__column">
      <small>raw / file access</small>
      <strong>open files</strong>
      <span>know what to open</span><span>read too much</span><span>miss the reason why</span>
    </div>
    <b class="memory-diagram__flow" aria-hidden="true">→</b>
    <div class="memory-diagram__column memory-diagram__column--active">
      <small>memory / retrieval</small>
      <strong>recover context</strong>
      <span>search meaning</span><span>inspect summaries</span><span>follow the project graph</span>
    </div>
    <figcaption>Less context noise. More continuity.</figcaption>
  </figure>`
}

const codeBlockConverters = ({ defaultConverters }: { defaultConverters: Record<string, unknown> }) => ({
  ...defaultConverters,
  blocks: {
    Code: ({ node }: { node: { fields?: { code?: string; language?: string } } }) => {
      const code = escapeHTML(node.fields?.code || '')
      const language = escapeHTML(node.fields?.language || 'plaintext')
      return `<pre><code class="language-${language}">${code}</code></pre>`
    },
    MemoryDiagram: ({ node }: { node: { fields?: { variant?: string } } }) =>
      memoryDiagramHTML(node.fields?.variant),
  },
})

const normalizeLexicalUploadValues = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeLexicalUploadValues)
  if (!value || typeof value !== 'object') return value

  const node = value as Record<string, unknown>
  const normalized: Record<string, unknown> = { ...node }

  if (
    normalized.type === 'upload' &&
    normalized.value &&
    typeof normalized.value === 'object' &&
    'id' in normalized.value
  ) {
    normalized.value = (normalized.value as { id: number | string }).id
  }

  for (const [key, child] of Object.entries(normalized)) {
    if (key !== 'value' || normalized.type !== 'upload') {
      normalized[key] = normalizeLexicalUploadValues(child)
    }
  }

  return normalized
}

type MessageRole = 'user' | 'assistant'
type MessageKind = 'message' | 'tool' | 'note'

const normalizeMessages = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return []

  return value.map((rawMessage) => {
    const message = (rawMessage || {}) as Record<string, unknown>
    const legacyRole = message.role
    const role: MessageRole = legacyRole === 'user' ? 'user' : 'assistant'
    const requestedKind = message.kind
    const kind: MessageKind =
      role === 'user'
        ? 'message'
        : legacyRole === 'tool' || legacyRole === 'terminal' || requestedKind === 'tool'
          ? 'tool'
          : legacyRole === 'note' || requestedKind === 'note'
            ? 'note'
            : 'message'

    return {
      ...message,
      role,
      kind,
      label: role === 'user' ? 'Paul' : 'Agent',
    }
  })
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Publication',
    plural: 'Publications',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', '_status', 'publishedAt'],
    description: 'Articles classiques et sessions partagent la même chronologie.',
    group: 'Contenu',
    preview: (doc) => {
      if (!doc.id) return null
      const frontend = process.env.FRONTEND_URL || 'http://localhost:4321'
      const secret = encodeURIComponent(process.env.PREVIEW_SECRET || '')
      return `${frontend}/preview/${doc.id}?secret=${secret}`
    },
    livePreview: {
      openByDefault: true,
      url: ({ data }) => {
        if (!data.id) return null
        const frontend = process.env.FRONTEND_URL || 'http://localhost:4321'
        const secret = encodeURIComponent(process.env.PREVIEW_SECRET || '')
        return `${frontend}/preview/${data.id}?secret=${secret}`
      },
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 390, height: 844 },
        { name: 'desktop', label: 'Bureau', width: 1440, height: 900 },
      ],
    },
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (canPreview(req)) return true
      return { _status: { equals: 'published' } }
    },
    update: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (doc.body) doc.body = normalizeLexicalUploadValues(doc.body)
        if (Array.isArray(doc.messages)) {
          doc.messages = normalizeMessages(doc.messages).map((message: Record<string, unknown>) => ({
              ...message,
              content: normalizeLexicalUploadValues(message.content),
            }))
        }
        return doc
      },
    ],
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        if (data.title && !data.slug) data.slug = slugify(data.title)
        if (!data.slug && originalDoc?.slug) data.slug = originalDoc.slug
        if (data.messages) data.messages = normalizeMessages(data.messages)
        data.readingTime = calculateReadingTime({
          body: data.body ?? originalDoc?.body,
          messages: data.messages ?? originalDoc?.messages,
          widgets: data.widgets ?? originalDoc?.widgets,
        })
        return data
      },
    ],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 900,
      },
    },
    maxPerDoc: 40,
  },
  fields: [
    {
      name: 'type',
      label: 'Format',
      type: 'select',
      required: true,
      defaultValue: 'article',
      options: [
        { label: 'Article classique', value: 'article' },
        { label: 'Session', value: 'session' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'title',
      label: 'Titre',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Adresse',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Générée automatiquement depuis le titre si elle est vide.',
        position: 'sidebar',
      },
    },
    {
      name: 'summary',
      label: 'Résumé en une ligne',
      type: 'textarea',
      required: true,
      maxLength: 220,
      admin: {
        description: 'Affiché dans la liste des sessions sur la page d’accueil.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'publishedAt',
          label: 'Date de publication',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            width: '50%',
          },
        },
        {
          name: 'readingTime',
          label: 'Temps de lecture',
          type: 'number',
          min: 1,
          defaultValue: 5,
          required: true,
          admin: {
            description: 'Calculé automatiquement depuis le contenu et le code.',
            readOnly: true,
            width: '50%',
          },
        },
      ],
    },
    {
      name: 'body',
      label: 'Article',
      type: 'richText',
      admin: {
        condition: (_, siblingData) => siblingData.type === 'article',
        description: 'Le corps éditorial de l’article classique.',
      },
    },
    lexicalHTMLField({
      converters: codeBlockConverters,
      lexicalFieldName: 'body',
      htmlFieldName: 'bodyHTML',
    }),
    contentWidgets('widgets', 'Modules de l’article', (_, siblingData) => siblingData.type === 'article'),
    {
      name: 'messages',
      label: 'Messages de la session',
      type: 'array',
      minRows: 1,
      admin: {
        condition: (_, siblingData) => siblingData.type === 'session',
        description: 'Ajoute, déplace et replie les tours de la conversation.',
        initCollapsed: true,
        components: {
          RowLabel: '/components/MessageRowLabel#MessageRowLabel',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'role',
              label: 'Rôle',
              type: 'select',
              required: true,
              defaultValue: 'assistant',
              options: [
                { label: 'Paul', value: 'user' },
                { label: 'Agent', value: 'assistant' },
              ],
              admin: { width: '50%' },
            },
            {
              name: 'kind',
              label: 'Forme',
              type: 'select',
              required: true,
              defaultValue: 'message',
              options: [
                { label: 'Message', value: 'message' },
                { label: 'Tool call', value: 'tool' },
                { label: 'Note / décision', value: 'note' },
              ],
              admin: {
                condition: (_, siblingData) => siblingData.role === 'assistant',
                width: '50%',
              },
            },
            {
              name: 'label',
              label: 'Libellé',
              type: 'text',
              required: true,
              defaultValue: 'Agent',
              admin: { hidden: true },
            },
          ],
        },
        {
          name: 'content',
          label: 'Contenu',
          type: 'richText',
          admin: {
            condition: (_, siblingData) => siblingData.kind !== 'tool',
          },
        },
        lexicalHTMLField({
          lexicalFieldName: 'content',
          htmlFieldName: 'contentHTML',
        }),
        {
          name: 'code',
          label: 'Commande ou sortie',
          type: 'code',
          admin: {
            condition: (_, siblingData) => siblingData.kind === 'tool',
            language: 'shell',
            description: 'Optionnel. Utilisé surtout pour les Tool calls.',
          },
        },
        contentWidgets('widgets', 'Modules du message'),
      ],
    },
  ],
}
