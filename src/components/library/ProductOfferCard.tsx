'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, Headphones, Lock, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ProductOfferCardProps = {
  title: string
  description: string
  tag: string
  imageSrc: string
  imageAlt: string
  unlocked: boolean
  isLoading?: boolean
  unlockedLabel: string
  lockedLabel: string
  loadingLabel?: string
  variant?: 'default' | 'audioterapia'
  onUnlock: () => void
  onAccess: () => void
  className?: string
  children?: React.ReactNode
}

function TagIcon({ tag }: { tag: string }) {
  const lower = tag.toLowerCase()
  if (lower.includes('áudio') || lower.includes('audio')) {
    return <Headphones className="h-3.5 w-3.5 shrink-0" />
  }
  if (lower.includes('pdf')) {
    return <FileText className="h-3.5 w-3.5 shrink-0" />
  }
  return <BookOpen className="h-3.5 w-3.5 shrink-0" />
}

export function ProductOfferCard({
  title,
  description,
  tag,
  imageSrc,
  imageAlt,
  unlocked,
  isLoading = false,
  unlockedLabel,
  lockedLabel,
  loadingLabel = 'Abrindo...',
  variant = 'default',
  onUnlock,
  onAccess,
  className,
  children
}: ProductOfferCardProps) {
  const [imageFailed, setImageFailed] = useState(false)

  const handleClick = () => {
    if (isLoading) return
    if (unlocked) onAccess()
    else onUnlock()
  }

  const buttonLabel = isLoading
    ? loadingLabel
    : unlocked
      ? unlockedLabel
      : lockedLabel

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm',
        className
      )}
    >
      <div className="flex justify-center px-4 pt-4 sm:pt-5">
        <div className="relative aspect-square w-44 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950 sm:w-52">
          {!imageFailed ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-contain p-1.5"
              sizes="208px"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-indigo-400">
              <TagIcon tag={tag} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
        <h3 className="text-center text-base font-bold leading-snug text-foreground sm:text-lg">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 line-clamp-3 text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
        {tag ? (
          <span className="mx-auto mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <TagIcon tag={tag} />
            {tag}
          </span>
        ) : null}
      </div>

      {children}

      <div className="border-t border-border/60 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <Button
          type="button"
          disabled={isLoading}
          onClick={handleClick}
          className={cn(
            'h-11 w-full gap-2 rounded-xl text-sm font-semibold text-white shadow-md',
            variant === 'audioterapia'
              ? 'bg-violet-600 hover:bg-violet-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : unlocked ? (
            <TagIcon tag={tag} />
          ) : (
            <Lock className="h-4 w-4 shrink-0" />
          )}
          {buttonLabel}
        </Button>
      </div>
    </article>
  )
}
