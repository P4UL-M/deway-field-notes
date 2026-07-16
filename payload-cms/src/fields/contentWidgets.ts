import type { Condition, Field } from 'payload'

export const contentWidgets = (
  name = 'widgets',
  label = 'Modules éditoriaux',
  condition?: Condition,
): Field => ({
  name,
  label,
  type: 'array',
  admin: {
    description: 'Blocs visuels réordonnables : média, note, chiffres, étapes ou ressource.',
    initCollapsed: true,
    condition,
  },
  fields: [
    {
      name: 'widgetType',
      label: 'Type de module',
      type: 'select',
      required: true,
      defaultValue: 'callout',
      options: [
        { label: 'Média', value: 'media' },
        { label: 'Note / callout', value: 'callout' },
        { label: 'Chiffres clés', value: 'metrics' },
        { label: 'Étapes', value: 'steps' },
        { label: 'Lien ressource', value: 'resource' },
      ],
    },
    {
      name: 'media',
      label: 'Fichier',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'media',
      },
    },
    {
      name: 'caption',
      label: 'Légende',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'media',
      },
    },
    {
      name: 'mediaLayout',
      label: 'Largeur',
      type: 'select',
      defaultValue: 'inline',
      options: [
        { label: 'Dans la colonne', value: 'inline' },
        { label: 'Large', value: 'wide' },
      ],
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'media',
      },
    },
    {
      name: 'tone',
      label: 'Tonalité',
      type: 'select',
      defaultValue: 'note',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Décision', value: 'decision' },
        { label: 'Attention', value: 'warning' },
        { label: 'Succès', value: 'success' },
      ],
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'callout',
      },
    },
    {
      name: 'eyebrow',
      label: 'Sur-titre',
      type: 'text',
      admin: {
        condition: (_, siblingData) => ['callout', 'resource'].includes(siblingData.widgetType),
      },
    },
    {
      name: 'title',
      label: 'Titre',
      type: 'text',
      admin: {
        condition: (_, siblingData) => ['callout', 'steps', 'resource'].includes(siblingData.widgetType),
      },
    },
    {
      name: 'text',
      label: 'Texte',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => ['callout', 'resource'].includes(siblingData.widgetType),
      },
    },
    {
      name: 'metrics',
      label: 'Chiffres',
      type: 'array',
      minRows: 1,
      maxRows: 4,
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'metrics',
      },
      fields: [
        { name: 'value', label: 'Valeur', type: 'text', required: true },
        { name: 'label', label: 'Libellé', type: 'text', required: true },
      ],
    },
    {
      name: 'steps',
      label: 'Étapes',
      type: 'array',
      minRows: 1,
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'steps',
      },
      fields: [
        { name: 'title', label: 'Étape', type: 'text', required: true },
        { name: 'text', label: 'Explication', type: 'textarea' },
      ],
    },
    {
      name: 'url',
      label: 'URL',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'resource',
      },
    },
    {
      name: 'linkLabel',
      label: 'Texte du lien',
      type: 'text',
      defaultValue: 'ouvrir la ressource',
      admin: {
        condition: (_, siblingData) => siblingData.widgetType === 'resource',
      },
    },
  ],
})
