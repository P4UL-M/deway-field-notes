import { postgresAdapter } from '@payloadcms/db-postgres'
import { BlocksFeature, CodeBlock, lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import { fr } from '@payloadcms/translations/languages/fr'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { MemoryDiagram } from './blocks/MemoryDiagram'
import { InlineCallout, InlineMetrics, InlineResource, InlineSteps } from './blocks/InlineWidgets'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const databaseURL = process.env.DATABASE_URL || ''

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — Deway Field Notes',
    },
    livePreview: {
      collections: ['posts'],
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 390, height: 844 },
        { name: 'desktop', label: 'Bureau', width: 1440, height: 900 },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Posts, Media, Users],
  cors: [process.env.FRONTEND_URL || 'http://localhost:4321'],
  csrf: [process.env.FRONTEND_URL || 'http://localhost:4321'],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((feature) => feature.key !== 'upload'),
      UploadFeature({ maxDepth: 0 }),
      BlocksFeature({
        blocks: [
          CodeBlock({ defaultLanguage: 'shell' }),
          MemoryDiagram,
          InlineMetrics,
          InlineCallout,
          InlineSteps,
          InlineResource,
        ],
      }),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    push: true,
    pool: { connectionString: databaseURL },
  }),
  i18n: {
    fallbackLanguage: 'fr',
    supportedLanguages: { fr },
  },
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  sharp,
  plugins: [],
})
