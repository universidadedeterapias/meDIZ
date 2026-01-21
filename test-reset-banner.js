// Cole este código no console do navegador (F12) quando estiver logado como admin
// em https://mediz.app

fetch('/api/admin/push/reset-banner', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  if (!response.ok) {
    return response.json().then(err => Promise.reject(err))
  }
  return response.json()
})
.then(data => {
  console.log('✅ Sucesso:', data)
  alert(`✅ Banner resetado com sucesso!\n\nTotal de usuários: ${data.totalUsers}\nAtualizados: ${data.updated}\n\n${data.message}`)
})
.catch(error => {
  console.error('❌ Erro:', error)
  alert(`❌ Erro: ${error.error || error.message || 'Erro desconhecido'}`)
})
