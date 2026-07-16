'use client'

import { useRowLabel } from '@payloadcms/ui'

const roleNames: Record<string, string> = {
  user: 'Paul',
  assistant: 'Agent',
}

export const MessageRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ kind?: string; label?: string; role?: string }>()
  const fallback = data?.role ? roleNames[data.role] : undefined
  const kind = data?.role === 'assistant' && data?.kind !== 'message' ? ` · ${data?.kind === 'tool' ? 'Tool call' : 'Note'}` : ''
  return <span>{`${rowNumber !== undefined ? `${rowNumber + 1}. ` : ''}${fallback || data?.label || 'Message'}${kind}`}</span>
}
