/** Produto com acesso liberado para qualquer usuário logado (sem liberação Hotmart). */
export function isFreeCatalogProduct(product: {
  freeAccess?: boolean | null
}): boolean {
  return product.freeAccess === true
}
