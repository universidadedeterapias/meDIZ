type DiscoveryEligibilityInput = {
  userCreatedAt: Date
  discoveryCompleted?: boolean | null
  enabled?: boolean
  rolloutStartedAt?: Date | null
}

export type DiscoveryRolloutConfig = {
  enabled: boolean
  rolloutStartedAt: Date | null
}

/**
 * Quantos "agora nao" a pessoa pode dar antes de a descoberta deixar de ser
 * opcional. Sao tres aparicoes no total: duas dispensaveis e a terceira obrigatoria.
 *
 * A intencao e que todo mundo passe pela descoberta — ela alimenta o perfil que o
 * chat inteiro usa —, mas nunca de cara, e nunca antes de a pessoa ver o que comprou.
 */
export const DISCOVERY_MAX_DISMISSALS = 2

/** Silencio entre um "agora nao" e o convite seguinte. */
export const DISCOVERY_DISMISS_COOLDOWN_DAYS = 7

export function getDiscoveryRolloutConfig(): DiscoveryRolloutConfig {
  const enabled = process.env.DISCOVERY_ENABLED === 'true'
  const rawRolloutStartedAt = process.env.DISCOVERY_ROLLOUT_STARTED_AT
  const parsedRolloutStartedAt = rawRolloutStartedAt ? new Date(rawRolloutStartedAt) : null
  const rolloutStartedAt =
    parsedRolloutStartedAt && !Number.isNaN(parsedRolloutStartedAt.getTime())
      ? parsedRolloutStartedAt
      : null

  return {
    enabled: enabled && rolloutStartedAt !== null,
    rolloutStartedAt
  }
}

/**
 * Painel de teste do discovery (reiniciar fluxo + editar prompt direto na tela /descoberta).
 * So deve ser ligado em HML — nunca em producao.
 */
export function isDiscoveryTestModeEnabled(): boolean {
  return process.env.DISCOVERY_TEST_MODE === 'true'
}

/**
 * Se a descoberta faz sentido para esta pessoa: feature ligada, conta dentro do
 * rollout e fluxo ainda nao concluido.
 *
 * Isto e elegibilidade, e nao obrigacao — a descoberta deixou de ser gate. Quem
 * decide se o convite aparece agora e `shouldSuggestDiscovery`.
 */
export function shouldRunDiscovery({
  userCreatedAt,
  discoveryCompleted,
  enabled,
  rolloutStartedAt
}: DiscoveryEligibilityInput): boolean {
  const config = getDiscoveryRolloutConfig()
  const featureEnabled = enabled ?? config.enabled
  const rolloutDate = rolloutStartedAt === undefined ? config.rolloutStartedAt : rolloutStartedAt

  if (!featureEnabled || !rolloutDate || discoveryCompleted === true) {
    return false
  }

  return userCreatedAt.getTime() >= rolloutDate.getTime()
}

export type DiscoverySuggestionInput = {
  eligible: boolean
  /** Nulo == esta e a primeira visita: nao convidamos ninguem que acabou de chegar. */
  firstAccessAt?: Date | null
  dismissedAt?: Date | null
  dismissCount?: number | null
  now?: Date
}

/** Ja passou o silencio desde o ultimo "agora nao"? */
function cooldownPassed(dismissedAt: Date | null | undefined, now: Date): boolean {
  if (!dismissedAt) return true
  const cooldownMs = DISCOVERY_DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  return now.getTime() - dismissedAt.getTime() >= cooldownMs
}

/**
 * Se o convite (dispensavel) deve aparecer agora.
 *
 * Nunca na primeira visita — quem acabou de comprar um livro le o livro primeiro.
 * Depois disso aparece, some por alguns dias a cada "agora nao", e da lugar a
 * `shouldRequireDiscovery` quando as dispensas acabam.
 */
export function shouldSuggestDiscovery({
  eligible,
  firstAccessAt,
  dismissedAt,
  dismissCount,
  now
}: DiscoverySuggestionInput): boolean {
  if (!eligible) return false
  if (!firstAccessAt) return false

  const count = dismissCount ?? 0
  if (count >= DISCOVERY_MAX_DISMISSALS) return false

  return cooldownPassed(dismissedAt, now ?? new Date())
}

/**
 * Se a descoberta deixou de ser opcional — a terceira e ultima aparicao.
 *
 * Vale em qualquer tela do app, inclusive na biblioteca: a intencao e que todo
 * mundo passe. Continua nao valendo na primeira visita.
 *
 * IMPORTANTE: obrigatorio aqui significa "nao da para dispensar por escolha", e
 * nunca "nao da para sair se o fluxo quebrar". A tela de descoberta mantem uma
 * saida para falha tecnica — sem isso, voltariamos ao travamento que existia.
 */
export function shouldRequireDiscovery({
  eligible,
  firstAccessAt,
  dismissedAt,
  dismissCount,
  now
}: DiscoverySuggestionInput): boolean {
  if (!eligible) return false
  if (!firstAccessAt) return false

  const count = dismissCount ?? 0
  if (count < DISCOVERY_MAX_DISMISSALS) return false

  return cooldownPassed(dismissedAt, now ?? new Date())
}
