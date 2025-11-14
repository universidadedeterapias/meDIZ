# Guia Rápido: Painel Administrativo ExemploApp

Este guia fornece instruções rápidas para acessar e usar o painel administrativo do ExemploApp.

## Acesso ao Painel

1. **URL**: [http://localhost:3000/admin-login](http://localhost:3000/admin-login) (em desenvolvimento)

2. **Credenciais**:
   - **Email**: admin.exemplo@exemplo.com
   - **Senha**: Admin123!

3. **Requisitos**: O email do administrador deve terminar com `@exemplo.com`

## Funcionalidades Disponíveis

O painel administrativo permite gerenciar as seguintes funcionalidades:

### 1. Pop-ups de Engajamento
- Configurar mensagens promocionais entre pesquisas para usuários do plano gratuito
- Ativar/desativar pop-ups
- Personalizar título, conteúdo e link de assinatura

### 2. Configurações do Sistema
- Gerenciar regras de limitação para o plano gratuito
- Configurar efeito de blur e truncamento para conteúdo limitado
- Ajustar períodos e limites de pesquisa

### 3. Testes A/B
- Criar e monitorar testes A/B para otimizar mensagens de conversão
- Analisar desempenho de diferentes variantes
- Aplicar automaticamente a variante mais eficaz

### 4. Análises
- Visualizar métricas de conversão de plano gratuito para pago
- Monitorar engajamento dos usuários
- Analisar eficácia das mensagens promocionais

## Resolução de Problemas

Se encontrar dificuldades para acessar o painel:

1. **Verifique o servidor**: Certifique-se de que o servidor está em execução com `npm run dev`

2. **Recrie o usuário admin**:
   ```bash
   npm run ensure-admin
   ```
   
3. **Verifique os logs**:
   - Os logs do middleware mostram informações de autenticação
   - Acesse a rota de debug: `/api/auth-debug` para verificar o estado da autenticação

4. **Limpe os cookies**:
   - Tente usar uma janela anônima/privativa
   - Limpe os cookies do navegador para remover sessões antigas

## Atalhos e URLs Importantes

- `/admin` - Dashboard principal
- `/admin/popup` - Gerenciamento de pop-ups
- `/admin/settings` - Configurações do sistema
- `/admin/ab-testing` - Testes A/B
- `/admin/analytics` - Análises e métricas
- `/admin/users` - Gerenciamento de usuários (futura implementação)
- `/admin/support` - Suporte (futura implementação)

---

*Última atualização: Outubro de 2025*