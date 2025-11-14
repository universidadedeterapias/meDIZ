# Guia de Acesso ao Painel Administrativo ExemploApp

Este guia explica como acessar e utilizar o painel administrativo do ExemploApp, incluindo a resolução de problemas comuns e os requisitos de acesso.

## 1. Requisitos de Acesso

### 1.1. Permissões Necessárias

Para acessar o painel administrativo, você deve:

- Ter uma conta de usuário no sistema ExemploApp
- Ter um email com o domínio `@exemplo.com`
- Estar autenticado no sistema

> **Nota importante:** Esta é uma restrição de segurança intencional. Apenas emails que terminam com `@exemplo.com` têm permissão para acessar o painel administrativo.

### 1.2. Navegadores Suportados

O painel foi testado e funciona corretamente nos seguintes navegadores:

- Google Chrome (versão 90+)
- Mozilla Firefox (versão 90+)
- Microsoft Edge (versão 90+)
- Safari (versão 14+)

## 2. Como Acessar o Painel

### 2.1. Acesso Direto

1. Navegue até `https://[seu-dominio]/admin`
2. Se você já estiver autenticado com uma conta admin, será direcionado diretamente para o painel
3. Caso contrário, será redirecionado para a página de login

### 2.2. Página de Login Específica

Para um login direcionado ao painel administrativo:

1. Navegue até `https://[seu-dominio]/admin-login`
2. Insira suas credenciais de administrador (email com domínio `@exemplo.com`)
3. Clique em "Entrar"

### 2.3. Verificação de Autenticação

Para verificar se você está autenticado como administrador:

1. Acesse `https://[seu-dominio]/auth-test`
2. Esta página mostrará seu status de autenticação e se você tem acesso de administrador

## 3. Criando um Usuário Admin

Se você precisar criar um novo usuário administrador, siga estas etapas:

### 3.1. Usando o Script de Criação

```bash
# Na pasta raiz do projeto
npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts
```

Este script:
- Verifica se já existem usuários admin
- Se não existir, cria um usuário admin padrão com email `admin@exemplo.com`
- Exibe a senha temporária gerada (deve ser alterada após o primeiro login)

### 3.2. Usando o Prisma Studio

1. Execute o Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. No navegador que abrir, clique na tabela `User`
3. Clique em "Add record" (ou edite um usuário existente)
4. Defina o email como `[nome]@exemplo.com`
5. Preencha os outros campos necessários
6. Clique em "Save" para salvar as alterações

## 4. Estrutura do Painel Administrativo

### 4.1. Seções Principais

O painel administrativo está organizado nas seguintes seções:

- **Dashboard**: Visão geral e links rápidos
- **Pop-ups**: Gerenciamento de pop-ups entre pesquisas
- **Usuários**: Gerenciamento de usuários do sistema
- **Configurações**: Configurações gerais, incluindo efeito blur
- **Testes A/B**: Gerenciamento de testes A/B para conversão
- **Análises**: Métricas e estatísticas de conversão

### 4.2. Navegação

- Barra lateral: Navegação principal entre as seções
- Cabeçalho: Mostra o título da página atual e informações do usuário
- Links de acesso rápido: Disponíveis na página do Dashboard

## 5. Resolução de Problemas

### 5.1. Não consigo acessar o painel admin

**Verificações:**

1. **Autenticação:**
   - Certifique-se de estar logado no sistema
   - Verifique se seu email termina com `@exemplo.com`
   - Tente fazer logout e login novamente

2. **Cookies e Sessão:**
   - Verifique se os cookies estão habilitados no seu navegador
   - Limpe os cookies e cache do navegador

3. **Verificação de API:**
   - Acesse `https://[seu-dominio]/api/auth-debug` para verificar seu status de autenticação
   - Verifique se a API retorna `isAdmin: true`

### 5.2. Erros de Rendering

Se encontrar erros de renderização:

1. **Atualize a página**: Alguns erros podem ser temporários
2. **Verifique a Console do navegador**: Procure erros específicos
3. **Teste a página de diagnóstico**: Acesse `https://[seu-dominio]/admin/test-layout`
4. **Verifique compatibilidade do navegador**: Tente usar um navegador diferente

### 5.3. Erros no middleware

Se o middleware estiver causando redirecionamentos inesperados:

1. Acesse `https://[seu-dominio]/middleware-test` para verificar o comportamento
2. Verifique se o cookie de sessão está presente
3. Confirme que o token JWT está sendo lido corretamente

## 6. Segurança

### 6.1. Práticas Recomendadas

- **Altere a senha após o primeiro login**: Especialmente se foi criada por um script
- **Use senhas fortes**: Combine letras, números e símbolos
- **Não compartilhe credenciais**: Cada administrador deve ter sua própria conta
- **Termine a sessão ao finalizar**: Clique em "Sair" ou feche o navegador

### 6.2. Logs de Acesso

Os acessos ao painel administrativo são registrados para fins de segurança. Os logs incluem:

- Data e hora do acesso
- Usuário que realizou o acesso
- Ações executadas
- Endereço IP de origem

## 7. Perguntas Frequentes

**P: Posso mudar o domínio de email necessário para acesso administrativo?**

R: Sim, isso pode ser modificado no arquivo `middleware.ts` e `layout.tsx` do admin, alterando a verificação de `@exemplo.com` para outro domínio.

**P: O que fazer se esquecer a senha de admin?**

R: Use o Prisma Studio para redefinir a senha ou crie um novo usuário admin.

**P: Posso ter múltiplos administradores?**

R: Sim, basta criar mais usuários com o domínio de email `@exemplo.com`.

**P: Como mudar meu email para o formato admin?**

R: Use o Prisma Studio para editar o campo de email do usuário para incluir o domínio `@exemplo.com`.

## 8. Suporte Técnico

Se você continuar enfrentando problemas ou tiver dúvidas adicionais:

- Consulte os logs do servidor para mensagens de erro específicas
- Verifique a documentação adicional em `/docs`
- Entre em contato com a equipe de suporte técnico

---

**Data da última atualização:** 6 de outubro de 2025
