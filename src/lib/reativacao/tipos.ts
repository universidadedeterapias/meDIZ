/**
 * Vocabulario da reativacao: estados, origens, rotulos e a explicacao de por que
 * alguem foi classificado do jeito que foi.
 *
 * Nao importa `prisma` de proposito. A pagina do admin e client component e
 * consome estes rotulos e `explicarEstado`; a consulta mora em `publico.ts`, que
 * so o servidor carrega. Misturar as duas metades num arquivo so arrastaria o
 * Prisma para o bundle do navegador.
 */

/** O corte oficial do plano. Parametro, e nao constante, porque a Regra 2 diz
 *  que o estado e recalculado — trocar o corte nao pode exigir migration. */
export const CORTE_PADRAO_DIAS = 30

export const ESTADOS = [
  'ativo',
  'dormente',
  'explorador',
  'frio',
  'trial',
  'nunca_acessou'
] as const
export type Estado = (typeof ESTADOS)[number]

export const ROTULO_ESTADO: Record<Estado, string> = {
  ativo: 'Ativo',
  dormente: 'Dormente',
  explorador: 'Explorador',
  frio: 'Frio',
  trial: 'Trial',
  nunca_acessou: 'Nunca acessou'
}

export const DESCRICAO_ESTADO: Record<Estado, string> = {
  ativo: 'Assina e usou dentro do corte. Não entra em reativação.',
  dormente: 'Assina e sumiu. Protege receita que já existe.',
  explorador: 'Não assina e está usando agora. Onde sai assinatura nova.',
  frio: 'Não assina e sumiu. Maior esforço, menor retorno.',
  trial: 'Em teste, ainda não pagou. Problema diferente do dormente.',
  nunca_acessou: 'Conta criada e nunca usada. "Volta pro app" seria falso.'
}

/** Estados que o plano manda deixar de fora de qualquer onda de reativação. */
export const ESTADOS_FORA_DA_REATIVACAO: Estado[] = ['ativo']

export const ROTULO_FONTE: Record<string, string> = {
  conversa: 'conversa com agente',
  download_biblioteca: 'download na biblioteca',
  descoberta: 'descoberta',
  checkpoint_conversa: 'checkpoint de conversa',
  pasta_sintoma: 'pasta de sintoma',
  evento_jornada: 'evento de jornada',
  lembrete: 'lembrete criado'
}

/**
 * Tags de origem. Os valores tem que casar com o CASE da view `user_origins`.
 *
 * `aluno` e `ex_aluno` existem no plano e nao existem no banco: a formacao vive
 * em outra plataforma e nunca foi importada. Ficam declaradas para o filtro ja
 * nascer com o vocabulario certo, e aparecem zeradas ate a importacao existir.
 */
export const ORIGENS = [
  'livro_corpo_diz',
  'guia_sentido_biologico',
  'audioterapia',
  'assinatura',
  'curso',
  'aluno',
  'ex_aluno',
  'outro'
] as const
export type Origem = (typeof ORIGENS)[number]

export const ROTULO_ORIGEM: Record<Origem, string> = {
  livro_corpo_diz: 'Livro O Corpo Diz',
  guia_sentido_biologico: 'Guia Sentido Biológico',
  audioterapia: 'Audioterapia',
  assinatura: 'Assinatura meDIZ',
  curso: 'Curso',
  aluno: 'Aluno',
  ex_aluno: 'Ex-aluno',
  outro: 'Outro'
}

/** Origens que o plano prevê e o banco ainda não tem fonte para preencher. */
export const ORIGENS_SEM_FONTE: Origem[] = ['aluno', 'ex_aluno']

export type Evidencia = {
  origem: Origem
  produto: string
  fonte: string
  em: string | null
}

export type LinhaPublico = {
  userId: string
  email: string
  nome: string | null
  whatsapp: string | null
  idioma: string | null
  estado: Estado
  contaCriadaEm: string | null
  assinaturaStatus: string | null
  assinaturaDesde: string | null
  primeiroAcessoEm: string | null
  ultimoSinalEm: string | null
  ultimaFonte: string | null
  diasSemSinal: number | null
  origens: Origem[]
  evidencias: Evidencia[]
}

export type Filtros = {
  corte: number
  estados: Estado[]
  incluirOrigens: Origem[]
  excluirOrigens: Origem[]
  idiomas: string[]
  /** true = só quem não tem idioma marcado. O campo existe e está 91% vazio. */
  semIdioma: boolean
  busca: string | null
  limit: number
  offset: number
}

export function filtrosPadrao(): Filtros {
  return {
    corte: CORTE_PADRAO_DIAS,
    estados: [],
    incluirOrigens: [],
    excluirOrigens: [],
    idiomas: [],
    semIdioma: false,
    busca: null,
    limit: 50,
    offset: 0
  }
}

export type ResultadoPublico = {
  /** Quantos batem em TODOS os filtros, inclusive estado. É este que autoriza disparo. */
  total: number
  /** Distribuição por estado com os demais filtros aplicados, mas sem o de estado:
   *  o operador precisa continuar vendo o todo depois de clicar num rótulo. */
  contagens: Record<Estado, number>
  corte: number
  items: LinhaPublico[]
}

/**
 * A cadeia de fatos que produziu o rotulo, em linguagem de gente.
 *
 * Mora aqui e nao dentro do componente porque e a mesma regra do SQL dita em
 * outra lingua: se uma mudar sem a outra, o painel passa a mentir com confianca.
 */
export function explicarEstado(l: LinhaPublico, corte: number): string[] {
  const fatos: string[] = []

  if (l.assinaturaStatus === 'active') {
    fatos.push(
      l.assinaturaDesde
        ? `Assina desde ${new Date(l.assinaturaDesde).toLocaleDateString('pt-BR')}.`
        : 'Tem assinatura ativa.'
    )
  } else if (l.assinaturaStatus === 'trialing') {
    fatos.push('Está em período de teste — ainda não pagou.')
  } else if (l.assinaturaStatus) {
    fatos.push(`Assinatura ${l.assinaturaStatus} — não conta como assinante.`)
  } else {
    fatos.push('Nunca teve assinatura.')
  }

  if (l.estado === 'nunca_acessou') {
    fatos.push(
      'Nenhum rastro de uso, e o primeiro acesso nunca foi registrado: a conta foi criada e nunca usada.'
    )
    fatos.push('Não é frio por abandono — dizer "volta pro app" para esta pessoa é falso.')
    return fatos
  }

  if (l.ultimoSinalEm && l.ultimaFonte) {
    const rotulo = ROTULO_FONTE[l.ultimaFonte] ?? l.ultimaFonte
    const data = new Date(l.ultimoSinalEm).toLocaleDateString('pt-BR')
    fatos.push(`Último rastro: ${rotulo}, em ${data} — ${l.diasSemSinal} dia(s) atrás.`)
    fatos.push(
      l.diasSemSinal !== null && l.diasSemSinal <= corte
        ? `Dentro do corte de ${corte} dias.`
        : `Fora do corte de ${corte} dias.`
    )
  } else {
    fatos.push(
      'Sem rastro de uso, mas com primeiro acesso registrado: entrou no app e saiu sem pesquisar, baixar nem criar nada.'
    )
    fatos.push('Este é o ponto cego da medição — 72 pessoas na base inteira.')
  }

  if (l.origens.length === 0) {
    fatos.push('Nenhuma compra conhecida: só existe como conta no app.')
  }

  return fatos
}

/**
 * De onde sai o valor de cada {{n}} do template.
 *
 * `literal` existe para o que nao vem do destinatario — nome do livro, valor do
 * desconto, prazo. O resto sai da propria linha da fila.
 */
export const FONTES_VARIAVEL = [
  'primeiro_nome',
  'nome_completo',
  'email',
  'estado',
  'idioma',
  'literal'
] as const
export type FonteVariavel = (typeof FONTES_VARIAVEL)[number]

export const ROTULO_FONTE_VARIAVEL: Record<FonteVariavel, string> = {
  primeiro_nome: 'Primeiro nome',
  nome_completo: 'Nome completo',
  email: 'E-mail',
  estado: 'Estado (dormente, frio…)',
  idioma: 'Idioma',
  literal: 'Texto fixo'
}

export type MapeamentoVariavel = {
  /** 1 vira {{1}} no template. */
  posicao: number
  fonte: FonteVariavel
  /** Só usado quando `fonte` é `literal`. */
  valor?: string
}

/** Botão de URL do template, ou null quando o template não tem botão. */
export type MapeamentoBotao = {
  tipo: 'url'
  /** `token` é o único que faz sentido hoje: é o que leva a pessoa ao /r. */
  fonte: 'token'
} | null

/**
 * O que vale quando a onda nao tras mapeamento — ondas criadas antes desta
 * configuracao existir. E o comportamento que o n8n tinha fixo no codigo.
 */
export const MAPEAMENTO_PADRAO: MapeamentoVariavel[] = [
  { posicao: 1, fonte: 'primeiro_nome' }
]
export const BOTAO_PADRAO: MapeamentoBotao = { tipo: 'url', fonte: 'token' }

/**
 * Quantas pessoas do recorte entram na onda.
 *
 * `quantidade` e `percentual` sorteiam dentro do recorte — nunca pegam "os N
 * mais recentes". Sem sorteio, ondas sucessivas do mesmo recorte martelariam
 * sempre as mesmas pessoas, porque a consulta sempre ordena pelo mesmo
 * criterio (ultimo sinal). O sorteio acontece uma vez, na criacao: a lista
 * congelada e quem foi sorteado, nao uma regra que reroda.
 */
export const MODOS_AMOSTRAGEM = ['todos', 'quantidade', 'percentual'] as const
export type ModoAmostragem = (typeof MODOS_AMOSTRAGEM)[number]

export const ROTULO_MODO_AMOSTRAGEM: Record<ModoAmostragem, string> = {
  todos: 'Todas as pessoas do recorte',
  quantidade: 'Uma quantidade',
  percentual: 'Um percentual'
}

export type Amostragem = {
  modo: ModoAmostragem
  /** Pessoas (quantidade) ou 1-100 (percentual). Null quando modo = todos. */
  valor: number | null
}

export function amostragemPadrao(): Amostragem {
  return { modo: 'todos', valor: null }
}

/** Quantas pessoas a amostragem tira de um recorte de `totalRecorte` pessoas. */
export function tamanhoAmostra(a: Amostragem, totalRecorte: number): number {
  if (a.modo === 'quantidade') return Math.max(0, Math.min(a.valor ?? 0, totalRecorte))
  if (a.modo === 'percentual') {
    const pct = Math.max(0, Math.min(a.valor ?? 0, 100))
    return Math.round((totalRecorte * pct) / 100)
  }
  return totalRecorte
}
