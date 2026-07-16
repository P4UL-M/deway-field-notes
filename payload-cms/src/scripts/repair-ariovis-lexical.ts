import 'dotenv/config'

import { randomBytes } from 'node:crypto'
import { getPayload } from 'payload'

import config from '../payload.config'

type SerializedNode = {
  children?: SerializedNode[]
  type?: string
  [key: string]: unknown
}

const slug = 'connecter-une-application-python-flask-avec-openid-connect-et-keycloak'
const payload = await getPayload({ config })
const result = await payload.find({
  collection: 'posts',
  draft: true,
  limit: 1,
  overrideAccess: true,
  where: { slug: { equals: slug } },
})

const post = result.docs[0]
if (!post) throw new Error(`Brouillon introuvable : ${slug}`)

let repaired = 0
let nativeCodeBlocks = 0
const repairNode = (node: SerializedNode): SerializedNode => {
  if (node.type === 'code') {
    repaired += 1
    const code = (node.children || [])
      .map((child) => (typeof child.text === 'string' ? child.text : ''))
      .join('')

    return {
      fields: {
        blockName: '',
        blockType: 'Code',
        code,
        id: randomBytes(12).toString('hex'),
        language: typeof node.language === 'string' ? node.language : 'shell',
      },
      format: typeof node.format === 'string' ? node.format : '',
      type: 'block',
      version: 2,
    }
  }

  if (node.type === 'block' && (node.fields as { blockType?: string } | undefined)?.blockType === 'Code') {
    nativeCodeBlocks += 1
  }

  if (!node.children) return node
  return { ...node, children: node.children.map(repairNode) }
}

const body = post.body as { root?: SerializedNode } | null | undefined
if (!body?.root) throw new Error('Corps Lexical introuvable dans le brouillon.')

const repairedBody = { ...body, root: repairNode(body.root) }
if (repaired === 0 && nativeCodeBlocks === 0) {
  payload.logger.info('Aucun nœud Lexical à réparer.')
  process.exit(0)
}

await payload.update({
  collection: 'posts',
  id: post.id,
  data: { body: repairedBody },
  draft: true,
  overrideAccess: true,
})

payload.logger.info(
  repaired > 0
    ? `${repaired} bloc de code converti en bloc Payload éditable.`
    : `${nativeCodeBlocks} bloc Payload existant validé et HTML régénéré.`,
)
process.exit(0)
