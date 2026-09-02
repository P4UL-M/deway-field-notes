import type { Block } from 'payload'

export const InlineMetrics: Block = {
  slug: 'InlineMetrics',
  labels: {
    singular: 'Chiffres clés',
    plural: 'Chiffres clés',
  },
  fields: [
    {
      name: 'metrics',
      label: 'Chiffres',
      type: 'array',
      minRows: 1,
      maxRows: 4,
      fields: [
        { name: 'value', label: 'Valeur', type: 'text', required: true },
        { name: 'label', label: 'Libellé', type: 'text', required: true },
      ],
    },
  ],
}

export const InlineCallout: Block = {
  slug: 'InlineCallout',
  labels: {
    singular: 'Note intégrée',
    plural: 'Notes intégrées',
  },
  fields: [
    {
      name: 'tone',
      label: 'Tonalité',
      type: 'select',
      required: true,
      defaultValue: 'note',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Décision', value: 'decision' },
        { label: 'Attention', value: 'warning' },
        { label: 'Succès', value: 'success' },
      ],
    },
    { name: 'eyebrow', label: 'Sur-titre', type: 'text' },
    { name: 'title', label: 'Titre', type: 'text' },
    { name: 'text', label: 'Texte', type: 'textarea' },
  ],
}

export const InlineSteps: Block = {
  slug: 'InlineSteps',
  labels: {
    singular: 'Étapes intégrées',
    plural: 'Étapes intégrées',
  },
  fields: [
    { name: 'title', label: 'Titre', type: 'text' },
    {
      name: 'steps',
      label: 'Étapes',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'title', label: 'Étape', type: 'text', required: true },
        { name: 'text', label: 'Explication', type: 'textarea' },
      ],
    },
  ],
}

export const InlineResource: Block = {
  slug: 'InlineResource',
  labels: {
    singular: 'Ressource intégrée',
    plural: 'Ressources intégrées',
  },
  fields: [
    { name: 'eyebrow', label: 'Sur-titre', type: 'text' },
    { name: 'title', label: 'Titre', type: 'text' },
    { name: 'text', label: 'Texte', type: 'textarea' },
    { name: 'url', label: 'URL', type: 'text', required: true },
    { name: 'linkLabel', label: 'Texte du lien', type: 'text', defaultValue: 'ouvrir la ressource' },
  ],
}
