/**
 * Script para gerar chaves VAPID para notificações push
 * Execute: npm run generate-vapid-keys
 * ou: tsx src/scripts/generate-vapid-keys.ts
 */

import webpush from 'web-push'

console.log('🔑 Gerando chaves VAPID para notificações push...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('✅ Chaves geradas com sucesso!\n')
console.log('⚠️  IMPORTANTE: As chaves foram geradas mas NÃO serão exibidas aqui por segurança.')
console.log('💡 As chaves foram salvas automaticamente ou você precisa copiá-las manualmente.\n')
console.log('Adicione estas variáveis ao seu arquivo .env.local (NÃO commite no git!):\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log('VAPID_CONTACT_EMAIL=noreply@mediz.app\n')
console.log('⚠️  SEGURANÇA:')
console.log('- Mantenha VAPID_PRIVATE_KEY segredo! NUNCA compartilhe ou commite no git!')
console.log('- NEXT_PUBLIC_VAPID_PUBLIC_KEY pode ser pública (mas não precisa ser logada)')
console.log('- Use o mesmo email em VAPID_CONTACT_EMAIL que você configurou no VAPID')
console.log('- Adicione .env.local ao .gitignore se ainda não estiver')




