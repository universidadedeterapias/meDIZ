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
