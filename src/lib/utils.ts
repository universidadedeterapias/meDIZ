import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function FirstName(name?: string | null): string {
  if (!name) return ''
  return name.trim().split(/\s+/)[0] || ''
}

export function SurName(name?: string | null): string {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

export function formatDate(input: Date | string | number): string {
  const date =
    typeof input === 'string' || typeof input === 'number'
      ? new Date(input)
      : input

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}
