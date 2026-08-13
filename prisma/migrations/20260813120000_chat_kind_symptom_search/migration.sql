-- Aditiva: apenas acrescenta o valor usado pelo modo pesquisa por sintoma (/pesquisa).
-- Nenhuma linha existente muda; sessoes antigas seguem em SEARCH/SIMULADOR/PROF.
ALTER TYPE "ChatKind" ADD VALUE IF NOT EXISTS 'SYMPTOM_SEARCH';
