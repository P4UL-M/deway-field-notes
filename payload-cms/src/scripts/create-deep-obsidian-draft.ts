import 'dotenv/config'

import { randomBytes } from 'node:crypto'
import { getPayload } from 'payload'

import config from '../payload.config'

type LexicalNode = {
  type: string
  version: number
  [key: string]: unknown
}

const slug = 'deep-obsidian-mcp-local-memory-for-coding-agents'

const text = (value: string, format = 0): LexicalNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
})

const block = (type: string, children: LexicalNode[], extra: Record<string, unknown> = {}): LexicalNode => ({
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  type,
  version: 1,
  ...extra,
})

const paragraph = (...children: LexicalNode[]) => block('paragraph', children)
const heading = (value: string) => block('heading', [text(value)], { tag: 'h2' })

const list = (items: Array<string | LexicalNode[]>) =>
  block(
    'list',
    items.map((item, index) =>
      block('listitem', typeof item === 'string' ? [text(item)] : item, { value: index + 1 }),
    ),
    { listType: 'bullet', start: 1, tag: 'ul' },
  )

const code = (value: string, language = 'shell'): LexicalNode => ({
  fields: {
    blockName: '',
    blockType: 'Code',
    code: value,
    id: randomBytes(12).toString('hex'),
    language,
  },
  format: '',
  type: 'block',
  version: 2,
})

const diagram = (variant: 'retrieval' | 'system' | 'shared'): LexicalNode => ({
  fields: {
    blockName: '',
    blockType: 'MemoryDiagram',
    id: randomBytes(12).toString('hex'),
    variant,
  },
  format: '',
  type: 'block',
  version: 2,
})

const link = (label: string, url: string): LexicalNode => ({
  children: [text(label)],
  direction: 'ltr',
  fields: {
    linkType: 'custom',
    newTab: true,
    url,
  },
  format: '',
  indent: 0,
  type: 'link',
  version: 3,
})

const payload = await getPayload({ config })

const body = {
  root: {
    children: [
      paragraph(
        text(
          'During two Lab Weeks, I explored a recurring problem with coding agents: they are powerful in the moment, but a fresh session rarely remembers the work that happened before.',
        ),
      ),
      paragraph(
        text(
          'I already kept much of that context in Obsidian — daily notes, RFCs, decisions, presentations, and work logs. The first idea was simple: let an agent retrieve the relevant parts instead of replaying the whole project story by hand.',
        ),
      ),
      paragraph(
        text(
          'What changed the project was not merely giving the agent access to my journal. The agents started leaving useful memory behind too.',
        ),
      ),

      heading('The shift: agents started journaling too'),
      paragraph(
        text(
          'After a work session, an agent can capture what happened: the task, the decisions, the files involved, the checks that passed, and the open loops. That trace lives separately from my own notes.',
        ),
      ),
      paragraph(
        text(
          'Not every trace should become permanent documentation. Stable parts can be distilled later into decisions, concepts, project syntheses, or open questions. Obsidian stops being passive storage and becomes a memory the agent helps maintain.',
        ),
      ),

      heading('Obsidian became the shared workbench'),
      paragraph(
        text(
          'I now draft RFCs, implementation plans, diagrams, and exploratory notes with agents directly in Obsidian. The repository stays focused on code and durable project artifacts; the thinking and iteration live where the rest of the project context already exists.',
        ),
      ),
      paragraph(
        text(
          'That context is independent from a particular chat. I can start with Claude, continue with Codex, and return in a future session without treating the previous conversation as the only source of truth.',
        ),
      ),

      heading('Retrieval, not file access'),
      paragraph(
        text(
          'Agents already know how to read files. But reading files is not the same as querying project memory. With raw access, the agent must know what to open, can read too much, and can still miss the reason behind a decision.',
        ),
      ),
      paragraph(
        text(
          'Deep Obsidian MCP lets the agent search lexically or semantically, inspect summaries and deterministic chunks, follow links and backlinks, and only then read the notes that matter. The goal is not more context. It is better retrieval.',
        ),
      ),
      diagram('retrieval'),
      heading('MCP alone is not enough'),
      paragraph(
        text(
          'A tool does not create a workflow by itself. An agent can still search too broadly, write in the wrong place, forget to capture its session, or slowly fill the vault with noise.',
        ),
      ),
      paragraph(text('What worked is a three-part system:')),
      list([
        [text('MCP access: ', 2), text('bounded reads and writes, hybrid search, graph traversal, and session capture.')],
        [text('Agent skills: ', 2), text('load context first, judge retrieval quality, work, capture, distill, and maintain.')],
        [text('Vault architecture: ', 2), text('human notes stay human-owned, agent traces stay separate, and durable knowledge has an explicit home.')],
      ]),
      diagram('system'),
      heading('A local-first architecture with boundaries'),
      paragraph(
        text(
          'Deep Obsidian MCP is a Rust service that runs locally and indexes an Obsidian vault. Human-owned spaces remain untouched by default. Agent work traces live in:',
        ),
      ),
      code('_Agent/Sessions/', 'text'),
      paragraph(text('Durable agent-maintained knowledge lives in:')),
      code('_Wiki/', 'text'),
      paragraph(
        text(
          'The server provides bounded reads, deterministic chunks, BM25, semantic and hybrid search, related-note discovery, graph traversal, backlinks, controlled update helpers, session capture, and project-context loading.',
        ),
      ),
      paragraph(
        text(
          'Semantic retrieval can use any OpenAI-compatible embeddings endpoint with sqlite-vec. When embeddings are not configured, the server keeps a sparse local fallback. A private local provider such as Ollama also works.',
        ),
      ),

      heading('The loop matters more than any single tool'),
      paragraph(text('The current workflow is deliberately small:')),
      code('load → work → capture → distill → maintain', 'text'),
      paragraph(
        text(
          'Before work, the agent recovers previous sessions, human notes, project syntheses, decisions, and open questions. After work, it captures a structured trace. Later, stable knowledge is promoted and stale material can be maintained instead of accumulating forever.',
        ),
      ),
      paragraph(
        text(
          'The architecture is inspired by the LLM-wiki pattern: memory remains useful because retrieval, capture, distillation, and maintenance form one loop rather than four unrelated tools.',
        ),
      ),

      heading('What changed day to day'),
      list([
        'less time spent replaying project context at the start of a session',
        'plans and drafts live in the right place instead of temporary repository files',
        'past decisions and validation results become recoverable history',
        'an agent can challenge a direction that the project already rejected and explain why',
      ]),
      paragraph(
        text(
          'That last point is the interesting one. Memory changes the relationship: the agent is no longer reacting to an isolated prompt, but working inside a continuity.',
        ),
      ),

      heading('Current state'),
      paragraph(
        text(
          'Deep Obsidian MCP is still alpha, but it is already running against my real vault with embedding search active. The notes, sessions, and presentation behind this article were created in the same system the article describes.',
        ),
      ),
      paragraph(
        text(
          'The next technical work is larger-vault testing, automatic maintenance, and clearer governance for trusted shared context.',
        ),
      ),

      heading('Toward shared project memory'),
      paragraph(
        text(
          'The long-term direction is larger than personal memory. A project’s rationale should not live only in one person’s head, a chat thread, or an old pull request. Team members should be able to contribute governed sessions and durable notes, then let their own agents recover the real history behind the code.',
        ),
      ),
      diagram('shared'),
      heading('Try it'),
      paragraph(text('The practical setup remains intentionally short:')),
      code(
        'brew install P4UL-M/tap/deep-obsidian-mcp\n\ndeep-obsidian-mcp setup-service --vault ~/Vault --mcp --skills',
      ),
      paragraph(
        text(
          'The setup command installs the local service, configures supported MCP clients, and adds the packaged skills. Use --wizard for an interactive setup, --vault-snippets to hide the agent folders in Obsidian, and a local embeddings provider when the vault must stay entirely private.',
        ),
      ),
      paragraph(link('View Deep Obsidian MCP on GitHub', 'https://github.com/P4UL-M/deep-obsidian-mcp')),
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const existingPost = await payload.find({
  collection: 'posts',
  draft: true,
  limit: 1,
  overrideAccess: true,
  where: { slug: { equals: slug } },
})

const data = {
  _status: 'draft' as const,
  type: 'article' as const,
  title: 'What I learned giving my coding agents a memory',
  slug,
  summary:
    'Deep Obsidian MCP turns a local vault into structured project memory that agents can retrieve, extend, and maintain across sessions.',
  publishedAt: '2026-07-16T08:00:00.000Z',
  body,
  widgets: [
    {
      widgetType: 'resource' as const,
      eyebrow: 'Source code',
      title: 'Deep Obsidian MCP',
      text: 'A Rust-based, local-first memory layer for Obsidian and coding agents.',
      url: 'https://github.com/P4UL-M/deep-obsidian-mcp',
      linkLabel: 'open the repository',
    },
  ],
}

const post = existingPost.totalDocs
  ? await payload.update({
      collection: 'posts',
      id: existingPost.docs[0]!.id,
      data,
      draft: true,
      overrideAccess: true,
    })
  : await payload.create({
      collection: 'posts',
      data,
      draft: true,
      overrideAccess: true,
    })

payload.logger.info(`Brouillon Deep Obsidian MCP prêt : ${post.id} — ${post.title}`)
process.exit(0)
