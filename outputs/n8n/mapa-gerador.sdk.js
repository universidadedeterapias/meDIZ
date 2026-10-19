import { workflow, node, trigger, sticky, embedding } from '@n8n/workflow-sdk';

// Gerado por mapa-gerador.sdk-build.js a partir de mapa_gerador_create.json. Nao editar a mao.

const n3 = embedding({ type: "@n8n/n8n-nodes-langchain.embeddingsOpenAi", version: 1.2, config: {
    name: "Embeddings OpenAI",
    parameters: {
  "model": "text-embedding-3-small",
  "options": {}
},
    credentials: {
  "openAiApi": {
    "id": "uytZDG8ilslSjmcH",
    "name": "OpenAi account"
  }
},
    position: [
  448,
  520
]
  } });

const n0 = trigger({ type: "n8n-nodes-base.webhook", version: 2.1, config: {
    name: "Pedido do app",
    parameters: {
  "httpMethod": "POST",
  "path": "mapa-gerar",
  "authentication": "headerAuth",
  "responseCode": 202,
  "options": {}
},
    position: [
  0,
  300
]
  } });

const n1 = node({ type: "n8n-nodes-base.code", version: 2, config: {
    name: "Prepara",
    parameters: {
  "jsCode": "const corpo = $input.first().json.body || $input.first().json;\nconst entrada = corpo.entrada || {};\nif (!corpo.mapa_id || !corpo.callback_url) throw new Error('Pedido sem mapa_id ou callback_url');\nif (!entrada.nome || !entrada.sintoma) throw new Error('Pedido sem nome ou sintoma');\nreturn [{ json: { mapa_id: String(corpo.mapa_id), callback_url: String(corpo.callback_url), entrada } }];"
},
    position: [
  224,
  300
]
  } });

const n2 = node({ type: "@n8n/n8n-nodes-langchain.vectorStoreSupabase", version: 1.3, config: {
    name: "Busca no O Corpo Diz",
    parameters: {
  "mode": "load",
  "tableName": {
    "__rl": true,
    "value": "GuiaCompleto",
    "mode": "list",
    "cachedResultName": "GuiaCompleto"
  },
  "prompt": "={{ $json.entrada.sintoma }}",
  "topK": 6,
  "options": {}
},
    credentials: {
  "supabaseApi": {
    "id": "ajUgfUltDy1MnUdF",
    "name": "Supabase account"
  }
},
    onError: "continueRegularOutput",
    alwaysOutputData: true,
    position: [
  448,
  300
],
    subnodes: { embedding: n3 }
  } });

const n4 = node({ type: "n8n-nodes-base.code", version: 2, config: {
    name: "Monta núcleo",
    parameters: {
  "jsCode": "const MODELO = 'gpt-4.1-mini';\nconst SISTEMA = \"Você escreve o Mapa da Origem Emocional, do Prof. Paulo Barbosa (método [RE]Sentir, livro O Corpo Diz).\\n\\nO Mapa é um documento que a pessoa guarda para a vida: um espelho com instruções de uso, não um relatório. Ele lê o sintoma como uma solução que o corpo encontrou, e devolve isso em linguagem de possibilidade.\\n\\nCOMO ESCREVER\\n- Fale COM a pessoa, em segunda pessoa, no tom do exemplo: \\\"você\\\" com \\\"teu/tua\\\" (\\\"teu corpo\\\", \\\"tua mãe\\\"), frases curtas, calor humano, sem jargão técnico.\\n- Use o que ela contou (idades, momentos, pai/mãe) para acertar o que ela não disse. Amarre as idades dela na linha do tempo e na leitura pessoal. Nunca invente fatos da vida dela: o que não foi dito vira pergunta, não afirmação.\\n- Linguagem de possibilidade: \\\"costuma\\\", \\\"numa leitura emocional\\\", \\\"muitas vezes\\\". Nunca \\\"você tem X porque Y\\\".\\n- Destaque só com **trecho** (duas palavras a uma frase curta). Nenhum outro markup, nenhum emoji.\\n- Português do Brasil.\\n\\nO QUE NUNCA ENTRA\\n- Diagnóstico médico, nome de doença como sentença, previsão de cura.\\n- Qualquer sugestão de parar, reduzir ou trocar tratamento, medicação ou acompanhamento médico.\\n- Técnica terapêutica para executar sozinho (aqui é consciência, não terapia).\\n- Citação de autores, livros ou fontes além de O Corpo Diz e do Prof. Paulo Barbosa.\\n- Culpa: o sintoma nunca é \\\"culpa\\\" da pessoa nem de ninguém.\\n\\nCONDIÇÕES GRAVES\\nSe o sintoma for doença autoimune, câncer, doença cardíaca, neurológica, psiquiátrica, gestação ou qualquer quadro em tratamento médico, a carta DEVE dizer, com as palavras do exemplo adaptadas ao caso, que o Mapa não substitui o médico nem o tratamento (ex.: \\\"não substitui teu médico nem tua insulina\\\"). O texto nunca afirma que a emoção causou a doença: fala do que o corpo \\\"costuma\\\" expressar numa leitura emocional.\\n\\nMAPA DE OUTRA PESSOA\\nSe \\\"para_outra_pessoa\\\" for verdadeiro, quem lê é alguém que ama a pessoa do sintoma (a relação vem em \\\"relacao\\\"). Escreva sobre a pessoa do sintoma em terceira pessoa (\\\"ela\\\", \\\"ele\\\", \\\"tua mãe\\\"), falando com quem lê.\\n\\nSAÍDA\\nResponda APENAS com um objeto JSON válido, sem texto antes ou depois, exatamente com as chaves pedidas.\";\nconst NUCLEO = \"Antes do Mapa, fixe o núcleo da leitura. Responda com este JSON:\\n{\\n  \\\"orgao\\\": \\\"órgão ou região com artigo, minúsculo: \\\\\\\"o pâncreas\\\\\\\", \\\\\\\"a lombar\\\\\\\", \\\\\\\"a pele\\\\\\\"\\\",\\n  \\\"funcao\\\": \\\"a função biológica do órgão em uma frase\\\",\\n  \\\"programa\\\": \\\"o que o aumento ou a diminuição dessa função resolveria biologicamente, em uma frase\\\",\\n  \\\"familia_conflito\\\": \\\"a família de conflito ligada ao tecido (ex.: desvalorização, perda, território, separação, medo, resistência, 'não consigo digerir'), em poucas palavras\\\",\\n  \\\"nucleo\\\": \\\"duas ou três frases com a leitura central — o que o corpo tentou resolver e de que vivência isso costuma nascer, amarrado ao que a pessoa contou\\\",\\n  \\\"sintoma_titulo\\\": \\\"o sintoma como título curto, até 60 caracteres, com maiúscula inicial\\\",\\n  \\\"lateral\\\": \\\"se o sintoma tem lado (esquerdo/direito), a leitura de lateralidade do método em uma frase; senão null\\\",\\n  \\\"grave\\\": true ou false (condição grave, como definido acima)\\n}\";\nconst PARTE_A = \"Escreva a primeira metade do Mapa a partir do NÚCLEO. Responda com este JSON (os limites de tamanho são obrigatórios):\\n{\\n  \\\"capa\\\": { \\\"sintoma_titulo\\\": \\\"use o do núcleo\\\", \\\"desde\\\": \\\"complemento de tempo curto se a pessoa informou (\\\\\\\"desde os 20 anos\\\\\\\", \\\\\\\"há 3 meses\\\\\\\"), senão null\\\" },\\n  \\\"carta\\\": { \\\"paragrafos\\\": [1 a 3 parágrafos curtos da carta do Prof., em primeira pessoa dele. O primeiro começa em minúscula, continuando o \\\"Nome,\\\" que o template já escreve. A regra \\\"Leia devagar. Com caneta…\\\" já está no template: não repita. Se grave, um parágrafo diz que o Mapa não substitui o médico/tratamento] },\\n  \\\"reconhecimento\\\": { \\\"afirmacoes\\\": [4 a 7 afirmações de possibilidade sobre comportamentos e vivências de quem carrega isso, específicas e ousadas, incluindo algo que ela provavelmente não contou; cada uma até 300 caracteres, com um **destaque**], \\\"fechamento\\\": \\\"uma frase-pergunta que fecha a lista, até 240 caracteres\\\" },\\n  \\\"linguagem_popular\\\": { \\\"frases\\\": [3 a 6 frases populares sobre esse órgão/função, sem aspas, até 80 caracteres cada] },\\n  \\\"sentido_biologico\\\": { \\\"orgao\\\": \\\"o do núcleo\\\", \\\"paragrafos\\\": [1 a 3 parágrafos: função → o que o programa resolve → o conflito que ele atende], \\\"frase_sintese\\\": \\\"a frase-síntese em destaque, até 300 caracteres\\\" },\\n  \\\"conflito\\\": {\\n    \\\"raiz\\\": \\\"o que costuma estar na raiz, até 600 caracteres, com **destaques**\\\",\\n    \\\"cenarios\\\": [exatamente 3 cenários concretos de vida, \\\"isso costuma nascer quando…\\\", um deles muito provavelmente o dela; até 300 caracteres cada],\\n    \\\"leitura_pessoal\\\": \\\"se ela contou momentos ou algo do pai/mãe: começa com o nome dela e cruza o conflito com as idades e fatos que ELA contou (nada inventado), até 500 caracteres; senão null\\\",\\n    \\\"pergunta_chave\\\": \\\"complemento da pergunta-chave do método amarrado às idades dela, até 300 caracteres (o template já escreve 'o que aconteceu, com quem — e o que você não pôde fazer ou dizer?')\\\"\\n  },\\n  \\\"linha_do_tempo\\\": {\\n    \\\"marcos\\\": [2 a 6 marcos em ordem cronológica: { \\\"rotulo\\\": \\\"MAIÚSCULAS, ex. \\\\\\\"10 ANOS\\\\\\\"\\\", \\\"texto\\\": \\\"até 400 caracteres\\\", \\\"aberto\\\": false }; use as idades que ela deu; inclua ao menos um marco \\\"aberto\\\": true para o período que só ela sabe (ex. \\\"ENTRE 13 E 20 — O QUE SÓ VOCÊ SABE\\\"), escrito como pergunta],\\n    \\\"pergunta\\\": \\\"o que estava acontecendo pouco antes do sintoma aparecer — pergunta concreta, até 300 caracteres\\\"\\n  },\\n  \\\"fase\\\": { \\\"sinais_luta\\\": \\\"sinais da fase de conflito ativo para ESTE sintoma, até 240\\\", \\\"sinais_reparacao\\\": \\\"sinais da fase de reparação para ESTE sintoma, até 240\\\", \\\"leitura\\\": \\\"o que isso muda para ela, até 500\\\" },\\n  \\\"repeticao\\\": { \\\"lateralidade\\\": \\\"a do núcleo ou null\\\", \\\"texto\\\": \\\"quando e por que volta mais forte, até 600\\\", \\\"pergunta\\\": \\\"em que situações volta? com quem estava? até 240\\\" }\\n}\";\nconst PARTE_B = \"Escreva a segunda metade do Mapa a partir do NÚCLEO. Responda com este JSON (os limites de tamanho são obrigatórios):\\n{\\n  \\\"programa_familiar\\\": {\\n    \\\"texto\\\": \\\"o programa que a família já carregava e que o corpo pode estar repetindo, até 600\\\",\\n    \\\"instrucao\\\": \\\"o que marcar na árvore (quem teve sintomas na mesma região/função ou a mesma história), até 300\\\",\\n    \\\"arvore\\\": { anotações curtas (até 80 caracteres) SÓ nos nós sobre os quais ela contou algo, usando apenas estas chaves: avo_paterno, avo_paterna, avo_materno, avo_materna, pai, mae, tios, irmaos — ex. { \\\"pai\\\": \\\"faleceu — você tinha 10\\\" }; objeto vazio se ela não contou nada },\\n    \\\"pergunta\\\": \\\"a pergunta para levar à mãe (ou a quem conhece a história da família), até 240\\\"\\n  },\\n  \\\"crencas\\\": { \\\"itens\\\": [5 a 8 crenças internas que mantêm esse programa ligado, em primeira pessoa e sem aspas, até 120 caracteres cada] },\\n  \\\"corpo_pede\\\": { \\\"pedidos\\\": [3 ou 4 pedidos que o órgão faria em primeira pessoa, cada um começando com \\\"Eu preciso que você\\\", sem aspas, até 300 caracteres, com um **destaque**] },\\n  \\\"primeiros_passos\\\": { \\\"passos\\\": [exatamente 3 gestos de consciência possíveis nesta semana: { \\\"titulo\\\": \\\"frase curta terminada em ponto, até 60\\\", \\\"texto\\\": \\\"até 300\\\" } — ex.: escrever a resposta da pergunta-chave; contar para uma pessoa; completar a linha do tempo] },\\n  \\\"releitura\\\": { \\\"pergunta_30\\\": \\\"começa em minúscula: o que mudou na forma como eu olho pra [o sintoma]?, até 200\\\", \\\"pergunta_90\\\": \\\"começa em minúscula, até 200\\\" },\\n  \\\"citacao_final\\\": \\\"uma frase no espírito de O Corpo Diz sobre esse sintoma, sem aspas, até 400\\\",\\n  \\\"frase_forte\\\": \\\"a frase mais marcante deste Mapa, para a pessoa lembrar dele depois, até 300 caracteres\\\"\\n}\";\nconst EXEMPLO_ENTRADA = {\"nome\":\"Rafael\",\"sintoma\":\"Diabetes tipo 1\",\"tempo\":\"desde os 20 anos\",\"momentos\":[{\"momento\":\"Perdi meu pai\",\"idade\":\"10\"},{\"momento\":\"Saí de casa pra trabalhar\",\"idade\":\"13\"},{\"momento\":\"Diagnóstico\",\"idade\":\"20\"}],\"familia\":\"Meu pai faleceu quando eu tinha 10 anos\"};\nconst EXEMPLO_A = {\"capa\":{\"sintoma_titulo\":\"Diabetes tipo 1\",\"desde\":\"desde os 20 anos\"},\"carta\":{\"paragrafos\":[\"você vai ler aqui coisas que ninguém te disse. Algumas vão parecer óbvias depois de lidas — é assim que a verdade do corpo costuma chegar: parecendo que a gente sempre soube.\",\"Este Mapa não substitui teu médico nem tua insulina. Ele faz outra coisa: mostra por que teu corpo escolheu este caminho, e o que ele está pedindo desde então.\"]},\"reconhecimento\":{\"afirmacoes\":[\"Você aprendeu a se virar sozinho cedo demais — e hoje tem dificuldade de aceitar ajuda, mesmo quando precisa.\",\"Quando alguém é doce com você, uma parte sua **desconfia**. Carinho sem motivo parece armadilha.\",\"Você **resiste**. A tudo. Cansaço, dor, saudade — resistir virou tua forma de existir.\",\"Tem uma raiva antiga, calma, que você não chama de raiva. Chama de **\\\"é assim mesmo\\\"**.\",\"Você cuida de todo mundo. Mas quando a pergunta é **\\\"e você, como está?\\\"**, você muda de assunto.\"],\"fechamento\":\"Quantas dessas você marcou? Repara que nenhuma fala de açúcar.\"},\"linguagem_popular\":{\"frases\":[\"A vida perdeu o doce.\",\"Engoli seco.\",\"Tive que ser forte.\",\"Não posso me dar ao luxo.\"]},\"sentido_biologico\":{\"orgao\":\"o pâncreas\",\"paragrafos\":[\"O pâncreas tem duas funções: digerir o que entra e regular a doçura que circula no sangue. Quando ele reduz a insulina, o açúcar fica no sangue, disponível — o corpo se prepara pra **lutar**, não pra descansar.\",\"Numa leitura emocional, isso costuma aparecer em quem precisou resistir a algo ou a alguém por muito tempo, enquanto a doçura da vida parecia ter sido retirada.\"],\"frase_sintese\":\"O corpo mantém o açúcar disponível para quem sente que precisa lutar sem parar — e deixa de absorver a doçura, porque aprendeu que ela **não vai durar**.\"},\"conflito\":{\"raiz\":\"Um conflito de **resistência**: algo que você teve que suportar, enfrentar ou empurrar, sem direito de fraquejar. E, junto, uma **perda de doçura**: a sensação de que o cuidado, a proteção, o colo — acabaram antes da hora.\",\"cenarios\":[\"Perdeu a pessoa que era a referência de proteção, cedo, e teve que ocupar o lugar dela.\",\"Saiu de casa — ou foi empurrado pra fora — numa idade em que ainda deveria ser cuidado.\",\"Precisou provar que aguentava, pra não dar trabalho a quem já estava sofrendo.\"],\"leitura_pessoal\":\"Rafael: aos 10 anos, teu pai. Aos 13, a rua e o trabalho. O corpo registrou que a doçura acabou aos 10 e que a luta começou aos 13.\",\"pergunta_chave\":\"O que você não pôde fazer aos 10. O que você não pôde dizer aos 13.\"},\"linha_do_tempo\":{\"marcos\":[{\"rotulo\":\"10 ANOS\",\"texto\":\"Perde o pai. A doçura da infância termina. Ninguém pergunta como você está — todos estão de luto.\",\"aberto\":false},{\"rotulo\":\"13 ANOS\",\"texto\":\"Sai de casa pra trabalhar. A luta começa. Resistir vira identidade.\",\"aberto\":false},{\"rotulo\":\"ENTRE 13 E 20 — O QUE SÓ VOCÊ SABE\",\"texto\":\"Sete anos de resistência. O que aconteceu aqui que te fez, finalmente, **baixar a guarda**?\",\"aberto\":true},{\"rotulo\":\"20 ANOS\",\"texto\":\"O diagnóstico. Numa leitura emocional, o sintoma costuma se manifestar quando o corpo entende que a luta terminou — ou quando uma nova perda reabre a antiga.\",\"aberto\":false}],\"pergunta\":\"O que mudou na tua vida nos 6 a 12 meses antes dos 20? Alguém entrou? Alguém saiu? Você conseguiu alguma coisa que sempre quis?\"},\"fase\":{\"sinais_luta\":\"Tensão, sono curto, pensamento girando, mãos frias, \\\"não posso parar\\\".\",\"sinais_reparacao\":\"Cansaço profundo, vontade de dormir, calor, emoção à flor da pele, \\\"não aguento mais\\\".\",\"leitura\":\"Numa condição que já dura anos, o que importa é o **ciclo**: em que momentos da vida a luta volta? Quando você sente que pode baixar a guarda? Teu corpo alterna entre os dois — e você reconhece cada um.\"},\"repeticao\":{\"lateralidade\":null,\"texto\":\"Episódios de descontrole costumam acompanhar momentos em que a história original se repete: alguém que você protege adoece; você precisa sustentar alguém sozinho; ou — o mais traiçoeiro — alguém te oferece cuidado de verdade e você não sabe receber.\",\"pergunta\":\"Pensa nas últimas vezes que desregulou. Quem estava por perto? O que estava acontecendo?\"}};\nconst EXEMPLO_B = {\"programa_familiar\":{\"texto\":\"Muitas vezes o corpo não está respondendo só à nossa história. Está repetindo um programa que a família já carregava: homens que perderam o pai cedo, que tiveram que sustentar a casa, que não puderam ser doces.\",\"instrucao\":\"Marque quem, na tua família, teve diabetes, problemas de pâncreas — ou uma história de \\\"ter que ser forte cedo\\\".\",\"arvore\":{\"pai\":\"faleceu — você tinha 10\"},\"pergunta\":\"Quem, antes de você, teve que virar homem antes da hora? Essa é a pergunta pra levar pra tua mãe.\"},\"crencas\":{\"itens\":[\"Se eu parar, tudo cai.\",\"Homem não chora, homem resolve.\",\"O que é bom não dura.\",\"Não posso depender de ninguém.\",\"Eu aguento.\",\"Não tenho tempo pra sentir.\"]},\"corpo_pede\":{\"pedidos\":[\"Eu preciso que você pare de lutar por um momento — só pra ver que o chão continua aqui.\",\"Eu preciso que você **receba**. Um carinho, um favor, um \\\"deixa que eu faço\\\". Sem devolver no mesmo dia.\",\"Eu preciso que você **chore o teu pai**. Com 10 anos você não pôde. Agora pode.\",\"Eu preciso que você volte a achar doce alguma coisa — e acredite que ela fica.\"]},\"primeiros_passos\":{\"passos\":[{\"titulo\":\"Escreve a resposta.\",\"texto\":\"\\\"O que eu não pude fazer aos 10, e o que eu não pude dizer aos 13.\\\" Uma página. Pra ninguém ler.\"},{\"titulo\":\"Conta pra uma pessoa.\",\"texto\":\"Uma só. O que você descobriu neste Mapa. Dizer em voz alta muda o registro.\"},{\"titulo\":\"Fecha a linha do tempo.\",\"texto\":\"Preenche o espaço entre os 13 e os 20. O corpo sabe a data; você também.\"}]},\"releitura\":{\"pergunta_30\":\"o que mudou na forma como eu olho pra minha diabetes?\",\"pergunta_90\":\"o que eu descobri que não estava neste Mapa?\"},\"citacao_final\":\"O corpo não adoece por acaso. Ele adoece porque, num momento, essa foi a única forma de continuar.\",\"frase_forte\":\"O corpo mantém o açúcar disponível para quem sente que precisa lutar sem parar — e deixa de absorver a doçura, porque aprendeu que ela não vai durar.\"};\n\nfunction descreveEntrada(e) {\n  const linhas = ['Nome: ' + e.nome, 'Sintoma (como a pessoa escreveu): ' + e.sintoma];\n  if (e.tempo) linhas.push('Há quanto tempo: ' + e.tempo);\n  const momentos = Array.isArray(e.momentos) ? e.momentos.filter((m) => m && m.momento) : [];\n  if (momentos.length) {\n    linhas.push('Momentos que marcaram a vida:');\n    for (const m of momentos) linhas.push('- ' + m.momento + (m.idade ? ' (aos ' + m.idade + ')' : ''));\n  }\n  if (e.familia) linhas.push('Acontecimento com o pai ou a mãe: ' + e.familia);\n  if (e.para_outra_pessoa) linhas.push('para_outra_pessoa: true · relacao: ' + (e.relacao || 'não informada'));\n  return linhas.join('\\n');\n}\n\nfunction requisicao(mensagens, maxTokens) {\n  return {\n    model: MODELO,\n    temperature: 0.8,\n    max_tokens: maxTokens,\n    response_format: { type: 'json_object' },\n    messages: [{ role: 'system', content: SISTEMA }].concat(mensagens)\n  };\n}\nconst pedido = $('Prepara').first().json;\nconst trechos = [];\nfor (const item of $input.all()) {\n  const doc = item.json.document || item.json;\n  const texto = doc && (doc.pageContent || doc.text || doc.content);\n  if (texto) trechos.push(String(texto).slice(0, 1800));\n}\nconst contexto = trechos.length\n  ? 'TRECHOS DE O CORPO DIZ SOBRE ESTE SINTOMA (base da leitura; não cite a fonte):\\n\\n' + trechos.slice(0, 6).join('\\n---\\n')\n  : 'Não há trechos da base para este sintoma: use o conhecimento do método com cautela redobrada.';\nreturn [{ json: {\n  ...pedido,\n  contexto,\n  requisicao: requisicao([\n    { role: 'user', content: contexto + '\\n\\nPESSOA\\n' + descreveEntrada(pedido.entrada) + '\\n\\n' + NUCLEO }\n  ], 700)\n} }];"
},
    position: [
  672,
  300
]
  } });

const n5 = node({ type: "n8n-nodes-base.httpRequest", version: 4.4, config: {
    name: "OpenAI — núcleo",
    parameters: {
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "openAiApi",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify($json.requisicao) }}",
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 90000
  }
},
    credentials: {
  "openAiApi": {
    "id": "uytZDG8ilslSjmcH",
    "name": "OpenAi account"
  }
},
    onError: "continueRegularOutput",
    position: [
  896,
  300
]
  } });

const n6 = node({ type: "n8n-nodes-base.code", version: 2, config: {
    name: "Monta partes",
    parameters: {
  "jsCode": "const MODELO = 'gpt-4.1-mini';\nconst SISTEMA = \"Você escreve o Mapa da Origem Emocional, do Prof. Paulo Barbosa (método [RE]Sentir, livro O Corpo Diz).\\n\\nO Mapa é um documento que a pessoa guarda para a vida: um espelho com instruções de uso, não um relatório. Ele lê o sintoma como uma solução que o corpo encontrou, e devolve isso em linguagem de possibilidade.\\n\\nCOMO ESCREVER\\n- Fale COM a pessoa, em segunda pessoa, no tom do exemplo: \\\"você\\\" com \\\"teu/tua\\\" (\\\"teu corpo\\\", \\\"tua mãe\\\"), frases curtas, calor humano, sem jargão técnico.\\n- Use o que ela contou (idades, momentos, pai/mãe) para acertar o que ela não disse. Amarre as idades dela na linha do tempo e na leitura pessoal. Nunca invente fatos da vida dela: o que não foi dito vira pergunta, não afirmação.\\n- Linguagem de possibilidade: \\\"costuma\\\", \\\"numa leitura emocional\\\", \\\"muitas vezes\\\". Nunca \\\"você tem X porque Y\\\".\\n- Destaque só com **trecho** (duas palavras a uma frase curta). Nenhum outro markup, nenhum emoji.\\n- Português do Brasil.\\n\\nO QUE NUNCA ENTRA\\n- Diagnóstico médico, nome de doença como sentença, previsão de cura.\\n- Qualquer sugestão de parar, reduzir ou trocar tratamento, medicação ou acompanhamento médico.\\n- Técnica terapêutica para executar sozinho (aqui é consciência, não terapia).\\n- Citação de autores, livros ou fontes além de O Corpo Diz e do Prof. Paulo Barbosa.\\n- Culpa: o sintoma nunca é \\\"culpa\\\" da pessoa nem de ninguém.\\n\\nCONDIÇÕES GRAVES\\nSe o sintoma for doença autoimune, câncer, doença cardíaca, neurológica, psiquiátrica, gestação ou qualquer quadro em tratamento médico, a carta DEVE dizer, com as palavras do exemplo adaptadas ao caso, que o Mapa não substitui o médico nem o tratamento (ex.: \\\"não substitui teu médico nem tua insulina\\\"). O texto nunca afirma que a emoção causou a doença: fala do que o corpo \\\"costuma\\\" expressar numa leitura emocional.\\n\\nMAPA DE OUTRA PESSOA\\nSe \\\"para_outra_pessoa\\\" for verdadeiro, quem lê é alguém que ama a pessoa do sintoma (a relação vem em \\\"relacao\\\"). Escreva sobre a pessoa do sintoma em terceira pessoa (\\\"ela\\\", \\\"ele\\\", \\\"tua mãe\\\"), falando com quem lê.\\n\\nSAÍDA\\nResponda APENAS com um objeto JSON válido, sem texto antes ou depois, exatamente com as chaves pedidas.\";\nconst NUCLEO = \"Antes do Mapa, fixe o núcleo da leitura. Responda com este JSON:\\n{\\n  \\\"orgao\\\": \\\"órgão ou região com artigo, minúsculo: \\\\\\\"o pâncreas\\\\\\\", \\\\\\\"a lombar\\\\\\\", \\\\\\\"a pele\\\\\\\"\\\",\\n  \\\"funcao\\\": \\\"a função biológica do órgão em uma frase\\\",\\n  \\\"programa\\\": \\\"o que o aumento ou a diminuição dessa função resolveria biologicamente, em uma frase\\\",\\n  \\\"familia_conflito\\\": \\\"a família de conflito ligada ao tecido (ex.: desvalorização, perda, território, separação, medo, resistência, 'não consigo digerir'), em poucas palavras\\\",\\n  \\\"nucleo\\\": \\\"duas ou três frases com a leitura central — o que o corpo tentou resolver e de que vivência isso costuma nascer, amarrado ao que a pessoa contou\\\",\\n  \\\"sintoma_titulo\\\": \\\"o sintoma como título curto, até 60 caracteres, com maiúscula inicial\\\",\\n  \\\"lateral\\\": \\\"se o sintoma tem lado (esquerdo/direito), a leitura de lateralidade do método em uma frase; senão null\\\",\\n  \\\"grave\\\": true ou false (condição grave, como definido acima)\\n}\";\nconst PARTE_A = \"Escreva a primeira metade do Mapa a partir do NÚCLEO. Responda com este JSON (os limites de tamanho são obrigatórios):\\n{\\n  \\\"capa\\\": { \\\"sintoma_titulo\\\": \\\"use o do núcleo\\\", \\\"desde\\\": \\\"complemento de tempo curto se a pessoa informou (\\\\\\\"desde os 20 anos\\\\\\\", \\\\\\\"há 3 meses\\\\\\\"), senão null\\\" },\\n  \\\"carta\\\": { \\\"paragrafos\\\": [1 a 3 parágrafos curtos da carta do Prof., em primeira pessoa dele. O primeiro começa em minúscula, continuando o \\\"Nome,\\\" que o template já escreve. A regra \\\"Leia devagar. Com caneta…\\\" já está no template: não repita. Se grave, um parágrafo diz que o Mapa não substitui o médico/tratamento] },\\n  \\\"reconhecimento\\\": { \\\"afirmacoes\\\": [4 a 7 afirmações de possibilidade sobre comportamentos e vivências de quem carrega isso, específicas e ousadas, incluindo algo que ela provavelmente não contou; cada uma até 300 caracteres, com um **destaque**], \\\"fechamento\\\": \\\"uma frase-pergunta que fecha a lista, até 240 caracteres\\\" },\\n  \\\"linguagem_popular\\\": { \\\"frases\\\": [3 a 6 frases populares sobre esse órgão/função, sem aspas, até 80 caracteres cada] },\\n  \\\"sentido_biologico\\\": { \\\"orgao\\\": \\\"o do núcleo\\\", \\\"paragrafos\\\": [1 a 3 parágrafos: função → o que o programa resolve → o conflito que ele atende], \\\"frase_sintese\\\": \\\"a frase-síntese em destaque, até 300 caracteres\\\" },\\n  \\\"conflito\\\": {\\n    \\\"raiz\\\": \\\"o que costuma estar na raiz, até 600 caracteres, com **destaques**\\\",\\n    \\\"cenarios\\\": [exatamente 3 cenários concretos de vida, \\\"isso costuma nascer quando…\\\", um deles muito provavelmente o dela; até 300 caracteres cada],\\n    \\\"leitura_pessoal\\\": \\\"se ela contou momentos ou algo do pai/mãe: começa com o nome dela e cruza o conflito com as idades e fatos que ELA contou (nada inventado), até 500 caracteres; senão null\\\",\\n    \\\"pergunta_chave\\\": \\\"complemento da pergunta-chave do método amarrado às idades dela, até 300 caracteres (o template já escreve 'o que aconteceu, com quem — e o que você não pôde fazer ou dizer?')\\\"\\n  },\\n  \\\"linha_do_tempo\\\": {\\n    \\\"marcos\\\": [2 a 6 marcos em ordem cronológica: { \\\"rotulo\\\": \\\"MAIÚSCULAS, ex. \\\\\\\"10 ANOS\\\\\\\"\\\", \\\"texto\\\": \\\"até 400 caracteres\\\", \\\"aberto\\\": false }; use as idades que ela deu; inclua ao menos um marco \\\"aberto\\\": true para o período que só ela sabe (ex. \\\"ENTRE 13 E 20 — O QUE SÓ VOCÊ SABE\\\"), escrito como pergunta],\\n    \\\"pergunta\\\": \\\"o que estava acontecendo pouco antes do sintoma aparecer — pergunta concreta, até 300 caracteres\\\"\\n  },\\n  \\\"fase\\\": { \\\"sinais_luta\\\": \\\"sinais da fase de conflito ativo para ESTE sintoma, até 240\\\", \\\"sinais_reparacao\\\": \\\"sinais da fase de reparação para ESTE sintoma, até 240\\\", \\\"leitura\\\": \\\"o que isso muda para ela, até 500\\\" },\\n  \\\"repeticao\\\": { \\\"lateralidade\\\": \\\"a do núcleo ou null\\\", \\\"texto\\\": \\\"quando e por que volta mais forte, até 600\\\", \\\"pergunta\\\": \\\"em que situações volta? com quem estava? até 240\\\" }\\n}\";\nconst PARTE_B = \"Escreva a segunda metade do Mapa a partir do NÚCLEO. Responda com este JSON (os limites de tamanho são obrigatórios):\\n{\\n  \\\"programa_familiar\\\": {\\n    \\\"texto\\\": \\\"o programa que a família já carregava e que o corpo pode estar repetindo, até 600\\\",\\n    \\\"instrucao\\\": \\\"o que marcar na árvore (quem teve sintomas na mesma região/função ou a mesma história), até 300\\\",\\n    \\\"arvore\\\": { anotações curtas (até 80 caracteres) SÓ nos nós sobre os quais ela contou algo, usando apenas estas chaves: avo_paterno, avo_paterna, avo_materno, avo_materna, pai, mae, tios, irmaos — ex. { \\\"pai\\\": \\\"faleceu — você tinha 10\\\" }; objeto vazio se ela não contou nada },\\n    \\\"pergunta\\\": \\\"a pergunta para levar à mãe (ou a quem conhece a história da família), até 240\\\"\\n  },\\n  \\\"crencas\\\": { \\\"itens\\\": [5 a 8 crenças internas que mantêm esse programa ligado, em primeira pessoa e sem aspas, até 120 caracteres cada] },\\n  \\\"corpo_pede\\\": { \\\"pedidos\\\": [3 ou 4 pedidos que o órgão faria em primeira pessoa, cada um começando com \\\"Eu preciso que você\\\", sem aspas, até 300 caracteres, com um **destaque**] },\\n  \\\"primeiros_passos\\\": { \\\"passos\\\": [exatamente 3 gestos de consciência possíveis nesta semana: { \\\"titulo\\\": \\\"frase curta terminada em ponto, até 60\\\", \\\"texto\\\": \\\"até 300\\\" } — ex.: escrever a resposta da pergunta-chave; contar para uma pessoa; completar a linha do tempo] },\\n  \\\"releitura\\\": { \\\"pergunta_30\\\": \\\"começa em minúscula: o que mudou na forma como eu olho pra [o sintoma]?, até 200\\\", \\\"pergunta_90\\\": \\\"começa em minúscula, até 200\\\" },\\n  \\\"citacao_final\\\": \\\"uma frase no espírito de O Corpo Diz sobre esse sintoma, sem aspas, até 400\\\",\\n  \\\"frase_forte\\\": \\\"a frase mais marcante deste Mapa, para a pessoa lembrar dele depois, até 300 caracteres\\\"\\n}\";\nconst EXEMPLO_ENTRADA = {\"nome\":\"Rafael\",\"sintoma\":\"Diabetes tipo 1\",\"tempo\":\"desde os 20 anos\",\"momentos\":[{\"momento\":\"Perdi meu pai\",\"idade\":\"10\"},{\"momento\":\"Saí de casa pra trabalhar\",\"idade\":\"13\"},{\"momento\":\"Diagnóstico\",\"idade\":\"20\"}],\"familia\":\"Meu pai faleceu quando eu tinha 10 anos\"};\nconst EXEMPLO_A = {\"capa\":{\"sintoma_titulo\":\"Diabetes tipo 1\",\"desde\":\"desde os 20 anos\"},\"carta\":{\"paragrafos\":[\"você vai ler aqui coisas que ninguém te disse. Algumas vão parecer óbvias depois de lidas — é assim que a verdade do corpo costuma chegar: parecendo que a gente sempre soube.\",\"Este Mapa não substitui teu médico nem tua insulina. Ele faz outra coisa: mostra por que teu corpo escolheu este caminho, e o que ele está pedindo desde então.\"]},\"reconhecimento\":{\"afirmacoes\":[\"Você aprendeu a se virar sozinho cedo demais — e hoje tem dificuldade de aceitar ajuda, mesmo quando precisa.\",\"Quando alguém é doce com você, uma parte sua **desconfia**. Carinho sem motivo parece armadilha.\",\"Você **resiste**. A tudo. Cansaço, dor, saudade — resistir virou tua forma de existir.\",\"Tem uma raiva antiga, calma, que você não chama de raiva. Chama de **\\\"é assim mesmo\\\"**.\",\"Você cuida de todo mundo. Mas quando a pergunta é **\\\"e você, como está?\\\"**, você muda de assunto.\"],\"fechamento\":\"Quantas dessas você marcou? Repara que nenhuma fala de açúcar.\"},\"linguagem_popular\":{\"frases\":[\"A vida perdeu o doce.\",\"Engoli seco.\",\"Tive que ser forte.\",\"Não posso me dar ao luxo.\"]},\"sentido_biologico\":{\"orgao\":\"o pâncreas\",\"paragrafos\":[\"O pâncreas tem duas funções: digerir o que entra e regular a doçura que circula no sangue. Quando ele reduz a insulina, o açúcar fica no sangue, disponível — o corpo se prepara pra **lutar**, não pra descansar.\",\"Numa leitura emocional, isso costuma aparecer em quem precisou resistir a algo ou a alguém por muito tempo, enquanto a doçura da vida parecia ter sido retirada.\"],\"frase_sintese\":\"O corpo mantém o açúcar disponível para quem sente que precisa lutar sem parar — e deixa de absorver a doçura, porque aprendeu que ela **não vai durar**.\"},\"conflito\":{\"raiz\":\"Um conflito de **resistência**: algo que você teve que suportar, enfrentar ou empurrar, sem direito de fraquejar. E, junto, uma **perda de doçura**: a sensação de que o cuidado, a proteção, o colo — acabaram antes da hora.\",\"cenarios\":[\"Perdeu a pessoa que era a referência de proteção, cedo, e teve que ocupar o lugar dela.\",\"Saiu de casa — ou foi empurrado pra fora — numa idade em que ainda deveria ser cuidado.\",\"Precisou provar que aguentava, pra não dar trabalho a quem já estava sofrendo.\"],\"leitura_pessoal\":\"Rafael: aos 10 anos, teu pai. Aos 13, a rua e o trabalho. O corpo registrou que a doçura acabou aos 10 e que a luta começou aos 13.\",\"pergunta_chave\":\"O que você não pôde fazer aos 10. O que você não pôde dizer aos 13.\"},\"linha_do_tempo\":{\"marcos\":[{\"rotulo\":\"10 ANOS\",\"texto\":\"Perde o pai. A doçura da infância termina. Ninguém pergunta como você está — todos estão de luto.\",\"aberto\":false},{\"rotulo\":\"13 ANOS\",\"texto\":\"Sai de casa pra trabalhar. A luta começa. Resistir vira identidade.\",\"aberto\":false},{\"rotulo\":\"ENTRE 13 E 20 — O QUE SÓ VOCÊ SABE\",\"texto\":\"Sete anos de resistência. O que aconteceu aqui que te fez, finalmente, **baixar a guarda**?\",\"aberto\":true},{\"rotulo\":\"20 ANOS\",\"texto\":\"O diagnóstico. Numa leitura emocional, o sintoma costuma se manifestar quando o corpo entende que a luta terminou — ou quando uma nova perda reabre a antiga.\",\"aberto\":false}],\"pergunta\":\"O que mudou na tua vida nos 6 a 12 meses antes dos 20? Alguém entrou? Alguém saiu? Você conseguiu alguma coisa que sempre quis?\"},\"fase\":{\"sinais_luta\":\"Tensão, sono curto, pensamento girando, mãos frias, \\\"não posso parar\\\".\",\"sinais_reparacao\":\"Cansaço profundo, vontade de dormir, calor, emoção à flor da pele, \\\"não aguento mais\\\".\",\"leitura\":\"Numa condição que já dura anos, o que importa é o **ciclo**: em que momentos da vida a luta volta? Quando você sente que pode baixar a guarda? Teu corpo alterna entre os dois — e você reconhece cada um.\"},\"repeticao\":{\"lateralidade\":null,\"texto\":\"Episódios de descontrole costumam acompanhar momentos em que a história original se repete: alguém que você protege adoece; você precisa sustentar alguém sozinho; ou — o mais traiçoeiro — alguém te oferece cuidado de verdade e você não sabe receber.\",\"pergunta\":\"Pensa nas últimas vezes que desregulou. Quem estava por perto? O que estava acontecendo?\"}};\nconst EXEMPLO_B = {\"programa_familiar\":{\"texto\":\"Muitas vezes o corpo não está respondendo só à nossa história. Está repetindo um programa que a família já carregava: homens que perderam o pai cedo, que tiveram que sustentar a casa, que não puderam ser doces.\",\"instrucao\":\"Marque quem, na tua família, teve diabetes, problemas de pâncreas — ou uma história de \\\"ter que ser forte cedo\\\".\",\"arvore\":{\"pai\":\"faleceu — você tinha 10\"},\"pergunta\":\"Quem, antes de você, teve que virar homem antes da hora? Essa é a pergunta pra levar pra tua mãe.\"},\"crencas\":{\"itens\":[\"Se eu parar, tudo cai.\",\"Homem não chora, homem resolve.\",\"O que é bom não dura.\",\"Não posso depender de ninguém.\",\"Eu aguento.\",\"Não tenho tempo pra sentir.\"]},\"corpo_pede\":{\"pedidos\":[\"Eu preciso que você pare de lutar por um momento — só pra ver que o chão continua aqui.\",\"Eu preciso que você **receba**. Um carinho, um favor, um \\\"deixa que eu faço\\\". Sem devolver no mesmo dia.\",\"Eu preciso que você **chore o teu pai**. Com 10 anos você não pôde. Agora pode.\",\"Eu preciso que você volte a achar doce alguma coisa — e acredite que ela fica.\"]},\"primeiros_passos\":{\"passos\":[{\"titulo\":\"Escreve a resposta.\",\"texto\":\"\\\"O que eu não pude fazer aos 10, e o que eu não pude dizer aos 13.\\\" Uma página. Pra ninguém ler.\"},{\"titulo\":\"Conta pra uma pessoa.\",\"texto\":\"Uma só. O que você descobriu neste Mapa. Dizer em voz alta muda o registro.\"},{\"titulo\":\"Fecha a linha do tempo.\",\"texto\":\"Preenche o espaço entre os 13 e os 20. O corpo sabe a data; você também.\"}]},\"releitura\":{\"pergunta_30\":\"o que mudou na forma como eu olho pra minha diabetes?\",\"pergunta_90\":\"o que eu descobri que não estava neste Mapa?\"},\"citacao_final\":\"O corpo não adoece por acaso. Ele adoece porque, num momento, essa foi a única forma de continuar.\",\"frase_forte\":\"O corpo mantém o açúcar disponível para quem sente que precisa lutar sem parar — e deixa de absorver a doçura, porque aprendeu que ela não vai durar.\"};\n\nfunction descreveEntrada(e) {\n  const linhas = ['Nome: ' + e.nome, 'Sintoma (como a pessoa escreveu): ' + e.sintoma];\n  if (e.tempo) linhas.push('Há quanto tempo: ' + e.tempo);\n  const momentos = Array.isArray(e.momentos) ? e.momentos.filter((m) => m && m.momento) : [];\n  if (momentos.length) {\n    linhas.push('Momentos que marcaram a vida:');\n    for (const m of momentos) linhas.push('- ' + m.momento + (m.idade ? ' (aos ' + m.idade + ')' : ''));\n  }\n  if (e.familia) linhas.push('Acontecimento com o pai ou a mãe: ' + e.familia);\n  if (e.para_outra_pessoa) linhas.push('para_outra_pessoa: true · relacao: ' + (e.relacao || 'não informada'));\n  return linhas.join('\\n');\n}\n\nfunction requisicao(mensagens, maxTokens) {\n  return {\n    model: MODELO,\n    temperature: 0.8,\n    max_tokens: maxTokens,\n    response_format: { type: 'json_object' },\n    messages: [{ role: 'system', content: SISTEMA }].concat(mensagens)\n  };\n}\nconst base = $('Monta núcleo').first().json;\nconst resposta = $input.first().json;\nlet nucleo = null;\ntry {\n  nucleo = JSON.parse(resposta.choices[0].message.content);\n} catch (e) {\n  return [{ json: { ...base, falha: 'Núcleo sem JSON válido: ' + (resposta.error && resposta.error.message || e.message) } }];\n}\nconst comum = base.contexto + '\\n\\nPESSOA\\n' + descreveEntrada(base.entrada) + '\\n\\nNÚCLEO\\n' + JSON.stringify(nucleo);\nconst exemplo = (parte) => 'EXEMPLO APROVADO (outra pessoa: ' + descreveEntrada(EXEMPLO_ENTRADA).replace(/\\n/g, ' · ') + ') — siga o tom e o tamanho, nunca o conteúdo:\\n' + JSON.stringify(parte);\nreturn [\n  { json: { ...base, nucleo, parte: 'A', requisicao: requisicao([{ role: 'user', content: comum + '\\n\\n' + exemplo(EXEMPLO_A) + '\\n\\n' + PARTE_A }], 3500) } },\n  { json: { ...base, nucleo, parte: 'B', requisicao: requisicao([{ role: 'user', content: comum + '\\n\\n' + exemplo(EXEMPLO_B) + '\\n\\n' + PARTE_B }], 2500) } }\n];"
},
    position: [
  1120,
  300
]
  } });

const n7 = node({ type: "n8n-nodes-base.httpRequest", version: 4.4, config: {
    name: "OpenAI — partes A e B",
    parameters: {
  "method": "POST",
  "url": "https://api.openai.com/v1/chat/completions",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "openAiApi",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify($json.requisicao) }}",
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 90000
  }
},
    credentials: {
  "openAiApi": {
    "id": "uytZDG8ilslSjmcH",
    "name": "OpenAi account"
  }
},
    onError: "continueRegularOutput",
    position: [
  1344,
  300
]
  } });

const n8 = node({ type: "n8n-nodes-base.code", version: 2, config: {
    name: "Junta",
    parameters: {
  "jsCode": "const pedidos = $('Monta partes').all().map((i) => i.json);\nconst respostas = $input.all().map((i) => i.json);\nconst base = pedidos[0] || $('Monta núcleo').first().json;\n\nfunction corpoComErro(motivo) {\n  return [{ json: { callback_url: base.callback_url, corpo: { mapa_id: base.mapa_id, erro: String(motivo).slice(0, 380) } } }];\n}\n\nif (pedidos.length === 1 && pedidos[0].falha) return corpoComErro(pedidos[0].falha);\nif (respostas.length !== pedidos.length) return corpoComErro('Resposta faltando de uma das partes');\n\nconst partes = {};\nfor (let i = 0; i < pedidos.length; i++) {\n  const r = respostas[i];\n  try {\n    partes[pedidos[i].parte] = JSON.parse(r.choices[0].message.content);\n  } catch (e) {\n    return corpoComErro('Parte ' + pedidos[i].parte + ' sem JSON válido: ' + (r.error && r.error.message || e.message));\n  }\n}\nif (!partes.A || !partes.B) return corpoComErro('Partes incompletas');\n\nconst conteudo = Object.assign({ versao: 1 }, partes.A, partes.B);\n// O nucleo manda no orgao e no titulo: as duas metades nao podem divergir.\nif (base.nucleo || pedidos[0].nucleo) {\n  const n = pedidos[0].nucleo;\n  if (conteudo.sentido_biologico && n.orgao) conteudo.sentido_biologico.orgao = n.orgao;\n  if (conteudo.capa && n.sintoma_titulo) conteudo.capa.sintoma_titulo = String(n.sintoma_titulo).slice(0, 60);\n}\nif (conteudo.programa_familiar && !conteudo.programa_familiar.arvore) conteudo.programa_familiar.arvore = {};\nreturn [{ json: { callback_url: base.callback_url, corpo: { mapa_id: base.mapa_id, conteudo } } }];"
},
    position: [
  1568,
  300
]
  } });

const n9 = node({ type: "n8n-nodes-base.httpRequest", version: 4.4, config: {
    name: "Devolve ao app",
    parameters: {
  "method": "POST",
  "url": "={{ $json.callback_url }}",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify($json.corpo) }}",
  "options": {
    "response": {
      "response": {
        "neverError": true
      }
    },
    "timeout": 30000
  }
},
    position: [
  1792,
  300
]
  } });

const nota = sticky("## MAPA — Gerador (Mapa da Origem Emocional)\n\nO app chama `POST /webhook/mapa-gerar` com `{ mapa_id, callback_url, entrada }` e recebe 202 na hora. Este fluxo gera as 14 seções e devolve em `callback_url` (`/api/mapa/resultado`).\n\n- **Núcleo** fixa órgão, conflito e título; **Parte A** (seções 1–9) e **Parte B** (10–14 + frase_forte) saem em paralelo a partir dele.\n- O app valida tudo (src/lib/mapa/conteudo.ts). Resposta 422 do callback = o modelo errou um campo: o Mapa fica em erro e a pessoa tenta de novo.\n- Prompts e exemplo: outputs/n8n/mapa-gerador.prompts.js e .exemplo.json. Mudou? Rode mapa-gerador.create.js e reimporte.\n\n**Antes de ativar:** criar a credencial Header Auth \"meDIZ Mapa\" (Authorization: Bearer <MAPA_WEBHOOK_TOKEN>) e ligá-la em \"Pedido do app\" e \"Devolve ao app\"; confirmar a tabela da base (GuiaCompleto); Paulo aprovar 10 Mapas de teste.", { name: 'Nota', position: [
  0,
  -260
], width: 820, height: 500 });

export default workflow('mapa-gerador', "MAPA — Gerador [meDIZ]", { settings: {
  "executionOrder": "v1",
  "timezone": "America/Sao_Paulo",
  "availableInMCP": true
} })
  .add(n0)
  .to(n1)
  .to(n2)
  .to(n4)
  .to(n5)
  .to(n6)
  .to(n7)
  .to(n8)
  .to(n9)
  .add(nota);
