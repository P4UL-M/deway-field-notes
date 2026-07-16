import 'dotenv/config'

import { randomBytes } from 'node:crypto'
import { JSDOM } from 'jsdom'
import { getPayload } from 'payload'

import config from '../payload.config'

type LexicalNode = {
  type: string
  version: number
  [key: string]: unknown
}

type LegacyImage = { alt: string; kind: 'legacy-image'; source: string }
type InlineToken = LexicalNode | LegacyImage
type BlockToken = LexicalNode | LegacyImage

const isLegacyImage = (token: InlineToken | BlockToken): token is LegacyImage =>
  'kind' in token && token.kind === 'legacy-image'

const DEFAULT_SOURCE =
  'https://blog.ariovis.fr/blog/articles-2/comment-connecter-une-application-python-flask-avec-openid-connect-et-keycloak-17'

const sourceURL = process.argv[2] || DEFAULT_SOURCE
const slug = 'connecter-une-application-python-flask-avec-openid-connect-et-keycloak'

const headingLevelTwo = new Set([
  'Pré-requis',
  'Comprendre ce qu’est OpenID Connect',
  "Qu'est ce que Keycloak ?",
  'Configurez Keycloak',
  'Passage à Python',
  'Implémenter OIDC avec Flask',
  'Pour aller plus loin',
])

const normalize = (value = '') => value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

const textNode = (value: string, format = 0): LexicalNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
})

const blockBase = (type: string, children: LexicalNode[]): LexicalNode => ({
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  type,
  version: 1,
})

const trimInline = (nodes: InlineToken[]) => {
  const first = nodes.find((node): node is LexicalNode => !isLegacyImage(node) && node.type === 'text')
  const last = [...nodes]
    .reverse()
    .find((node): node is LexicalNode => !isLegacyImage(node) && node.type === 'text')
  if (first && typeof first.text === 'string') first.text = first.text.replace(/^\s+/, '')
  if (last && typeof last.text === 'string') last.text = last.text.replace(/\s+$/, '')
  return nodes.filter((node) => isLegacyImage(node) || node.type !== 'text' || node.text !== '')
}

function inlineTokens(node: Node, format = 0): InlineToken[] {
  if (node.nodeType === node.TEXT_NODE) {
    const value = (node.nodeValue || '').replace(/\s+/g, ' ')
    return value ? [textNode(value, format)] : []
  }

  if (!(node instanceof node.ownerDocument!.defaultView!.HTMLElement)) return []

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  if (tag === 'img') {
    const source = element.getAttribute('src')
    return source
      ? [{ alt: normalize(element.getAttribute('alt') || ''), kind: 'legacy-image', source }]
      : []
  }
  if (tag === 'br') return [{ type: 'linebreak', version: 1 }]

  const nextFormat =
    tag === 'strong' || tag === 'b'
      ? format | 1
      : tag === 'em' || tag === 'i'
        ? format | 2
        : tag === 's' || tag === 'strike'
          ? format | 4
          : tag === 'u'
            ? format | 8
            : tag === 'code'
              ? format | 16
              : format

  const children = [...element.childNodes].flatMap((child) => inlineTokens(child, nextFormat))
  if (tag !== 'a') return children

  const href = element.getAttribute('href')
  if (!href) return children
  const linkChildren = children.filter((child): child is LexicalNode => !isLegacyImage(child))
  const images = children.filter(isLegacyImage)
  return [
    {
      children: linkChildren,
      direction: 'ltr',
      fields: {
        linkType: 'custom',
        newTab: element.getAttribute('target') === '_blank' || element.getAttribute('target') === '_new',
        url: new URL(href, sourceURL).toString(),
      },
      format: '',
      indent: 0,
      type: 'link',
      version: 3,
    },
    ...images,
  ]
}

function paragraphParts(element: Element, context: string): BlockToken[] {
  const tokens = trimInline([...element.childNodes].flatMap((child) => inlineTokens(child)))
  const result: BlockToken[] = []
  let inline: LexicalNode[] = []

  const flush = () => {
    if (!inline.length) return
    result.push(blockBase('paragraph', inline))
    inline = []
  }

  for (const token of tokens) {
    if (isLegacyImage(token)) {
      flush()
      result.push({
        ...token,
        alt: token.alt || `Illustration — ${context}`,
      })
    } else {
      inline.push(token)
    }
  }
  flush()
  return result
}

function listNode(element: Element, context: string): BlockToken[] {
  const listType = element.tagName.toLowerCase() === 'ol' ? 'number' : 'bullet'
  const children: LexicalNode[] = []
  const trailingImages: BlockToken[] = []
  let value = 1

  for (const item of [...element.children].filter((child) => child.tagName.toLowerCase() === 'li')) {
    const tokens = trimInline([...item.childNodes].flatMap((child) => inlineTokens(child)))
    const inline = tokens.filter((token): token is LexicalNode => !isLegacyImage(token))
    trailingImages.push(
      ...tokens
        .filter(isLegacyImage)
        .map((token) => ({ ...token, alt: token.alt || `Illustration — ${context}` })),
    )
    children.push({
      ...blockBase('listitem', inline),
      value,
    })
    value += 1
  }

  return [
    {
      ...blockBase('list', children),
      listType,
      start: 1,
      tag: listType === 'number' ? 'ol' : 'ul',
    },
    ...trailingImages,
  ]
}

function collectContent(root: Element, coverSource: string | null) {
  const blocks: BlockToken[] = []
  let context = 'OpenID Connect et Keycloak'

  if (coverSource) {
    blocks.push({
      alt: 'Couverture — connecter Flask à OpenID Connect avec Keycloak',
      source: coverSource,
      kind: 'legacy-image',
    })
  }

  const visit = (element: Element) => {
    const tag = element.tagName.toLowerCase()
    const label = normalize(element.textContent || '')
    const isPseudoHeading = tag === 'p' && Boolean(element.querySelector('.h3-fs'))

    if (isPseudoHeading || /^h[1-6]$/.test(tag)) {
      if (!label) return
      context = label
      blocks.push({
        ...blockBase('heading', trimInline([...element.childNodes].flatMap((child) => inlineTokens(child))).filter(
          (token): token is LexicalNode => !isLegacyImage(token),
        )),
        tag: headingLevelTwo.has(label) ? 'h2' : 'h3',
      })
      return
    }

    if (tag === 'p') {
      if (!label && !element.querySelector('img')) return
      if (/^(app\/|config\.py|\.env$)/i.test(label) && label.length < 80) context = label
      blocks.push(...paragraphParts(element, context))
      return
    }

    if (tag === 'ul' || tag === 'ol') {
      blocks.push(...listNode(element, context))
      return
    }

    if (tag === 'pre') {
      blocks.push({
        fields: {
          blockName: '',
          blockType: 'Code',
          code: element.textContent || '',
          id: randomBytes(12).toString('hex'),
          language: 'shell',
        },
        format: '',
        type: 'block',
        version: 2,
      })
      return
    }

    if (tag === 'img') {
      const source = element.getAttribute('src')
      if (source) {
        blocks.push({
          alt: normalize(element.getAttribute('alt') || '') || `Illustration — ${context}`,
          source,
          kind: 'legacy-image',
        })
      }
      return
    }

    for (const child of [...element.children]) visit(child)
  }

  for (const child of [...root.children]) visit(child)
  return blocks
}

function mimeExtension(mime: string) {
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('jpeg')) return 'jpg'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('svg')) return 'svg'
  return 'png'
}

const response = await fetch(sourceURL, {
  headers: {
    'accept-language': 'fr-FR,fr;q=0.9',
    cookie: 'frontend_lang=fr_FR',
  },
})
if (!response.ok) throw new Error(`Impossible de télécharger l’article (${response.status}).`)

const html = await response.text()
const document = new JSDOM(html).window.document
const sourceBody = document.querySelector('.o_wblog_post_content_field')
if (!sourceBody) throw new Error('Corps éditorial Ariovis introuvable.')

const title = normalize(document.querySelector('.o_wblog_post_name')?.textContent || '')
if (!title) throw new Error('Titre Ariovis introuvable.')

const coverStyle = document.querySelector('.o_wblog_post_page_cover .o_record_cover_image')?.getAttribute('style') || ''
const coverPath = coverStyle.match(/url\((['"]?)(.*?)\1\)/)?.[2] || null
const blocks = collectContent(sourceBody, coverPath)
const imageTokens = blocks.filter(isLegacyImage)

if (process.env.DRY_RUN === '1') {
  const headings = blocks
    .filter((block): block is LexicalNode => !isLegacyImage(block) && block.type === 'heading')
    .map((block) =>
      (block.children as LexicalNode[])
        .map((child) => (typeof child.text === 'string' ? child.text : ''))
        .join(''),
    )
  console.log(
    JSON.stringify(
      {
        blocks: blocks.length,
        headings,
        media: imageTokens.length,
        uniqueMedia: new Set(imageTokens.map((image) => new URL(image.source, sourceURL).toString())).size,
        title,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const payload = await getPayload({ config })
const existing = await payload.find({
  collection: 'posts',
  draft: true,
  limit: 1,
  overrideAccess: true,
  where: { slug: { equals: slug } },
})

if (existing.totalDocs > 0) {
  payload.logger.info(`Import ignoré : le brouillon « ${slug} » existe déjà.`)
  process.exit(0)
}

const uploaded = new Map<string, { alt: string; id: number | string }>()
const createdMediaIds: Array<number | string> = []

try {
  let index = 1
  for (const image of imageTokens) {
    const absoluteURL = new URL(image.source, sourceURL).toString()
    if (uploaded.has(absoluteURL)) continue

    const imageResponse = await fetch(absoluteURL)
    if (!imageResponse.ok) throw new Error(`Média inaccessible (${imageResponse.status}) : ${absoluteURL}`)
    const data = Buffer.from(await imageResponse.arrayBuffer())
    const mimetype = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/png'
    const name = `keycloak-openid-${String(index).padStart(2, '0')}.${mimeExtension(mimetype)}`
    const media = await payload.create({
      collection: 'media',
      data: { alt: image.alt },
      file: { data, mimetype, name, size: data.length },
      overrideAccess: true,
    })
    uploaded.set(absoluteURL, { alt: image.alt, id: media.id })
    createdMediaIds.push(media.id)
    payload.logger.info(`Média ${index}/${imageTokens.length} copié : ${name}`)
    index += 1
  }

  const lexicalChildren = blocks.map((block): LexicalNode => {
    if (!isLegacyImage(block)) return block
    const media = uploaded.get(new URL(block.source, sourceURL).toString())
    if (!media) throw new Error(`Média non importé : ${block.source}`)
    return {
      fields: { alt: media.alt },
      format: '',
      id: randomBytes(12).toString('hex'),
      relationTo: 'media',
      type: 'upload',
      value: media.id,
      version: 3,
    }
  })

  const post = await payload.create({
    collection: 'posts',
    data: {
      _status: 'draft',
      body: {
        root: {
          children: lexicalChildren,
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      },
      publishedAt: '2025-06-12T08:00:00.000Z',
      slug,
      summary: 'Configurer Keycloak comme fournisseur OpenID Connect et sécuriser une application Flask avec un flux complet de connexion et de déconnexion.',
      title,
      type: 'article',
    },
    draft: true,
    overrideAccess: true,
  })

  payload.logger.info(`Brouillon créé : ${post.id} — ${title}`)
  payload.logger.info(`${uploaded.size} médias copiés dans Payload.`)
} catch (error) {
  for (const id of createdMediaIds.reverse()) {
    try {
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    } catch {
      // Best effort rollback: the original error remains the useful one.
    }
  }
  throw error
}

process.exit(0)
