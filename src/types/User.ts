// src/types/UserFullProps.ts
import type { AppUsage, Gender } from '@prisma/client'

export type User = {
  image: string
  name: string
  fullName: string
  email: string
  age: number
  gender: string
  profession: string
  appUsage: string
  description: string
}

/**
 * UserFullProps reflete exatamente todos os campos do model User no Prisma,
 * com os mesmos nomes e tipos (incluindo nulos).
 */
export type UserFullProps = {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  passwordHash: string | null
  image: string | null
  createdAt: Date
  updatedAt: Date

  fullName: string | null
  whatsapp: string | null
  age: number | null
  gender: Gender | null
  profession: string | null
  appUsage: AppUsage | null
  description: string | null

  educationOrSpecialty: string | null
  yearsOfExperience: string | null
  clientsPerWeek: string | null
  averageSessionPrice: string | null

  stripeCustomerId: string | null
}
