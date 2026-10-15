/** Roda `n` promessas por vez, com o índice original — uma planilha de
 *  milhares de linhas não pode virar milhares de queries síncronas numa
 *  única request. */
export async function emLotes<T, R>(
  itens: T[],
  n: number,
  fn: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const saida: R[] = new Array(itens.length)
  for (let i = 0; i < itens.length; i += n) {
    const lote = itens.slice(i, i + n)
    const resultados = await Promise.all(lote.map((item, j) => fn(item, i + j)))
    for (let j = 0; j < resultados.length; j++) saida[i + j] = resultados[j]
  }
  return saida
}
