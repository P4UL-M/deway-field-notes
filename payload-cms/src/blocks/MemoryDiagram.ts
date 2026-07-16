import type { Block } from 'payload'

export const MemoryDiagram: Block = {
  slug: 'MemoryDiagram',
  labels: {
    singular: 'Schéma mémoire',
    plural: 'Schémas mémoire',
  },
  fields: [
    {
      name: 'variant',
      label: 'Schéma',
      type: 'select',
      required: true,
      defaultValue: 'retrieval',
      options: [
        { label: 'Accès fichier → retrieval', value: 'retrieval' },
        { label: 'MCP + skills + architecture', value: 'system' },
        { label: 'Mémoire projet partagée', value: 'shared' },
      ],
    },
  ],
}
