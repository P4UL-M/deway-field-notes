import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

const payload = await getPayload({ config })
const sessions = await payload.find({
  collection: 'posts',
  draft: true,
  limit: 100,
  overrideAccess: true,
  where: { type: { equals: 'session' } },
})

for (const session of sessions.docs) {
  const messages = (session.messages || []).map((message) => {
    const legacyRole = message.role as string
    const role: 'user' | 'assistant' = legacyRole === 'user' ? 'user' : 'assistant'
    const kind: 'message' | 'tool' | 'note' = role === 'user'
      ? 'message'
      : message.kind === 'tool' || legacyRole === 'tool' || legacyRole === 'terminal'
        ? 'tool'
        : message.kind === 'note' || legacyRole === 'note'
          ? 'note'
          : 'message'
    return { ...message, role, kind, label: role === 'user' ? 'Paul' : 'Agent' }
  })

  await payload.update({
    collection: 'posts',
    id: session.id,
    data: { messages },
    draft: true,
    overrideAccess: true,
  })

  payload.logger.info(`Rôles simplifiés : ${session.id} — ${session.title}`)
}

process.exit(0)
