/**
 * 🛡️ Script de Configuração do WAF (Web Application Firewall) - Vercel
 * 
 * Este script configura o WAF da Vercel para a plataforma meDIZ.
 * 
 * Uso:
 *   tsx scripts/configure-waf.ts [--mode=log|deny] [--dry-run]
 * 
 * Modos:
 *   - log: Apenas registra ataques (modo monitoramento)
 *   - deny: Bloqueia ataques (modo produção)
 * 
 * Exemplos:
 *   tsx scripts/configure-waf.ts --mode=log
 *   tsx scripts/configure-waf.ts --mode=deny
 *   tsx scripts/configure-waf.ts --mode=log --dry-run
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

interface WAFConfig {
  projectId: string;
  teamId?: string;
  mode: "log" | "deny";
  dryRun: boolean;
}

async function configureWAF(config: WAFConfig) {
  console.log("🛡️  Configurando WAF da Vercel...\n");
  console.log(`📋 Modo: ${config.mode === "log" ? "Monitoramento (log)" : "Bloqueio (deny)"}`);
  console.log(`🔍 Dry Run: ${config.dryRun ? "Sim (não aplicará mudanças)" : "Não (aplicará mudanças)"}\n`);

  if (config.dryRun) {
    console.log("⚠️  MODO DRY RUN - Nenhuma mudança será aplicada\n");
  }

  try {
    // 1. Ativar OWASP Core Rule Set
    console.log("1️⃣  Configurando OWASP Core Rule Set...");
    if (!config.dryRun) {
      await vercel.security.updateFirewallConfig({
        projectId: config.projectId,
        teamId: config.teamId,
        requestBody: {
          action: "managedRules.update",
          id: "owasp",
          value: {
            active: true,
            action: config.mode,
          },
        },
      });
    }
    console.log(`   ✅ OWASP Rules: ${config.mode === "log" ? "Monitoramento" : "Bloqueio ativo"}\n`);

    // 2. Ativar Bot Protection
    console.log("2️⃣  Configurando Bot Protection...");
    if (!config.dryRun) {
      await vercel.security.updateFirewallConfig({
        projectId: config.projectId,
        teamId: config.teamId,
        requestBody: {
          action: "managedRules.update",
          id: "bot_protection",
          value: {
            active: true,
            action: config.mode,
          },
        },
      });
    }
    console.log(`   ✅ Bot Protection: ${config.mode === "log" ? "Monitoramento" : "Bloqueio ativo"}\n`);

    // 3. Ativar AI Bots Protection
    console.log("3️⃣  Configurando AI Bots Protection...");
    if (!config.dryRun) {
      await vercel.security.updateFirewallConfig({
        projectId: config.projectId,
        teamId: config.teamId,
        requestBody: {
          action: "managedRules.update",
          id: "ai_bots",
          value: {
            active: true,
            action: config.mode,
          },
        },
      });
    }
    console.log(`   ✅ AI Bots Protection: ${config.mode === "log" ? "Monitoramento" : "Bloqueio ativo"}\n`);

    // 4. Configurar Attack Protection
    console.log("4️⃣  Configurando Attack Protection...");
    if (!config.dryRun) {
      await vercel.security.updateFirewallConfig({
        projectId: config.projectId,
        teamId: config.teamId,
        requestBody: {
          action: "attack_settings",
          value: {
            sqli: {
              active: true,
              action: config.mode,
            },
            xss: {
              active: true,
              action: config.mode,
            },
            rfi: {
              active: true,
              action: config.mode,
            },
            rce: {
              active: true,
              action: config.mode,
            },
            sf: {
              active: true,
              action: config.mode,
            },
            gen: {
              active: true,
              action: config.mode,
            },
          },
        },
      });
    }
    console.log(`   ✅ SQL Injection Protection: ${config.mode}`);
    console.log(`   ✅ XSS Protection: ${config.mode}`);
    console.log(`   ✅ RFI Protection: ${config.mode}`);
    console.log(`   ✅ RCE Protection: ${config.mode}`);
    console.log(`   ✅ Session Fixation Protection: ${config.mode}`);
    console.log(`   ✅ Generic Attack Protection: ${config.mode}\n`);

    console.log("🎉 WAF configurado com sucesso!\n");

    if (config.mode === "log") {
      console.log("📊 Próximos passos:");
      console.log("   1. Monitore os logs no Vercel Dashboard por alguns dias");
      console.log("   2. Analise falsos positivos e ajuste regras se necessário");
      console.log("   3. Execute este script com --mode=deny após validação\n");
    } else {
      console.log("🔒 WAF está agora bloqueando ataques ativamente!");
      console.log("   Monitore os logs regularmente para garantir que não há falsos positivos.\n");
    }
  } catch (error: any) {
    console.error("❌ Erro ao configurar WAF:", error.message);
    if (error.response) {
      console.error("   Detalhes:", JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith("--mode="));
const dryRunArg = args.includes("--dry-run");

const mode = modeArg?.split("=")[1] === "deny" ? "deny" : "log";
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;

if (!process.env.VERCEL_TOKEN) {
  console.error("❌ Erro: VERCEL_TOKEN não está configurado no .env.local");
  process.exit(1);
}

if (!projectId) {
  console.error("❌ Erro: VERCEL_PROJECT_ID não está configurado no .env.local");
  process.exit(1);
}

configureWAF({
  projectId,
  teamId,
  mode,
  dryRun: dryRunArg,
}).catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

