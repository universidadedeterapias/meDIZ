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
