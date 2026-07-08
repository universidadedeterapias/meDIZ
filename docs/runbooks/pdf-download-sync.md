# Runbook: download síncrono de PDF (biblioteca)

Substitui a arquitetura assíncrona (fila BullMQ + worker dedicado + R2 privado),
já revertida em `main` (commit `5e32494`, 2026-07-06) e formalizada aqui com cache
+ suporte a Range. Sem fila, sem worker dedicado, sem serviço extra no EasyPanel.

## Como funciona

1. `POST /api/library/download/request` — valida acesso, checa cota mensal
   (`PDF_DOWNLOAD_MONTHLY_LIMIT`, default 3), emite um token assinado (TTL 15 min).
2. `GET /api/library/download/file?token=...` — valida o token e:
   - Se já existe uma cópia com marca d'água em cache para
     `usuário + produto + mês corrente` (TTL 48h): serve direto do disco, com
     suporte a `Range`/`206` (retomada de download), sem reprocessar.
   - Senão: busca o PDF original, aplica a marca d'água (`pdf-lib`), grava no
     cache local (`PDF_DOWNLOAD_CACHE_DIR`, default `os.tmpdir()/mediz-pdf-cache`),
     conta a cota (`PdfDownload`) e serve.

O processamento pesado (`pdf-lib`) só roda **uma vez por usuário/produto/mês** —
downloads repetidos e retomadas de conexão são leitura de cache em disco.

## Variáveis de ambiente

- `PDF_DOWNLOAD_MONTHLY_LIMIT` (default 3)
- `PDF_DOWNLOAD_CACHE_DIR` (opcional; default `os.tmpdir()/mediz-pdf-cache`)
- `PDF_DOWNLOAD_MAX_CONCURRENT_GENERATIONS` (default 2) — limita gerações
  simultâneas (fetch + watermark) neste processo
- `PDF_DOWNLOAD_MAX_SOURCE_BYTES` (default 300MB) — rejeita com 413
  (`PDF_SOURCE_TOO_LARGE`) em vez de arriscar OOM sem controle

## Premissa: réplica única

O cache é local ao container (disco/`tmpdir`), não compartilhado entre réplicas.
Se este serviço for escalado para múltiplas réplicas no futuro, o cache por
réplica ainda funciona (cada uma reprocessa uma vez), mas deixa de garantir "só
uma geração pesada por mês" — nesse cenário, mover o cache para um armazenamento
compartilhado (ex: bucket privado) antes de escalar.

## Timeout de proxy no EasyPanel

Este app roda como container Docker standalone (não é function serverless),
então não há teto de timeout tipo Vercel. O timeout relevante é o do proxy
reverso do EasyPanel. Configurar um valor generoso (120–300s) para esta rota,
já que a primeira geração de um PDF grande pode legitimamente demorar.

## Instrumentação

Cada geração (cache miss) loga `productId`, tamanho do PDF original, duração e
RSS antes/depois de `applyPdfWatermark` (ver `src/app/api/library/download/file/route.ts`).
Use esses logs em produção para decidir se vale trocar o motor de watermark
(`pdf-lib` → `qpdf`/nativo) — só faz sentido se o RSS observado chegar perto do
limite de memória do container, ou se arquivos grandes continuarem estourando o
timeout do proxy mesmo com o cache.

## Nota sobre o token de download

O token (`createPdfDownloadToken`/`verifyPdfDownloadToken`) permanece válido por
15 minutos e não é mais marcado como "usado" após o primeiro download bem
sucedido — isso é intencional: uma vez que o arquivo está em cache, múltiplas
requisições `Range` com o mesmo token (retomada de download pelo navegador) devem
continuar funcionando dentro da janela de validade. A cota (`PdfDownload`) é
quem garante que o processamento pesado e a contagem mensal não duplicam, não o
estado do token.
