-- Plano usado pelo trial de 7 dias do Profissional que acompanha a compra do livro.
--
-- Nao existe contrapartida na Hotmart: ninguem compra este plano, quem cria a
-- assinatura e o proprio app em grantPurchaseAccess. Por isso "hotmartId" e
-- "hotmartOfferKey" ficam nulos de proposito — a busca do webhook e
-- findUnique({ where: { hotmartId } }) com um inteiro, entao uma linha nula nunca
-- pode ser resolvida por engano a partir de uma compra real.
--
-- Manter separado do "Plano Profissional | Mensal" preserva a contagem de
-- assinaturas daquele plano como "pagantes", e deixa a coorte de trial consultavel
-- direto — que e o numero que mede a conversao da esteira de e-mails.
--
-- monthlyLimit nulo = ilimitado, espelhando o Profissional: o entitlement olha
-- status da assinatura + limite, nao a identidade do plano (ver premiumUtils).
--
-- Idempotente: reaplicar nao duplica nem sobrescreve.

INSERT INTO "Plan" (
    "id",
    "name",
    "stripePriceId",
    "monthlyLimit",
    "createdAt",
    "updatedAt",
    "active",
    "amount",
    "currency",
    "interval",
    "intervalCount",
    "stripeProductId",
    "trialPeriodDays",
    "hotmartOfferKey",
    "hotmartId"
) VALUES (
    'b3991505-8dd1-4695-9128-8e8b1ef76e2f',
    'Plano Profissional | Trial 7 dias',
    'trial_profissional_7d',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    true,
    0,
    'BRL',
    'DAY'::"PlanInterval",
    7,
    NULL,
    7,
    NULL,
    NULL
)
ON CONFLICT ("stripePriceId") DO NOTHING;
