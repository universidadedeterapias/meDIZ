/**
 * 🔍 Script para Verificar Status do WAF - Vercel
 * 
 * Este script verifica o status atual das configurações do WAF.
 * 
 * Uso:
 *   tsx scripts/check-waf-status.ts
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

async function checkWAFStatus() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!projectId || !process.env.VERCEL_TOKEN) {
    console.error("❌ Erro: VERCEL_TOKEN e VERCEL_PROJECT_ID devem estar configurados");
    process.exit(1);
  }

  console.log("🔍 Verificando status do WAF...\n");

  try {
    // Obter configuração do firewall
    const config = await vercel.security.getFirewallConfig({
      projectId,
      teamId,
    });

    console.log("📊 Status do WAF:\n");

    // Verificar Managed Rules
    if (config.managedRules) {
      console.log("🔹 Managed Rules:");
      for (const [id, rule] of Object.entries(config.managedRules)) {
        const ruleObj = rule as { active?: boolean; action?: string }
        const status = ruleObj.active ? "✅ Ativo" : "❌ Inativo";
        const action = ruleObj.action || "N/A";
        console.log(`   ${id}: ${status} (ação: ${action})`);
      }
      console.log();
    }

    // Verificar Attack Settings
    if (config.attackSettings) {
      console.log("🔹 Attack Protection:");
      for (const [type, setting] of Object.entries(config.attackSettings)) {
        const settingObj = setting as { active?: boolean; action?: string }
        const status = settingObj.active ? "✅ Ativo" : "❌ Inativo";
        const action = settingObj.action || "N/A";
        console.log(`   ${type.toUpperCase()}: ${status} (ação: ${action})`);
      }
      console.log();
    }

    // Verificar Custom Rules
    if (config.customRules && Array.isArray(config.customRules)) {
      console.log(`🔹 Custom Rules: ${config.customRules.length} regras`);
      for (const rule of config.customRules) {
        const ruleObj = rule as { active?: boolean; name?: string }
        const status = ruleObj.active ? "✅" : "❌";
        console.log(`   ${status} ${ruleObj.name || "Sem nome"} (${ruleObj.active ? "Ativo" : "Inativo"})`);
      }
      console.log();
    }

    console.log("✅ Verificação concluída!\n");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error("❌ Erro ao verificar status do WAF:", errorMessage);
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { data?: unknown } }).response
      if (response?.data) {
        console.error("   Detalhes:", JSON.stringify(response.data, null, 2));
      }
    }
    process.exit(1);
  }
}

checkWAFStatus().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});

