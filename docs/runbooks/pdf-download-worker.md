# Worker de downloads PDF

O download de PDFs licenciados grandes depende de um processo Node persistente. Ele nao deve rodar dentro de uma funcao Vercel.

## Requisitos

- Banco e migration atualizados.
- Redis acessivel pela aplicacao e pelo worker.
- Bucket R2 privado separado do bucket publicado em `R2_PUBLIC_URL`.
- Worker com pelo menos 2 GB de memoria e concorrencia inicial igual a 1.

## Variaveis

Configure no app e no worker: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `R2_ACCOUNT_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET` e os secrets normais da aplicacao.

No app, ative o rollout com `PDF_ASYNC_DOWNLOAD_ENABLED=true`. Para iniciar somente com o livro grande, defina `PDF_ASYNC_DOWNLOAD_PRODUCT_IDS` com os UUIDs separados por virgula. Sem a flag, os demais PDFs continuam no fluxo legado.

O app ainda usa `R2_BUCKET` e `R2_PUBLIC_URL` para os arquivos originais. O bucket `R2_PRIVATE_BUCKET` nao pode possuir dominio publico.

## Execucao

Localmente:

```bash
npm run worker:pdf-download
```

Container dedicado:

```bash
docker build -f Dockerfile.worker -t mediz-pdf-worker .
docker run --env-file .env mediz-pdf-worker
```

O worker publica heartbeat no Redis. Sem heartbeat recente, a API retorna `503` e nao inicia processamento sincrono.

## Operacao

- Comece com `PDF_DOWNLOAD_WORKER_CONCURRENCY=1`.
- Acompanhe os logs `ready` e `failed` por `jobId`.
- Nao registre URLs assinadas, e-mail, CPF ou conteudo da marca d'agua.
- Artefatos ficam disponiveis por 48 horas; a manutencao do worker remove os vencidos.
- Configure tambem uma regra de lifecycle no bucket privado como protecao adicional.
