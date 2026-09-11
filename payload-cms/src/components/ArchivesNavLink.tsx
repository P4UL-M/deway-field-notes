'use client'

import { usePathname } from 'next/navigation'

export function ArchivesNavLink() {
  const pathname = usePathname()
  const active = pathname === '/admin/archives'

  return (
    <div className="archives-nav">
      <div className="archives-nav__label">Rangement</div>
      <a className={active ? 'archives-nav__link archives-nav__link--active' : 'archives-nav__link'} href="/admin/archives">
        <span aria-hidden="true">↳</span>
        Archives
      </a>
    </div>
  )
}
