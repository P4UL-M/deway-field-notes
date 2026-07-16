type MessageLike = {
  content?: unknown
  code?: string | null
  widgets?: unknown
}

const lexicalText = (value: unknown): string => {
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) return value.map(lexicalText).join(' ')

  const record = value as Record<string, unknown>
  const ownText = typeof record.text === 'string' ? record.text : ''
  const childrenText = lexicalText(record.children)
  const rootText = lexicalText(record.root)
  return `${ownText} ${childrenText} ${rootText}`
}

const widgetText = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(widgetText).join(' ')
  if (typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  return ['caption', 'eyebrow', 'title', 'text', 'label', 'value', 'metrics', 'steps']
    .map((key) => widgetText(record[key]))
    .join(' ')
}

const wordCount = (value: string) => value.trim().split(/\s+/u).filter(Boolean).length

export const calculateReadingTime = ({
  body,
  messages = [],
  widgets,
}: {
  body?: unknown
  messages?: MessageLike[] | null
  widgets?: unknown
}) => {
  const safeMessages = messages || []
  const prose = [
    lexicalText(body),
    widgetText(widgets),
    ...safeMessages.map((message) => `${lexicalText(message.content)} ${widgetText(message.widgets)}`),
  ].join(' ')

  const codeLines = safeMessages.reduce((total, message) => {
    if (!message.code) return total
    return total + message.code.split('\n').filter((line) => line.trim()).length
  }, 0)

  // 220 mots/minute pour la prose, environ 12 lignes/minute pour le code.
  return Math.max(1, Math.ceil(wordCount(prose) / 220 + codeLines / 12))
}
