// src/lib/abTesting.ts

/**
 * Tipos e interfaces para o sistema de testes A/B
 */

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetAudience?: UserPeriod[];
  minimumSampleSize?: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;  // Peso para distribuição (0-100)
  data: Record<string, unknown>;
}

// Tipos de períodos de usuário
export type UserPeriod = 'first-week' | 'first-month' | 'beyond-month';

/**
 * Seleciona uma variante de teste A/B com base nos pesos definidos
 * @param variants Array de variantes com seus pesos
 * @returns A variante selecionada
 */
export function selectVariant(variants: ABTestVariant[]): ABTestVariant {
  // Calcular soma total dos pesos
  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
  
  // Número aleatório entre 0 e o peso total
  const random = Math.random() * totalWeight;
  
  // Selecionar variante com base no peso
  let weightSum = 0;
  for (const variant of variants) {
    weightSum += variant.weight;
    if (random <= weightSum) {
      return variant;
    }
  }
  
  // Fallback para a primeira variante (não deve acontecer se os pesos somarem > 0)
  return variants[0];
}

/**
 * Atribui um teste A/B para um usuário
 * @param userId ID do usuário
 * @param testId ID do teste A/B
 * @param userPeriod Período do usuário
 * @returns A variante selecionada ou null se o usuário não for elegível
 */
export function assignTestToUser(
  userId: string, 
  testId: string,
  userPeriod: UserPeriod,
  tests: ABTest[]
): ABTestVariant | null {
  // Busca o teste pelo ID
  const test = tests.find(t => t.id === testId);
  
  if (!test || !test.isActive) {
    return null;
  }
  
  // Verifica se o usuário está no público-alvo
  if (test.targetAudience && !test.targetAudience.includes(userPeriod)) {
    return null;
  }
  
  // Determinístico - o mesmo usuário sempre verá a mesma variante
  // para um teste específico (para consistência)
  const hash = hashCode(userId + testId);
  const normalizedHash = Math.abs(hash) / 2147483647; // Normaliza para 0-1
  
  // Seleciona variante baseado no hash
  const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
  const targetWeight = normalizedHash * totalWeight;
  
  let weightSum = 0;
  for (const variant of test.variants) {
    weightSum += variant.weight;
    if (targetWeight <= weightSum) {
      return variant;
    }
  }
  
  return test.variants[0];
}

/**
 * Função simples de hash para strings
 * @param str String a ser transformada em hash
 * @returns Valor de hash
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Registra uma impressão de teste A/B
 * @param userId ID do usuário
 * @param testId ID do teste
 * @param variantId ID da variante
 */
export function recordImpression(userId: string, testId: string, variantId: string): void {
  // Em um ambiente real, isso enviaria dados para um backend
  console.log(`Impression recorded: user=${userId}, test=${testId}, variant=${variantId}`);
  
  // Exemplo de como seria o código para enviar para o backend:
  // fetch('/api/ab-testing/impression', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ userId, testId, variantId })
  // });
}

/**
 * Registra uma conversão de teste A/B
 * @param userId ID do usuário
 * @param testId ID do teste
 * @param variantId ID da variante
 * @param value Valor opcional da conversão (ex: valor da venda)
 */
export function recordConversion(
  userId: string, 
  testId: string, 
  variantId: string,
  value?: number
): void {
  // Em um ambiente real, isso enviaria dados para um backend
  console.log(`Conversion recorded: user=${userId}, test=${testId}, variant=${variantId}, value=${value}`);
  
  // Exemplo de como seria o código para enviar para o backend:
  // fetch('/api/ab-testing/conversion', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ userId, testId, variantId, value })
  // });
}

/**
 * Exemplo de testes A/B disponíveis
 */
export const exampleTests: ABTest[] = [
  {
    id: 'blur-cta-test',
    name: 'Mensagens CTA para Conteúdo Blur',
    description: 'Testa diferentes mensagens de call-to-action no conteúdo com blur',
    isActive: true,
    startDate: new Date('2025-09-01'),
    variants: [
      {
        id: 'variant-a',
        name: 'Mensagem Padrão',
        weight: 33,
        data: {
          message: 'Assine para desbloquear o conteúdo completo'
        }
      },
      {
        id: 'variant-b',
        name: 'Mensagem de Benefício',
        weight: 33,
        data: {
          message: 'Desbloqueie insights médicos completos com nossa assinatura'
        }
      },
      {
        id: 'variant-c',
        name: 'Mensagem de Urgência',
        weight: 34,
        data: {
          message: 'Assine agora e tenha acesso imediato a todas as informações'
        }
      }
    ],
    targetAudience: ['first-month', 'beyond-month'],
    minimumSampleSize: 100
  },
  {
    id: 'popup-design-test',
    name: 'Design do Pop-up',
    description: 'Testa diferentes designs de pop-up entre pesquisas',
    isActive: true,
    startDate: new Date('2025-09-01'),
    variants: [
      {
        id: 'standard',
        name: 'Design Padrão',
        weight: 50,
        data: {
          template: 'standard',
          buttonColor: 'indigo-600',
          showImage: true
        }
      },
      {
        id: 'minimal',
        name: 'Design Minimalista',
        weight: 50,
        data: {
          template: 'minimal',
          buttonColor: 'green-600',
          showImage: false
        }
      }
    ],
    targetAudience: ['first-week', 'first-month', 'beyond-month']
  }
];
