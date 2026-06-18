'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, Headphones, Lock, Loader2, BookOpen, PlaySquare, GraduationCap } from 'lucide-react'
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
  const mediaHints = ['vídeo', 'video', 'áudio', 'audio', 'pdf'].filter((hint) =>
    lower.includes(hint)
  )
  if (mediaHints.length > 1 || lower.includes(' e ')) {
    return <GraduationCap className="h-3.5 w-3.5 shrink-0" />
  }
  if (lower.includes('vídeo') || lower.includes('video')) {
    return <PlaySquare className="h-3.5 w-3.5 shrink-0" />
  }
  if (lower.includes('áudio') || lower.includes('audio')) {
    return <Headphones className="h-3.5 w-3.5 shrink-0" />
  }
  if (lower.includes('pdf')) {
    return <FileText className="h-3.5 w-3.5 shrink-0" />
  }
  return <BookOpen className="h-3.5 w-3.5 shrink-0" />
}

/** Largura da coluna visual (capa + botão alinhados). */
const mediaColumnClass = 'w-full max-w-[15rem] sm:max-w-[17.5rem]'

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
      <div className="flex flex-col items-center gap-3 px-4 py-5 sm:gap-4 sm:px-5 sm:py-6">
        <div
          className={cn(
            'relative aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950',
            mediaColumnClass
          )}
        >
          {!imageFailed ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              className="object-contain p-2 sm:p-2.5"
              sizes="(max-width: 640px) 240px, 280px"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-indigo-400">
              <TagIcon tag={tag} />
            </div>
          )}
        </div>

        <div className={cn('space-y-2 text-center', mediaColumnClass)}>
          <h3 className="text-base font-bold leading-snug text-foreground sm:text-lg">
            {title}
          </h3>
          {description ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </p>
          ) : null}
          {tag ? (
            <span className="mx-auto inline-flex w-fit items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <TagIcon tag={tag} />
              {tag}
            </span>
          ) : null}
        </div>

        {children}

        <Button
          type="button"
          disabled={isLoading}
          onClick={handleClick}
          className={cn(
            mediaColumnClass,
            'h-10 w-full gap-2 rounded-lg text-sm font-semibold text-white shadow-sm',
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
