# Changelog — Junho 2026

Período coberto: **1 de junho de 2026** até **23 de junho de 2026** (desde o fim de maio / início do ciclo atual de entregas na branch `newmediz`).

Documento de referência para product, suporte e deploy. Detalhes de API em [`DOCUMENTACAO-API.md`](./DOCUMENTACAO-API.md) e fluxos em [`DOCUMENTACAO-TECNICA.md`](./DOCUMENTACAO-TECNICA.md).

---

## Resumo executivo

Neste período a plataforma evoluiu de um MVP de biblioteca/chat para um **catálogo unificado** (biblioteca + cursos + audioterapia), com **entitlements por produto**, **painel admin ampliado**, **modo escuro**, **navegação “Voltar”** consistente, **simulador com escolha de modo**, **download de PDF com marca d’água**, **integração Stone/Hotmart** e **API de consulta de clientes** para n8n.

---

## 1. Interface e experiência do usuário

### 1.1 Modo escuro (dark mode)

| Item | Detalhe |
|------|---------|
| **Componente** | `src/components/ThemeToggle.tsx` |
| **Provider** | `src/components/theme-provider.tsx` + `next-themes` em `src/app/layout.tsx` |
| **Variantes** | `icon` (sol/lua) e `switch` (com rótulo “Modo escuro”) |
| **Onde aparece** | Chat principal, chat conversacional (Prof/Simulador), headers (`AppPageHeader`, `SimpleAppHeader`), login/cadastro (`AuthPageChrome`), toolbar de aparência, **painel admin** (`AdminClientLayout`) |
| **i18n** | Chaves `theme.light`, `theme.dark`, `theme.darkMode` em pt-BR, pt-PT, en, es |
| **Estilos** | Ajustes em `globals.css`, `auth-form-styles.ts`, componentes de formulário e cards |

**Compatibilidade:** `ModeToggle` antigo redireciona para `ThemeToggle` (`src/components/mode-toggle.ts`).

### 1.2 Botão “Voltar” e navegação

| Item | Detalhe |
|------|---------|
| **Componente base** | `src/components/navigation/PageBackButton.tsx` — usa `router.back()` com fallback ou `href` direto; label “Voltar” visível no mobile |
| **Botão flutuante global** | `src/components/navigation/GlobalPageBack.tsx` — páginas sem header próprio |
| **Headers padronizados** | `AppPageHeader`, `SimpleAppHeader` |
| **Onde foi aplicado** | Biblioteca, cursos, audioterapia, leitor de PDF, sintomas, conta, pagamentos, trocar senha, chat conversacional, simulador |

**Regras:** rotas como `/chat`, `/simulador`, `/admin` e filhas de `/simulador/chat` não exibem o botão flutuante duplicado.

### 1.3 Sidebar e navegação principal

- Sidebar reorganizada com seções (`SidebarNavSection`, `nav-options`, `nav-folders`).
- Links para **Biblioteca**, **Cursos**, **Audioterapia**, **Simulador**, **Professor Paulo** (premium).
- Hook `use-mobile` para comportamento responsivo da sidebar.

### 1.4 Cards de produto e biblioteca

- `ProductOfferCard`: botão **“Acessar curso”** (antes “Assistir vídeo”), etiqueta dinâmica de mídia (ex.: “Vídeo, PDF e Áudio”).
- `LibraryContentGrid`, `LibraryItemTile`: layout alinhado ao catálogo.
- Páginas `/biblioteca`, `/cursos`, `/audioterapia` consumindo API `/api/catalog/products`.

---

## 2. Chat e IA

### 2.1 Chat principal (pesquisa — `/chat`)

- Continua via **`POST /api/openai`** → webhook **`N8N_CHAT_WEBHOOK_URL`** (fallback: `/webhook/chat-texto`).
- Toggle de tema no header do chat.
- Sessões persistidas como `ChatSession` tipo **SEARCH**.

### 2.2 Chat conversacional premium

| Modo | Rota | API | Webhook (env) |
|------|------|-----|----------------|
| **Simulador** | `/simulador` → `/simulador/chat?mode=…` | `POST /api/conversational-chat` | `N8N_SIMULADOR_WEBHOOK_URL` |
| **Professor Paulo** | `/prof` | idem | `N8N_PROFESSOR_PAULO_WEBHOOK_URL` |

**Arquivos:** `ConversationalChatPage`, `MedizChatV2Shell`, `src/lib/conversational-chat/*`.

**Funcionalidades:**
- Histórico de sessões por `chatKind` (SIMULADOR | PROF).
- Payload com idioma, `threadId`, e no simulador: `simulatorMode` (`terapeuta` | `experiencia`).
- Link **“Trocar modo de simulação”** e nova conversa retornando ao picker.

### 2.3 Simulador — tela de escolha de modo

| Botão | Modo | Mensagem inicial ao webhook |
|-------|------|------------------------------|
| **QUERO SIMULAR** | `terapeuta` | “Quero simular um atendimento como terapeuta” |
| **QUERO EXPLORAR** | `experiencia` | “Quero viver um atendimento” |

**Arquivos:**
- `src/components/simulador/SimuladorModePicker.tsx`
- `src/app/simulador/page.tsx`
- `src/app/simulador/chat/` (+ `SimuladorChatPageClient.tsx`)
- `src/lib/conversational-chat/simulator-modes.ts`

---

## 3. Biblioteca, PDF e mídia

### 3.1 Catálogo e entitlements

- Modelo **`CatalogProduct`** com seções BIBLIOTECA / CURSOS / AUDIOTERAPIA.
- **`ProductEntitlement`**: acesso por e-mail + produto (Hotmart, Stone, manual).
- Migração de permissões legadas (`library_permissions`) para entitlements.
- **`hasComplimentaryAccess`**: contas `@mediz.com` com acesso ampliado a cursos.
- Produtos **freeAccess** liberados para usuários logados.

### 3.2 Stream protegido de mídia

- URLs de mídia passam por token: **`GET /api/library/stream?token=…`**
- Bloqueio de acesso direto à barra de endereço (`sec-fetch-dest`).
- Suporte a arquivos locais (`public/biblioteca/`) e **Cloudflare R2**.
- **`pdf.js`** substituído por visualização via **blob URL + iframe/embed** (iOS) em `LibraryPdfViewer.tsx`.

### 3.3 Download de PDF com marca d’água

| Endpoint | Função |
|----------|--------|
| `POST /api/library/download/request` | Valida acesso, cota mensal, gera token |
| `GET /api/library/download/file?token=…` | PDF com watermark (nome, e-mail, CPF) |

**Regras:**
- Cota padrão: **3 downloads/mês** (`PDF_DOWNLOAD_MONTHLY_LIMIT`).
- Token de uso único (`pdf_download_tokens`).
- Auditoria em `pdf_downloads`.

**UI:** botão “Baixar PDF” no `LibraryDocumentViewer`.

### 3.4 Leitor de documentos

- `LibraryDocumentViewer`: PDF e vídeo em tela cheia, botão voltar, download PDF.
- Leitor unificado em `/biblioteca/leitor/[productId]`.

---

## 4. Cursos (vídeo + módulos)

### 4.1 Módulos de curso

- Tabelas **`CatalogCourseModule`** e **`CatalogModuleMedia`** (vídeo, PDF, áudio por módulo).
- Editor no admin: **`CourseModuleEditor`**, **`CourseMediaEditor`**.
- API admin: `GET/POST/PUT/DELETE /api/admin/catalog-products/[id]/modules`.
- Leitor: **`/cursos/leitor/[productId]`** com playlist de vídeos, PDF e áudio por módulo.

### 4.2 Layout mobile do leitor (UX)

- **Mobile:** cabeçalho → vídeo (16:9) → lista de módulos rolável abaixo.
- **Desktop:** menu à esquerda, player à direita.
- Player de curso via `AudioterapiaPlayer` com `fillContainer` e `frameAspect="video"`.

### 4.3 Entitlements de curso

- Cursos **VIDEO** e produtos **Stone** exigem `ProductEntitlement` individual.
- Hotmart mapeia produtos da biblioteca via `library-product-map` e `process-library-purchase`.
- Scripts: `grant-course-access.ts`, `check-course-access.ts`.

---

## 5. Audioterapia

- Páginas `/audioterapia`, `/audioterapia/[productId]`, `/audioterapia/[productId]/play`.
- Player dedicado **`AudioterapiaPlayer`** (áudio e vídeo, controles, prev/next).
- Upload de pacotes e mídia via admin (Cloudinary / R2).

---

## 6. Painel administrativo

### 6.1 Catálogo de produtos (`/admin/catalogo/produtos`)

- CRUD de produtos com capa, mídia, URLs de compra, Hotmart/Stone IDs.
- **`freeAccess`**, locale, `mediaItems` (JSON), índice PDF.
- Upload de mídia: **`/api/admin/catalog-products/upload-media`**, presign R2.
- Editor de **módulos de curso** integrado ao produto VIDEO.

### 6.2 Usuários (`/admin/users`)

- Lista com filtros (plano, provedor, datas).
- **Dark mode corrigido** na lista (hover/cards compatíveis com tema escuro).
- Edição: **`/admin/users/[id]/edit`**.

### 6.3 Bônus e liberação manual por produto

**Card “Bônus e produtos”** na edição do usuário:

| Categoria | Produtos listados individualmente |
|-----------|-----------------------------------|
| Audioterapia | Sim |
| PDF | Sim |
| Livro digital | Sim |
| Cursos (VIDEO) | Sim |

**Ações:**
- **Liberar** produtos selecionados (entitlement `source: manual`).
- **Revogar** liberações manuais (não revoga Hotmart/Stone/cortesia).

**API:** `GET/POST /api/admin/users/[id]/bonuses`  
**Lib:** `src/lib/admin/user-bonus-access.ts`, `UserBonusAccessCard.tsx`

### 6.4 Admin — tema escuro

- `ThemeToggle` no header do layout admin.
- Ajustes de contraste em tabelas, cards e filtros.

---

## 7. Pagamentos e webhooks

### 7.1 Hotmart

- Webhook **`POST /api/hotmart`**: compras, biblioteca, cursos, bônus.
- Notificação n8n **`mediz-novo-cliente`** via `notify-n8n-new-user` (payload: `temporary_password`, `products_granted`).
- Validação **hottok** (`validate-hottok.ts`).

### 7.2 Stone

- Webhook **`POST /api/stone/webhook`**: catálogo Stone → entitlements.
- Migration `course_entitlements_stone`.

### 7.3 Stripe

- Ajustes no webhook de assinatura (campos de período, logs).

### 7.4 Consulta de cliente (n8n / integrações)

**Novo:** `GET /api/webhooks/customer?email=…`  
- Autenticação: Bearer **`WEBHOOK_SECRET_TOKEN`**
- Retorna dados do usuário, assinatura, entitlements e permissões de biblioteca.
- Documentado em `DOCUMENTACAO-API.md`.

---

## 8. Conta do usuário

- **`/myAccount`**: CPF, nome completo, preferências.
- Campo **CPF** usado na marca d’água do PDF (`src/lib/cpf.ts`).
- API **`PATCH /api/user`**: atualização de perfil.

---

## 9. Banco de dados — migrations (junho 2026)

| Migration | Conteúdo |
|-----------|----------|
| `20260609120000_catalog_product_free_access` | Flag `freeAccess` no catálogo |
| `20260610120000_catalog_video_locale` | Locale em produtos vídeo |
| `20260611120000_pdf_downloads_watermark` | `pdf_downloads`, `pdf_download_tokens` |
| `20260615120000_course_entitlements_stone` | Entitlements Stone para cursos |
| `20260616120000_product_entitlements_grants` | Grants entre produtos |
| `20260617120000_catalog_product_external_ids` | IDs externos Hotmart/Stone |
| `20260618120000_chat_session_kind` | `ChatKind` (SEARCH, SIMULADOR, PROF) |
| `20260619120000_course_modules` | Módulos e mídia de curso |

---

## 10. Infraestrutura e qualidade

### 10.1 Armazenamento

- **Cloudflare R2** para mídia de catálogo (`src/lib/r2.ts`, `upload-r2.ts`).
- Política de mídia: `r2-media-policy.ts`, proxy de upload.

### 10.2 Scripts úteis

| Script | Uso |
|--------|-----|
| `npm run check:deploy` | TypeScript + ESLint + Prisma antes do deploy |
| `grant-course-access.ts` | Liberar curso manualmente |
| `check-course-access.ts` | Diagnosticar acesso a curso |
| `migrate-library-permissions-to-entitlements.ts` | Migração legado → entitlements |
| `sync-catalog-purchase-mapping.ts` | Sincronizar mapeamento de compras |

### 10.3 Dependências novas relevantes

- `pdfjs-dist` (worker em `public/pdf.worker.min.mjs`; visualização atual usa blob + iframe).
- Integrações R2 via AWS SDK.

---

## 11. Variáveis de ambiente novas / importantes

```env
# Chat
N8N_CHAT_WEBHOOK_URL=
N8N_SIMULADOR_WEBHOOK_URL=
N8N_PROFESSOR_PAULO_WEBHOOK_URL=

# Mídia / biblioteca
R2_PUBLIC_URL=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
LIBRARY_MEDIA_TOKEN_SECRET=
PDF_DOWNLOAD_TOKEN_SECRET=
PDF_DOWNLOAD_MONTHLY_LIMIT=3

# Webhooks
WEBHOOK_SECRET_TOKEN=
HOTMART_HOTTOK=

# Stone (catálogo)
# IDs configurados por produto no admin
```

---

## 12. Commits de referência (git)

| Data | Commit | Descrição resumida |
|------|--------|------------------|
| 2026-06-01 | `e1822f8` | Repositório base / estrutura |
| 2026-06-11 | `1200d59` | Catálogo, R2, stream, biblioteca |
| 2026-06-15 | `f7c39ff` | Entitlements, PDF download, chat conversacional, navegação |
| 2026-06-17 | `8c376fe` | Módulos de curso, admin |
| 2026-06-18 | `63b425e` | Cursos, entitlements cortesia, UI cards |
| 2026-06-18 | `e4ddca1` | API webhook customer |
| 2026-06-23 | `7215444` | Simulador modo picker, PDF viewer, admin bônus, dark fixes |

---

## 13. Itens conhecidos / notas operacionais

1. **PDF no iOS:** visualização usa `embed` quando detectado iPhone/iPad; em alguns casos o Safari limita PDF embutido — fallback é recarregar ou usar download.
2. **Deploy:** rodar `npm run check:deploy` antes de `npm run build`.
3. **Migrations:** `npx prisma migrate deploy` em produção após deploy do schema.
4. **n8n simulador:** workflow deve ler `simulatorMode` / `simulator_mode` no payload.

---

*Documento gerado em 23/06/2026. Atualize este arquivo a cada release significativa.*
