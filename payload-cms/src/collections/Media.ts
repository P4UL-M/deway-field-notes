import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Média',
    plural: 'Médias',
  },
  admin: {
    group: 'Contenu',
    useAsTitle: 'alt',
    description: 'Images, vidéos et PDF. Pour proposer un PDF au téléchargement, copiez son URL dans un bloc Ressource.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif ou titre du document',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    staticDir: process.env.MEDIA_DIR || 'media',
    mimeTypes: ['image/*', 'video/*', 'application/pdf'],
  },
}
