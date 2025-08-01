import React, { ReactNode } from 'react'
import Link from 'next/link'
import { Badge, cn } from 'ui'
import { ArrowNarrowRightIcon } from '@heroicons/react/outline'

interface Props {
  url: string
  announcement: string | ReactNode
  badge?: string | ReactNode
  target?: '_self' | '_blank' | string
  className?: string
  hasArrow?: boolean
  style?: React.CSSProperties
}

const AnnouncementBadge = ({
  url,
  announcement,
  badge,
  target = '_self',
  className,
  hasArrow = true,
  style,
}: Props) => (
  <div className={cn('relative w-fit max-w-xl flex justify-center', className)} style={style}>
    <Link
      href={url}
      target={target}
      className={cn(
        `
          announcement-link
          group/announcement
          relative
          flex flex-row
          items-center
          p-1 pr-3
          text-sm
          w-auto
          gap-2
          text-left
          rounded-full
          bg-opacity-20
          border
          border-background-surface-300
          hover:border-foreground-muted
          hover:border-opacity-30
          shadow-md
          overflow-hidden
          focus-visible:outline-none focus-visible:ring-brand-600 focus-visible:ring-2 focus-visible:rounded-full
          `,
        !badge && 'px-4'
      )}
    >
      {badge && (
        <Badge variant="brand" size="large" className="py-1 announcement-badge">
          {badge}
        </Badge>
      )}
      <span className="text-foreground announcement-text">{announcement}</span>
      {hasArrow && (
        <ArrowNarrowRightIcon className="announcement-icon h-4 ml-2 -translate-x-1 text-foreground transition-transform group-hover/announcement:translate-x-0" />
      )}
      <div
        className="announcement-overlay absolute inset-0 -z-10 bg-gradient-to-br
            opacity-70
            group-hover/announcement:opacity-100
            transition-opacity
            overflow-hidden rounded-full
            from-background-surface-100
            to-background-surface-300
            backdrop-blur-md
            "
      />
    </Link>
  </div>
)

export default AnnouncementBadge
