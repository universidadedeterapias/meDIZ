import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function FirstName(name: string) {
  const FirstName = name.split(' ')[0]
  return FirstName
}

export function SurName(name: string) {
  const SurName = name.split(' ')[1]
  return SurName
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
