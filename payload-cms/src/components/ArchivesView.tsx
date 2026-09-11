import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

export async function ArchivesView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult

  if (!req.user) return null

  const archives = await req.payload.find({
    collection: 'posts',
    depth: 0,
    draft: true,
    limit: 100,
    overrideAccess: false,
    req,
    sort: '-updatedAt',
    where: {
      archived: { equals: true },
    },
  })

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user}
      visibleEntities={visibleEntities}
    >
      <Gutter className="archives-view">
        <header className="archives-view__header">
          <div>
            <p className="archives-view__eyebrow">Contenu hors publication</p>
            <h1>Archives</h1>
            <p>Ces contenus restent en base, mais ne peuvent pas être publiés tant qu’ils sont archivés.</p>
          </div>
          <span>{archives.totalDocs} {archives.totalDocs > 1 ? 'éléments' : 'élément'}</span>
        </header>

        {archives.docs.length ? (
          <div className="archives-view__list">
            {archives.docs.map((post) => (
              <a className="archives-view__row" href={`/admin/collections/posts/${post.id}`} key={post.id}>
                <div>
                  <strong>{post.title}</strong>
                  <span>{post.summary}</span>
                </div>
                <small>
                  {post.type === 'session' ? 'Session' : 'Article'} · modifié le {formatDate(post.updatedAt)}
                </small>
              </a>
            ))}
          </div>
        ) : (
          <p className="archives-view__empty">Aucun contenu archivé.</p>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
