/**
 * 🛡️ Script para Criar Regras Customizadas do WAF - Vercel
 * 
 * Este script cria regras customizadas de segurança específicas para a plataforma meDIZ.
 * 
 * Uso:
 *   tsx scripts/create-waf-custom-rules.ts
 */

// @ts-ignore - Opcional: requer instalação de @vercel/sdk
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Pacote opcional para scripts de WAF
import { Vercel } from "@vercel/sdk";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN,
});

interface CustomRule {
  name: string;
  description: string;
  conditionGroup: any[];
  action: any;
}

async function createCustomRules() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!projectId || !process.env.VERCEL_TOKEN) {
    console.error("❌ Erro: VERCEL_TOKEN e VERCEL_PROJECT_ID devem estar configurados");
    process.exit(1);
  }

  console.log("🛡️  Criando regras customizadas do WAF...\n");

  const rules: CustomRule[] = [
    // Regra 1: Rate Limiting para API OpenAI
    {
      name: "Rate Limit OpenAI API",
      description: "Limitar requisições para /api/openai por IP (10 req/minuto)",
      conditionGroup: [
        {
          conditions: [
            {
              type: "uri",
              op: "eq",
              value: "/api/openai",
            },
          ],
        },
      ],
      action: {
        mitigate: {
          action: "challenge", // CAPTCHA após limite
          rateLimit: {
            requests: 10,
            window: 60, // 60 segundos
          },
        },
      },
    },

    // Regra 2: Proteção extra para rotas admin
    {
      name: "Extra Protection Admin Routes",
      description: "Proteção adicional para rotas administrativas",
      conditionGroup: [
        {
          conditions: [
            {
              type: "uri",
              op: "inc",
              value: "/api/admin",
            },
          ],
        },
      ],
      action: {
        mitigate: {
          action: "deny",
          rateLimit: {
            requests: 5,
            window: 60,
          },
        },
      },
    },

    // Regra 3: Bloqueio de User-Agents suspeitos
    {
      name: "Block Suspicious User Agents",
      description: "Bloqueia user-agents conhecidos de scanners e bots maliciosos",
      conditionGroup: [
        {
          conditions: [
            {
              type: "user_agent",
              op: "re",
              value: "(sqlmap|nikto|nmap|masscan|masscan|zmap|scanner|bot|crawler|spider|scraper)",
              neg: false,
            },
          ],
        },
      ],
      action: {
        mitigate: {
          action: "deny",
        },
      },
    },

    // Regra 4: Proteção contra path traversal
    {
      name: "Block Path Traversal",
      description: "Bloqueia tentativas de path traversal (../, ..\\, etc)",
      conditionGroup: [
        {
          conditions: [
            {
              type: "uri",
              op: "re",
              value: "(\\.\\./|\\.\\.\\\\|%2e%2e%2f|%2e%2e%5c)",
            },
          ],
        },
      ],
      action: {
        mitigate: {
          action: "deny",
        },
      },
    },
  ];

  for (const rule of rules) {
    try {
      console.log(`📝 Criando regra: ${rule.name}...`);
      await vercel.security.updateFirewallConfig({
        projectId,
        teamId,
        requestBody: {
          action: "rules.insert",
          id: null,
          value: {
            active: true,
            ...rule,
          },
        },
      });
      console.log(`   ✅ Regra criada com sucesso\n`);
    } catch (error: any) {
      console.error(`   ❌ Erro ao criar regra: ${error.message}`);
      if (error.response?.data) {
        console.error(`   Detalhes:`, JSON.stringify(error.response.data, null, 2));
      }
      console.log();
    }
  }

  console.log("🎉 Todas as regras customizadas foram processadas!");
  console.log("\n📊 Próximos passos:");
  console.log("   1. Verifique as regras no Vercel Dashboard");
  console.log("   2. Monitore os logs para garantir que não há falsos positivos");
  console.log("   3. Ajuste as regras conforme necessário\n");
}

createCustomRules().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

