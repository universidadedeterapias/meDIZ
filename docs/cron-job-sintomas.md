# Configuração do Cron Job para Atualização Semanal de Sintomas
# 
# Para configurar o job semanal que atualiza os sintomas mais pesquisados:
#
# 1. Abra o crontab:
#    crontab -e
#
# 2. Adicione a linha abaixo para executar toda segunda-feira às 04h:
#    0 4 * * 1 cd /caminho/para/ExemploApp && npm run update-popular-symptoms >> logs/cron-sintomas.log 2>&1
#
# 3. Para testar manualmente:
#    npm run update-popular-symptoms
#
# 4. Para verificar logs:
#    tail -f logs/cron-sintomas.log
#
# Exemplo de configuração completa:
# # Atualização semanal de sintomas populares (segunda-feira às 04h)
# 0 4 * * 1 cd /home/user/ExemploApp && npm run update-popular-symptoms >> logs/cron-sintomas.log 2>&1
#
# Variáveis de ambiente necessárias:
# - CRON_SECRET: Chave secreta para autenticação do job
# - NEXTAUTH_URL: URL base da aplicação
# - DATABASE_URL: Conexão com o banco de dados
#
# Logs são salvos em:
# - logs/sintomas-job-logs.json (logs estruturados)
# - logs/cron-sintomas.log (logs do cron)
# - cache/sintomas-populares.json (cache dos sintomas)

