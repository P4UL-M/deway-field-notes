import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Auteur',
    plural: 'Auteurs',
  },
  admin: {
    useAsTitle: 'email',
    group: 'Système',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
