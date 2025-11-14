# Documentação: Novas Regras de Uso para o Plano Gratuito

## 📋 Visão Geral

Este documento descreve em detalhes a implementação das novas regras de uso dinâmicas para usuários do plano gratuito no sistema ExemploApp. As regras afetam o limite de pesquisas diárias e a visualização do conteúdo com base no tempo desde o cadastro do usuário. Adicionalmente, foi implementado um pop-up de engajamento entre pesquisas.

## 🎯 Objetivos da Implementação

1. Implementar regras dinâmicas de limite de pesquisas baseadas no período desde o cadastro do usuário
2. Criar visualização parcial do conteúdo com efeito blur para períodos específicos
3. Desenvolver um pop-up configurável para exibição entre pesquisas
4. Manter a experiência completa para usuários de planos pagos

## 🔄 Regras Dinâmicas Implementadas

| Período (desde o cadastro) | Limite de Pesquisas Diárias | Visualização do Conteúdo |
|---------------------------|----------------------------|--------------------------|
| Do 1º ao 7º dia          | 3 pesquisas/dia            | Completa: Todas as abas são exibidas normalmente |
| Do 8º ao 30º dia         | 3 pesquisas/dia            | Parcial: A partir da aba "Símbolos Biológicos", o conteúdo é truncado e exibido com blur |
| A partir do 31º dia      | 1 pesquisa/dia             | Parcial: Mesmo comportamento do período anterior |

## 🧩 Componentes Criados

### 1. Utilitários de Período de Usuário
**Arquivo:** `src/lib/userPeriod.ts`
- `getUserPeriod(createdAt: Date)`: Determina o período do usuário com base na data de cadastro
- `getUserLimits(period: UserPeriod)`: Retorna os limites específicos para cada período

### 2. Componentes de Visualização Parcial
**Arquivo:** `src/components/BlurredContent.tsx`
- `BlurredContent`: Componente que trunca conteúdo e aplica efeito de blur
- `BlurredAccordionContent`: Versão especializada para uso em acordeões

### 3. Pop-up Entre Pesquisas
**Arquivo:** `src/components/PromotionPopup.tsx`
- Componente de diálogo modal que exibe conteúdo promocional configurável
- Suporta imagem, conteúdo em Markdown, e botões de assinatura e fechamento

## 📊 Modelos de Dados

### 1. Enum de Status do Pop-up
```prisma
enum PopupStatus {
  ACTIVE
  INACTIVE
}
```

### 2. Modelo de Configuração do Pop-up
```prisma
model PopupConfig {
  id               String       @id @default(uuid())
  title            String
  content          String       @db.Text
  imageUrl         String?
  subscribeLink    String
  status           PopupStatus  @default(ACTIVE)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
}
```

## 🔌 APIs Implementadas

### 1. API de OpenAI Atualizada
**Arquivo:** `src/app/api/openai/route.ts`
- Verifica o período do usuário baseado na data de cadastro
- Aplica limite de pesquisas de acordo com o período
- Retorna informações sobre o período e visualização para o frontend
- Indica quando o pop-up deve ser exibido

### 2. API de Gerenciamento do Pop-up
**Arquivo:** `src/app/api/popup/route.ts`
- `GET`: Busca a configuração ativa do pop-up
- `POST`: Cria ou atualiza configurações do pop-up (acesso restrito)

## 🖥️ Alterações no Frontend

### 1. Componente de Resultado
**Arquivo:** `src/app/chat/result.tsx`
- Modificado para aplicar visualização parcial com blur nas abas após "Símbolos Biológicos"
- Aceita parâmetros de período e tipo de visualização

### 2. Página Principal
**Arquivo:** `src/app/chat/page.tsx`
- Atualizada para processar informações do período do usuário da API
- Integra o pop-up entre pesquisas
- Controla a exibição do conteúdo com base no período do usuário

## 🔍 Como as Regras São Aplicadas

1. **Verificação de Assinatura**: O sistema primeiro verifica se o usuário possui uma assinatura ativa
2. **Determinação do Período**: Para usuários do plano gratuito, o sistema calcula os dias desde o cadastro
3. **Aplicação de Limites**: Com base no período, aplica o limite de pesquisas diárias apropriado
4. **Controle de Visualização**: O frontend recebe a informação sobre o tipo de visualização e aplica o efeito de blur quando necessário
5. **Pop-up de Engajamento**: Após concluir uma pesquisa, o sistema exibe o pop-up configurável para usuários do plano gratuito

## 📝 Migrações do Banco de Dados

Foi criada a migração `20250929143000_add_popup_config` que adiciona:
- Enum `PopupStatus`
- Tabela `PopupConfig`

## 🛠️ Como Testar

Para testar as diferentes regras, você pode:

1. **Teste de usuário novo (1-7 dias)**:
   - Crie um novo usuário e verifique que ele tem 3 pesquisas diárias e visualização completa

2. **Teste de usuário intermediário (8-30 dias)**:
   - Modifique a data de criação de um usuário para estar entre 8-30 dias atrás
   - Verifique que ele tem 3 pesquisas diárias e visualização parcial

3. **Teste de usuário antigo (31+ dias)**:
   - Modifique a data de criação para mais de 31 dias atrás
   - Verifique que ele tem apenas 1 pesquisa diária e visualização parcial

4. **Teste do pop-up**:
   - Configure um pop-up através da API
   - Faça uma pesquisa com um usuário do plano gratuito
   - Verifique se o pop-up aparece após a pesquisa ser concluída

## 🔒 Segurança e Considerações

- A API de configuração do pop-up tem verificação básica de autorização
- Os limites são aplicados no backend para evitar manipulação no cliente
- Os dados de período do usuário são calculados em tempo real para evitar inconsistências

## 📈 Próximos Passos

1. Implementar um painel administrativo para gerenciar as configurações do pop-up
2. Adicionar análises para monitorar a conversão de usuários gratuitos para pagos
3. Refinar os critérios de blur/truncamento baseado em feedback dos usuários
4. Implementar testes A/B para otimizar as mensagens de conversão
