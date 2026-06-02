# 🐛 Troubleshooting Docker - meDIZ

## ❌ Erro: "dockerDesktopLinuxEngine: O sistema não pode encontrar o arquivo especificado"

### Problema
O Docker Desktop não está rodando no Windows.

### Solução

1. **Abrir Docker Desktop:**
   - Procure por "Docker Desktop" no menu Iniciar
   - Clique para abrir
   - Aguarde até aparecer "Docker Desktop is running" na bandeja do sistema

2. **Verificar se está rodando:**
   ```powershell
   docker ps
   ```
   Se funcionar, o Docker está rodando!

3. **Tentar novamente:**
   ```powershell
   docker compose -f docker-compose.dev.yml up -d postgres redis
   ```

---

## ⚠️ Warning: "the attribute `version` is obsolete"

### Problema
O Docker Compose mais recente não precisa mais do campo `version`.

### Solução
Já foi corrigido! Os arquivos `docker-compose.yml` e `docker-compose.dev.yml` foram atualizados.

---

## 🔍 Outros Problemas Comuns

### Docker Desktop não inicia

1. **Verificar se está instalado:**
   - Abra o Gerenciador de Programas
   - Procure por "Docker Desktop"

2. **Reiniciar Docker Desktop:**
   - Clique com botão direito no ícone da bandeja
   - Selecione "Restart"

3. **Reinstalar (se necessário):**
   - Baixe do site oficial: https://www.docker.com/products/docker-desktop

### Porta já está em uso

```powershell
# Verificar se porta 5432 (PostgreSQL) está em uso
netstat -an | findstr "5432"

# Verificar se porta 6379 (Redis) está em uso
netstat -an | findstr "6379"

# Se estiver em uso, altere no docker-compose.dev.yml:
ports:
  - "5433:5432"  # Usar porta diferente
```

### Containers não iniciam

```powershell
# Ver logs detalhados
docker compose -f docker-compose.dev.yml logs

# Ver logs de um serviço específico
docker compose -f docker-compose.dev.yml logs postgres
docker compose -f docker-compose.dev.yml logs redis

# Reiniciar tudo
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d postgres redis
```

### Erro de permissão

```powershell
# No Windows, geralmente não há problema de permissão
# Mas se houver, execute PowerShell como Administrador
```

---

## ✅ Checklist de Diagnóstico

- [ ] Docker Desktop está instalado?
- [ ] Docker Desktop está rodando? (ícone na bandeja)
- [ ] `docker ps` funciona?
- [ ] Portas 5432 e 6379 estão livres?
- [ ] Arquivo `.env.local` existe? (opcional para dev)

---

## 🆘 Ainda com Problemas?

1. **Reiniciar Docker Desktop:**
   - Fechar completamente
   - Abrir novamente
   - Aguardar iniciar completamente

2. **Limpar e recomeçar:**
   ```powershell
   docker compose -f docker-compose.dev.yml down -v
   docker system prune -a
   docker compose -f docker-compose.dev.yml up -d postgres redis
   ```

3. **Verificar versão do Docker:**
   ```powershell
   docker --version
   docker compose version
   ```

---

**Dica:** Sempre verifique se o Docker Desktop está rodando antes de usar comandos docker!
