# Refatoração de experiência, identidade e arquitetura — meDIZ

**Data:** 28 de junho de 2026  
**Escopo:** auditoria estática brownfield do front-end, fluxos principais e arquitetura de APIs  
**Método:** AIOX UX Design Expert (`*audit`, modo autônomo) + AIOX Architect (análise brownfield)

## 1. Resumo executivo

O problema do meDIZ não é apenas “visual antigo”. O produto cresceu por páginas, correções locais e novas opções de menu, sem uma estrutura única de experiência e sem um sistema visual realmente governante.

Hoje existem três produtos parcialmente sobrepostos:

1. uma busca de sintomas apresentada como chat;
2. um acervo de livros, áudios e cursos;
3. uma área profissional e administrativa.

Eles compartilham componentes técnicos, mas não uma narrativa de produto consistente. O resultado é uma interface com aparência de template: Geist, componentes shadcn quase padrão, muitos cards, gradientes roxo/índigo, badges, ícones Lucide e mensagens com emojis. A marca disponível nos assets é verde e roxa, enquanto a interface principal é índigo, amarela e violeta. Em várias telas o logotipo oficial é substituído por texto estilizado manualmente.

A refatoração deve começar por jornadas e arquitetura, e não pela troca isolada de cores. Um “reskin” manteria os problemas de cadastro, onboarding, navegação, carregamento e feedback.

## 2. Evidências do inventário

As métricas abaixo são contagens estáticas aproximadas e servem para dimensionar inconsistência e acoplamento:

| Indicador | Resultado |
|---|---:|
| Páginas | 47 |
| Páginas client-side | 43 de 47 |
| Rotas de API | 111 |
| Componentes base em `components/ui` | 29 |
| Ocorrências de botões | 278 |
| Ocorrências relacionadas a cards | 490 |
| Chamadas `fetch` no front | 145 |
| `useEffect` no front | 90 |
| Utilitários Tailwind de cor distintos | 247 |
| Utilitários de radius distintos | 14 |
| Utilitários de sombra distintos | 10 |
| Gradientes | 40 |
| `alert()` | 43 |
| Rotas de API com indício de validação Zod | 7 de 111 |
| `loading.tsx`, `error.tsx`, `not-found.tsx` | 0 |
| Especificações Cypress | 0 |

Arquivos que concentram risco:

- `src/app/admin/catalogo/produtos/page.tsx`: aproximadamente 1.357 linhas;
- `src/app/api/hotmart/route.ts`: aproximadamente 968 linhas;
- `src/components/nav-folders.tsx`: aproximadamente 963 linhas;
- `src/app/admin/users/page.tsx`: aproximadamente 951 linhas;
- `src/app/admin/reminders/page.tsx`: aproximadamente 903 linhas;
- `src/app/chat/page.tsx`: aproximadamente 541 linhas.

## 3. Diagnóstico de identidade visual

### 3.1 Por que o produto parece gerado por IA

- Usa a estética padrão de dashboard SaaS: cards arredondados, sombra, borda, fundo cinza e ícones lineares.
- O índigo padrão do shadcn/Tailwind aparece como identidade principal, mas não deriva do logotipo oficial.
- Gradientes roxo/índigo, badges “NOVO”, animações `pulse`/`ping` e emojis competem por atenção.
- A fonte Geist e os componentes base quase sem direção própria aproximam o app de milhares de templates Next.js.
- A marca é escrita manualmente de formas diferentes (`meDIZ!`) em vez de usar consistentemente o asset oficial.
- A imagem promocional atual usa ícone 3D genérico, emoji e composição típica de material gerado rapidamente.
- As telas comunicam estados principalmente mudando cor ou abrindo `alert()` nativo, sem linguagem de interação própria.

### 3.2 Direção de identidade recomendada

Hipótese de direção: **“escuta que organiza”** — humana, serena e clara. A identidade deve transmitir acolhimento sem parecer clínica, esotérica ou tecnológica demais.

Princípios:

- **Marca antes do framework:** partir do verde e roxo do logotipo, após validar que o logo atual será mantido.
- **Calor controlado:** neutros levemente quentes, superfícies menos azuladas e contraste confortável.
- **Menos contêineres:** usar hierarquia tipográfica, espaço e divisores; card somente quando houver agrupamento real.
- **Forma reconhecível:** uma linguagem própria para curvas, divisores, ícones e ilustrações; não misturar dezenas de radius.
- **Ilustração humana:** traço autoral inspirado em corpo, voz, escuta e movimento; remover 3D genérico e emojis promocionais.
- **Movimento funcional:** animação para explicar progresso, mudança de estado e continuidade — não para decorar badges.
- **Texto humano e direto:** retirar tom promocional excessivo durante tarefas sensíveis e explicar claramente o que acontecerá.

Papéis semânticos sugeridos para a paleta, ainda sujeitos à validação de marca:

- roxo: ação principal, descoberta e insight;
- verde: progresso, conteúdo disponível e confirmação;
- neutros quentes: superfícies e leitura longa;
- amarelo/âmbar: atenção real, não ornamento do logotipo em toda tela;
- vermelho: erro ou risco, nunca upsell.

## 4. Diagnóstico dos fluxos

### 4.1 Entrada, cadastro e confirmação

O cadastro cria o usuário, cria um token e tenta enviar WhatsApp. Quando o envio falha, retorna `201`, redireciona para outra tela, atualiza novamente o telefone, cria outro token e tenta novamente. O usuário vê etapas diferentes para a mesma operação.

Além disso:

- `emailVerified` representa confirmação por WhatsApp, criando ambiguidade de domínio;
- o login por senha não bloqueia usuário não confirmado;
- a URL de confirmação local pode apontar para produção;
- a atualização pública de WhatsApp aceita apenas e-mail e telefone;
- erros do provedor chegam aos logs com credenciais;
- tokens novos são criados antes de confirmar que o envio ocorreu;
- não existe estado visível como `pending`, `sent`, `failed`, `confirmed`.

Fluxo proposto:

1. usuário informa e-mail, senha e canal de confirmação;
2. servidor cria conta pendente e uma solicitação idempotente de confirmação;
3. envio é registrado em outbox/fila, separado da transação HTTP;
4. tela única exibe estado real do envio, telefone mascarado, reenvio e edição segura;
5. reenvio reaproveita ou substitui de forma controlada o token anterior;
6. confirmação marca explicitamente `contactVerifiedAt` ou campo equivalente;
7. regras de acesso são aplicadas no servidor, não apenas na interface.

### 4.2 Onboarding

Para chegar à busca, o usuário precisa preencher nome, WhatsApp, idade, gênero, profissão, tipo de uso e descrição. Profissionais ainda recebem mais quatro perguntas. O chat detecta campos ausentes e força `/form` antes de entregar valor.

Problemas:

- coleta extensa antes do primeiro benefício;
- campos sem justificativa contextual;
- informações potencialmente sensíveis tratadas como requisito técnico;
- submissão do formulário avança para sucesso mesmo sem verificar `response.ok`;
- o onboarding não diferencia claramente pessoa usuária e profissional desde o início.

Fluxo proposto:

1. perguntar objetivo principal e tipo de uso;
2. pedir somente dados indispensáveis para personalizar a primeira resposta;
3. entregar a primeira experiência útil;
4. coletar dados adicionais progressivamente, explicando benefício e uso;
5. permitir retomar onboarding incompleto sem bloquear todo o app, salvo requisito jurídico ou funcional real.

### 4.3 Busca apresentada como chat

A tela principal se chama chat, mas a interação dominante é uma busca de sintoma. Cada envio limpa respostas anteriores, o histórico está desativado na sidebar e a interface mistura input de busca, cards de resposta, PDF, pastas e popup de limite.

É necessário escolher um modelo:

- **Busca guiada:** consulta pontual, resultado estruturado, refinamentos e ações de salvar; ou
- **Conversa real:** continuidade, mensagens, contexto, histórico e follow-ups.

O comportamento atual se aproxima mais de busca guiada. Manter aparência de chat sem continuidade cria expectativa errada.

Jornada recomendada:

1. início com uma pergunta clara e exemplos discretos;
2. pesquisa com estado de processamento informativo;
3. resultado estruturado em resumo, possíveis leituras, próximos passos e alertas;
4. ações secundárias de aprofundar, salvar e compartilhar;
5. histórico pesquisável com nomes compreensíveis;
6. upsell somente quando ligado ao valor bloqueado, preservando o contexto da consulta.

Para conteúdo de saúde e bem-estar, o resultado deve distinguir educação de diagnóstico, comunicar limites e apresentar sinais de confiança de maneira consistente.

### 4.4 Navegação e arquitetura de informação

A sidebar possui muitas seções, badges “NOVO”, item “EM BREVE”, recursos premium, pastas, dashboard, suporte e conta. Recursos com maturidades diferentes recebem peso parecido.

Arquitetura sugerida:

1. **Início/Pesquisar** — ação principal, recentes e retomada;
2. **Salvos** — consultas e pastas;
3. **Acervo** — livros, audioterapias e cursos em uma estrutura com filtros ou abas;
4. **Para profissionais** — área contextual, exibida para o segmento correto;
5. **Conta** — perfil, assinatura, notificações, idioma, aparência e suporte.

No mobile, priorizar navegação inferior para três ou quatro destinos principais. A sidebar pode permanecer no desktop. Recursos ainda indisponíveis não devem ocupar navegação primária.

### 4.5 Premium e interrupções

- O upsell aparece em menu, modal, redirecionamento e popup.
- Ao atingir limite, o chat executa navegação durante renderização.
- A compra abre domínio externo sem sempre preparar o usuário para saída e retorno.
- Notificações são solicitadas no layout global, antes de um momento claro de valor.

Recomendação: uma política única de monetização e permissões. Cada bloqueio precisa explicar benefício, preservar contexto e oferecer retorno confiável após compra. Permissão de push deve ser pedida após uma ação que demonstre por que o lembrete será útil.

## 5. Arquitetura front-end proposta

### 5.1 Separar áreas por layout

Estrutura alvo:

```text
src/app/
  (public)/
    login/
    signup/
    confirmacao/
  (app)/
    layout.tsx        # autenticação no servidor + shell do produto
    inicio/
    pesquisar/
    salvos/
    acervo/
    conta/
  (admin)/
    admin/
```

Route groups não alteram URLs. O objetivo é impedir que páginas públicas montem providers e efeitos do app autenticado.

### 5.2 Voltar a usar o App Router como arquitetura de servidor

Hoje 43 de 47 páginas são client-side. O shell, autenticação, dados iniciais e redirects devem ocorrer no servidor. Componentes client devem ficar limitados a interação, mídia e estado transitório.

Resultados esperados:

- menos flashes e redirects client-side;
- menos `401` durante montagem;
- menos `useEffect` para carregar o estado inicial;
- melhor carregamento e boundaries reais;
- componentes menores e testáveis.

### 5.3 Organizar por feature

```text
src/features/
  auth/
  onboarding/
  search/
  saved/
  catalog/
  subscription/
  account/

src/components/
  ui/                # átomos
  patterns/          # field, empty-state, feedback, page-shell
  brand/             # logo, ilustrações, elementos de identidade
```

Cada feature deve concentrar schema, componentes, casos de uso, tipos e testes. Páginas apenas compõem features.

### 5.4 Estado remoto e cache

O código usa contextos globais, cache em variável de módulo, `localStorage`, polling de 100 ms e fetches duplicados para usuário e assinatura. Isso deve ser substituído por uma política única:

- dados iniciais carregados no servidor;
- cache de servidor com invalidação explícita quando aplicável;
- um único recurso de sessão/perfil no cliente;
- mutações com resposta tipada e atualização previsível;
- polling somente para operações realmente assíncronas, com visibilidade e backoff.

### 5.5 Feedback e estados

Criar padrões comuns para:

- carregamento de página e carregamento inline;
- estado vazio;
- erro recuperável e erro fatal;
- confirmação de ação;
- operação pendente;
- permissão negada;
- conteúdo bloqueado por plano.

Remover `alert()` e evitar redirects dentro do render. Adicionar `loading.tsx`, `error.tsx` e `not-found.tsx` nos segmentos relevantes.

## 6. Design system alvo

### 6.1 Tokens

Tokens semânticos obrigatórios:

- cor: canvas, surface, elevated, text, text-muted, action, success, warning, danger, info;
- tipografia: display, title, body, label, caption, numeric;
- espaço: escala pequena e estável;
- radius: no máximo quatro papéis;
- sombra: no máximo três níveis;
- motion: duração e easing por finalidade;
- layout: largura de leitura, largura de formulário e largura de aplicação.

Classes diretas como `text-indigo-600`, `bg-green-500` e gradientes não devem aparecer em features, salvo exceção documentada. Features usam tokens.

### 6.2 Componentes prioritários

1. Button e IconButton;
2. Field completo: label, ajuda, erro e estado;
3. SearchField;
4. PageShell e PageHeader;
5. Feedback/Notice;
6. EmptyState e ErrorState;
7. ResultSection;
8. ContentCard e ContentListItem;
9. UpgradePrompt;
10. AsyncStatus;
11. navegação desktop e mobile;
12. modal/sheet responsivo.

Componentes devem atender WCAG AA. Hoje o viewport desabilita zoom e o `Input` base remove o anel de foco, ambos incompatíveis com essa meta.

## 7. Arquitetura back-end e fluxos internos

### 7.1 Rotas finas, casos de uso explícitos

Rotas grandes devem ser separadas em:

```text
src/server/
  modules/
    auth/
    users/
    search/
    catalog/
    purchases/
    notifications/
  integrations/
    hotmart/
    stripe/
    whatsapp/
    n8n/
  jobs/
  observability/
```

A route handler deve apenas autenticar, validar, chamar um caso de uso e transformar o resultado em HTTP.

### 7.2 Contrato único de API

Adotar schemas de entrada e saída para todas as rotas e um envelope consistente:

```json
{
  "data": {},
  "error": null,
  "meta": { "requestId": "..." }
}
```

Erros precisam de código estável, mensagem segura e `fieldErrors` quando aplicável. Mensagens de provedores e credenciais nunca devem chegar ao cliente ou aos logs sem sanitização.

### 7.3 Autenticação e autorização

- proteger todo o layout `(app)` no servidor;
- centralizar autorização de usuário e admin;
- substituir autorização administrativa por domínio de e-mail por papel/permissão persistida;
- aplicar a mesma política em página, API e job;
- definir explicitamente o efeito de conta não confirmada;
- remover endpoint público de alteração de WhatsApp por e-mail.

### 7.4 Operações assíncronas

WhatsApp, notificações, PDFs pesados e integrações de compra devem expor estados e idempotência. O padrão recomendado é:

```text
request -> validação/transação -> outbox/job -> provedor externo
                                  |
                                  -> status consultável/retry controlado
```

Isso evita que disponibilidade de Z-API, n8n ou Hotmart determine a consistência da conta local.

### 7.5 Observabilidade

Remover logs temporários e chamadas de debug para `127.0.0.1` presentes no código de PDF. Padronizar:

- request ID;
- evento e duração;
- usuário anonimizado quando necessário;
- código de erro estável;
- redaction de PII e segredos;
- métricas de falha por integração;
- tracing dos journeys de cadastro, pesquisa e compra.

## 8. Métricas de produto necessárias

O app possui analytics administrativos, mas não há evidência suficiente de instrumentação dos journeys. Antes de validar um redesign, medir:

- cadastro iniciado -> conta criada -> confirmação enviada -> confirmação concluída;
- login -> onboarding iniciado -> onboarding concluído -> primeira pesquisa;
- tempo até primeira resposta útil;
- falha e abandono por etapa;
- pesquisa -> salvar -> retornar ao salvo;
- exposição de paywall -> checkout -> retorno -> acesso liberado;
- uso de biblioteca, áudio e curso por segmento;
- erros de front e API por jornada.

Sem isso, decisões de UX serão opiniões. A auditoria de código identifica problemas, mas entrevistas, analytics reais e testes com usuários continuam necessários.

## 9. Roadmap de migração

### Fase 1 — Fundamentos sem reskin amplo

- confirmar posicionamento, segmentos e marca que será preservada;
- instrumentar funis críticos;
- definir tokens semânticos e padrões de feedback;
- criar route groups e layout autenticado no servidor;
- corrigir segurança e consistência do cadastro/WhatsApp;
- definir contratos de API e estratégia de erros;
- criar smoke tests dos journeys críticos.

**Gate:** fluxos atuais continuam funcionando, sem regressão visual relevante.

### Fase 2 — Journey piloto

Migrar ponta a ponta:

1. login/cadastro/confirmação;
2. onboarding progressivo;
3. início/pesquisa/resultado;
4. salvar e recuperar uma consulta.

Essa fase valida identidade, componentes e arquitetura antes de espalhá-los.

**Gate:** acessibilidade, responsividade, sucesso funcional e métricas comparáveis ao baseline.

### Fase 3 — Produto autenticado

- consolidar biblioteca, audioterapia e cursos em Acervo;
- migrar conta, assinatura, notificações e suporte;
- implementar navegação mobile e desktop final;
- eliminar caches/fetches locais redundantes;
- decompor páginas e componentes gigantes.

**Gate:** componentes antigos sem novos consumidores e cobertura dos journeys principais.

### Fase 4 — Admin, integrações e enforcement

- refatorar admin como sistema operacional, separado da estética de consumo;
- decompor Hotmart, PDFs, usuários e lembretes em módulos/casos de uso;
- padronizar schemas de todas as APIs;
- adicionar testes de contrato, integração e E2E;
- bloquear novas cores, spacing e componentes fora do sistema;
- remover componentes e estilos legados.

**Gate:** build, lint, typecheck, testes e auditoria de acessibilidade obrigatórios no CI.

## 10. Priorização

### P0 — antes do redesign amplo

- corrigir confirmação por WhatsApp, autorização e exposição de token;
- proteger área autenticada no servidor;
- impedir efeitos globais em páginas públicas;
- corrigir submissões que ignoram falha HTTP;
- remover debug de produção e desabilitação de zoom;
- estabelecer eventos de funil e baseline.

### P1 — maior impacto percebido

- identidade e tokens;
- auth/onboarding;
- pesquisa/resultado/salvos;
- feedback, erros e loading;
- navegação simplificada.

### P2 — retenção e monetização

- Acervo consolidado;
- assinatura e retorno de checkout;
- notificações contextuais;
- conta e suporte.

### P3 — escala operacional

- admin;
- integrações e jobs;
- contratos completos;
- enforcement e remoção do legado.

## 11. Decisões que precisam ser tomadas antes da implementação visual

1. O logotipo verde/roxo atual será mantido, evoluído ou substituído?
2. O produto principal é busca guiada ou conversa contínua?
3. Qual segmento é prioritário: uso pessoal, profissional ou ambos com experiências diferentes?
4. Quais dados do onboarding são realmente indispensáveis antes da primeira consulta?
5. Biblioteca, áudio e cursos são produtos independentes ou formatos de um único Acervo?
6. Qual métrica define sucesso da refatoração: ativação, retenção, compra, recorrência de pesquisa ou outra?

## 12. Conclusão

A recomendação é evitar uma reescrita total e evitar um reskin página a página. O caminho de menor risco é criar uma fundação visual e arquitetural, validar em um journey completo e migrar progressivamente.

O primeiro recorte de implementação deve ser **cadastro -> onboarding -> primeira pesquisa -> resultado -> salvar**, porque atravessa identidade, navegação, estado, APIs, segurança e valor principal do produto. Se esse recorte ficar sólido, o restante do app passa a ter um padrão real para seguir.
