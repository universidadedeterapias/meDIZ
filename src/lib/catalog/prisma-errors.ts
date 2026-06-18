/** Remove códigos ANSI que o Prisma inclui em mensagens de erro. */
export function stripAnsi(text: string): string {
  const esc = String.fromCharCode(27)
  return text.replace(new RegExp(`${esc}\\[[0-9;]*m`, 'g'), '')
}

export function formatCatalogDbError(error: unknown): string {
  const detail = stripAnsi(error instanceof Error ? error.message : '')

  if (
    detail.includes('Unknown argument') &&
    (detail.includes('mediaFileName') || detail.includes('mediaItems'))
  ) {
    return 'Cliente Prisma desatualizado. Pare o servidor, execute `npx prisma generate` e reinicie com `npm run dev`.'
  }

  if (
    detail.includes("reading 'deleteMany'") ||
    detail.includes('catalogCourseModule')
  ) {
    return 'Cliente Prisma desatualizado (módulos de curso). Execute `npx prisma generate` e reinicie o servidor (`npm run dev`).'
  }

  if (
    detail.includes('media_items') ||
    detail.includes('media_file_name') ||
    detail.includes('catalog_course_modules') ||
    detail.includes('catalog_module_media') ||
    (detail.includes('catalog_products') && detail.includes('does not exist'))
  ) {
    return 'Banco desatualizado. Execute: npx prisma migrate deploy && npx prisma generate'
  }

  if (detail.includes('Record to update not found')) {
    return 'Produto não encontrado'
  }

  if (
    detail.includes('Unique constraint failed') &&
    detail.includes('stone_product_id')
  ) {
    return 'Este ID Stone já está em uso em outro produto do catálogo. Cada curso precisa de um ID Stone exclusivo, ou deixe o campo vazio se ainda não tiver.'
  }

  if (
    detail.includes('Unique constraint failed') &&
    detail.includes('hotmart_product_id')
  ) {
    return 'Este ID Hotmart já está em uso em outro produto do catálogo. Cada produto precisa de um ID Hotmart exclusivo.'
  }

  return detail || 'Erro ao salvar no banco de dados'
}
