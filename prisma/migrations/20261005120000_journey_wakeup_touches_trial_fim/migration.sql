-- O aviso de fim do trial (/api/journey-events/trial-fim) reaproveita este log
-- com sistema = 'trial_fim', e o endpoint /despertadores/toques ja aceita esse
-- valor desde 24/09/2026 — mas o CHECK do banco ficou so com 'acesso' e
-- 'pesquisa'. Todo toque do trial era enviado no WhatsApp e falhava ao gravar,
-- e sem a linha gravada o candidato voltava na rodada seguinte: a mesma pessoa
-- recebia o aviso do dia 6 de novo a cada execucao da janela.
ALTER TABLE "journey_wakeup_touches"
  DROP CONSTRAINT "journey_wakeup_touches_sistema_check";

ALTER TABLE "journey_wakeup_touches"
  ADD CONSTRAINT "journey_wakeup_touches_sistema_check"
  CHECK ("sistema" IN ('acesso', 'pesquisa', 'trial_fim'));
