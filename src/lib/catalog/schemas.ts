import { z } from 'zod'

export const catalogProductBodySchema = z.object({
  section: z.enum(['BIBLIOTECA', 'AUDIOTERAPIA']),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().max(5000).optional().nullable(),
  tagLabel: z.string().max(80).optional().nullable(),
  coverImageUrl: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z
      .string()
      .max(2048)
      .nullable()
      .optional()
      .refine(
        (v) => v == null || v.startsWith('/') || /^https?:\/\//i.test(v),
        'Capa: use URL https://... ou caminho /catalog/...'
      )
  ),
  purchaseUrl: z
    .string()
    .min(1, 'Link de compra é obrigatório')
    .refine(
      (v) => /^https?:\/\//i.test(v.trim()),
      'Informe um link válido começando com https://'
    ),
  permissionKey: z.enum(['LIVRO_DIGITAL', 'PDF', 'VIDEO', 'AUDIOTERAPIA']),
  locale: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.enum(['pt', 'en', 'es']).nullable().optional()
  ),
  pdfIndex: z.coerce.number().int().min(0).max(20).default(0),
  mediaFileName: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().max(2048).nullable().optional()
  ),
  mediaItems: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        mediaFileName: z.string().min(1),
        locale: z.string().optional(),
        sortOrder: z.number().int().min(0),
        kind: z.enum(['video', 'pdf', 'audio']).optional()
      })
    )
    .optional()
    .nullable(),
  stoneProductId: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().max(120).nullable().optional()
  ),
  hotmartProductId: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().max(120).nullable().optional()
  ),
  paymentProvider: z
    .enum(['HOTMART', 'STONE', 'FREE'])
    .optional()
    .default('HOTMART'),
  grantsProductIds: z.array(z.string().uuid()).optional().default([]),
  extraHotmartProductIds: z
    .array(z.string().max(120))
    .optional()
    .default([]),
  unlockedLabel: z.string().max(80).optional().nullable(),
  freeAccess: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true)
})

export type CatalogProductBody = z.infer<typeof catalogProductBodySchema>

const courseModuleMediaSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(['video', 'pdf', 'audio']),
  title: z.string().min(1).max(255),
  mediaFileName: z.string().min(1).max(2048),
  locale: z.enum(['pt', 'en', 'es']).nullable().optional(),
  sortOrder: z.number().int().min(0)
})

const courseModuleSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  coverImageUrl: z.string().max(2048).nullable().optional(),
  sortOrder: z.number().int().min(0),
  media: z.array(courseModuleMediaSchema)
})

export const courseModulesBodySchema = z.object({
  modules: z.array(courseModuleSchema)
})

export type CourseModulesBody = z.infer<typeof courseModulesBodySchema>
