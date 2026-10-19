// Converte mapa_gerador_create.json no codigo do @n8n/workflow-sdk que o MCP do
// n8n aceita (create_workflow_from_code / update_workflow).
//   node outputs/n8n/mapa-gerador.create.js outputs/n8n && node outputs/n8n/mapa-gerador.sdk-build.js
const fs = require('fs');
const path = require('path');
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'mapa_gerador_create.json'), 'utf8'));
const porNome = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
const J = (v) => JSON.stringify(v, null, 2);
const vars = {};
const nomeVar = (n, i) => (vars[n.name] = 'n' + i);
// A credencial "meDIZ Mapa" ainda nao existe no n8n: liga-se na tela depois.
const credsDe = (n) => (n.credentials && !JSON.stringify(n.credentials).includes("PREENCHER") ? n.credentials : null);
const cfg = (n, extra = '') => `{
    name: ${J(n.name)},
    parameters: ${J(n.parameters)},${credsDe(n) ? `\n    credentials: ${J(credsDe(n))},` : ''}${n.onError ? `\n    onError: ${J(n.onError)},` : ''}${n.alwaysOutputData ? '\n    alwaysOutputData: true,' : ''}
    position: ${J(n.position)}${extra}
  }`;
const linhas = [];
wf.nodes.forEach((n, i) => {
  const v = nomeVar(n, i);
  if (n.type === 'n8n-nodes-base.stickyNote') return;
  if (n.name === 'Embeddings OpenAI') {
    linhas.push(`const ${v} = embedding({ type: ${J(n.type)}, version: ${n.typeVersion}, config: ${cfg(n)} });`);
    return;
  }
  const fn = n.type === 'n8n-nodes-base.webhook' ? 'trigger' : 'node';
  const extra = n.name === 'Busca no O Corpo Diz' ? `,\n    subnodes: { embedding: ${vars['Embeddings OpenAI'] || 'EMB'} }` : '';
  linhas.push(`const ${v} = ${fn}({ type: ${J(n.type)}, version: ${n.typeVersion}, config: ${cfg(n, extra)} });`);
});
// embeddings precisa existir antes do vector store
const iEmb = linhas.findIndex((l) => l.includes('embedding({'));
if (iEmb !== -1) linhas.unshift(linhas.splice(iEmb, 1)[0]);
const nota = porNome['Nota'];
const cadeia = ['Pedido do app', 'Prepara', 'Pesquisa do sintoma (meDIZ)', 'Monta núcleo', 'OpenAI — núcleo', 'Monta partes', 'OpenAI — partes A e B', 'Junta', 'Devolve ao app'];
const codigo = `import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';

// Gerado por mapa-gerador.sdk-build.js a partir de mapa_gerador_create.json. Nao editar a mao.

${linhas.join('\n\n').replace('subnodes: { embedding: EMB }', 'subnodes: { embedding: ' + vars['Embeddings OpenAI'] + ' }')}

const nota = sticky(${J(nota.parameters.content)}, { name: 'Nota', position: ${J(nota.position)}, width: ${nota.parameters.width}, height: ${nota.parameters.height} });

export default workflow('mapa-gerador', ${J(wf.name)}, { settings: ${J(wf.settings)} })
  .add(${vars[cadeia[0]]})
${cadeia.slice(1).map((c) => `  .to(${vars[c]})`).join('\n')}
  .add(nota);
`;
fs.writeFileSync(path.join(__dirname, 'mapa-gerador.sdk.js'), codigo);
console.log('ok', codigo.length);
