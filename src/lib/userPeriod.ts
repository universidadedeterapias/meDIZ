// src/lib/userPeriod.ts
export type UserPeriod = 'first-week' | 'first-month' | 'beyond-month';
export type UserLimits = {
  searchLimit: number;
  fullVisualization: boolean;
};

/**
 * Determina o período do usuário com base na data de cadastro
 * @param createdAt Data de cadastro do usuário
 * @returns Período do usuário: 'first-week', 'first-month' ou 'beyond-month'
 */
export function getUserPeriod(createdAt: Date): UserPeriod {
  const now = new Date();
  const diffTime = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return 'first-week';
  } else if (diffDays <= 30) {
    return 'first-month';
  } else {
    return 'beyond-month';
  }
}

/**
 * Retorna os limites de uso baseados no período do usuário
 * @param period Período do usuário
 * @returns Objeto com limites de pesquisa e visualização
 */
export function getUserLimits(period: UserPeriod): UserLimits {
  switch (period) {
    case 'first-week':
      return {
        searchLimit: 3,
        fullVisualization: true
      };
    case 'first-month':
      return {
        searchLimit: 3,
        fullVisualization: false
      };
    case 'beyond-month':
      return {
        searchLimit: 1,
        fullVisualization: false
      };
    default:
      // Caso padrão (não deve ocorrer)
      return {
        searchLimit: 3,
        fullVisualization: true
      };
  }
}
