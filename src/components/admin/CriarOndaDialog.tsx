'use client'

/**
 * Configurar a onda a partir do recorte que esta na tela.
 *
 * Criar nao dispara: a onda nasce em rascunho e a lista fica congelada
 * esperando alguem olhar o numero. E de proposito que o botao perigoso mora na
 * outra tela — separar "montei a lista" de "mandei a mensagem" e o que da a
 * chance de conferir no meio.
 */

import { useState } from 'react'
import { Loader2, Send, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  FONTES_VARIAVEL,
  MODOS_AMOSTRAGEM,
  ROTULO_ESTADO,
  ROTULO_FONTE_VARIAVEL,
  ROTULO_MODO_AMOSTRAGEM,
  ROTULO_ORIGEM,
  tamanhoAmostra,
  type Amostragem,
  type Estado,
  type FonteVariavel,
  type MapeamentoVariavel,
  type ModoAmostragem,
  type Origem,
  type SelecaoPublico
} from '@/lib/reativacao/tipos'

type Props = {
  aberto: boolean
  onClose: () => void
  selecao: SelecaoPublico
  totalSelecionado: number
  onCriada: (id: string) => void
}

function Campo({
  rotulo,
  dica,
  children
}: {
  rotulo: string
  dica?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{rotulo}</label>
      {children}
      {dica && <p className="text-[11px] leading-snug text-muted-foreground">{dica}</p>}
    </div>
  )
}

export function CriarOndaDialog({
  aberto,
  onClose,
  selecao,
  totalSelecionado,
  onCriada
}: Props) {
  const [nome, setNome] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateLang, setTemplateLang] = useState('pt_BR')
  const [variaveis, setVariaveis] = useState<MapeamentoVariavel[]>([
    { posicao: 1, fonte: 'primeiro_nome' }
  ])
  const [temBotao, setTemBotao] = useState(true)
  const [amostragemModo, setAmostragemModo] = useState<ModoAmostragem>('todos')
  const [amostragemValor, setAmostragemValor] = useState(100)
  const [crmScenarioId, setCrmScenarioId] = useState('')
  const [crmStepId, setCrmStepId] = useState('')
  const [tetoDiario, setTetoDiario] = useState(700)
  const [horaInicio, setHoraInicio] = useState(8)
  const [horaFim, setHoraFim] = useState(20)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const amostragem: Amostragem = {
    modo: amostragemModo,
    valor: amostragemModo === 'todos' ? null : amostragemValor
  }
  const tamanhoOnda = tamanhoAmostra(amostragem, totalSelecionado)
  const amostragemVazia = amostragemModo !== 'todos' && tamanhoOnda === 0
  const bloqueado = totalSelecionado === 0 || amostragemVazia

  const criar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch('/api/admin/reativacao/campanhas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          templateName,
          templateLang,
          crmScenarioId: crmScenarioId || null,
          crmStepId: crmStepId || null,
          variaveis,
          botao: temBotao ? { tipo: 'url', fonte: 'token' } : null,
          amostragem,
          tetoDiario,
          horaInicio,
          horaFim,
          selecao
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Falha ao criar a onda.')
        return
      }
      onCriada(json.id)
    } catch {
      setErro('Não foi possível falar com o servidor.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova onda de reativação</DialogTitle>
          <DialogDescription>
            A lista é congelada agora e nunca recalculada. A onda nasce em
            rascunho — nada sai até alguém ativar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm">
              <span className="text-2xl font-semibold tabular-nums">
                {totalSelecionado.toLocaleString('pt-BR')}
              </span>
              <span className="ml-1.5 text-muted-foreground">
                {selecao.modo === 'lista' ? 'pessoas selecionadas' : 'pessoas no recorte'}
              </span>
            </p>
            {selecao.modo === 'filtro' ? (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {selecao.filtros.estados.map((e: Estado) => (
                  <span key={e} className="rounded border bg-background px-1.5 py-0.5">
                    {ROTULO_ESTADO[e]}
                  </span>
                ))}
                {selecao.filtros.incluirOrigens.map((o: Origem) => (
                  <span
                    key={`i${o}`}
                    className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-800"
                  >
                    + {ROTULO_ORIGEM[o]}
                  </span>
                ))}
                {selecao.filtros.excluirOrigens.map((o: Origem) => (
                  <span
                    key={`e${o}`}
                    className="rounded border border-destructive/40 bg-destructive/5 px-1.5 py-0.5 text-destructive"
                  >
                    − {ROTULO_ORIGEM[o]}
                  </span>
                ))}
                <span className="rounded border bg-background px-1.5 py-0.5">
                  corte {selecao.filtros.corte}d
                </span>
                {selecao.excluidos.length > 0 && (
                  <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-900">
                    − {selecao.excluidos.length} excluído(s) manualmente
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Seleção manual, marcada uma a uma na tela — sem filtro por trás.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Quantas pessoas entram nesta onda
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {MODOS_AMOSTRAGEM.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAmostragemModo(m)
                    if (m === 'percentual') setAmostragemValor(20)
                    if (m === 'quantidade') setAmostragemValor(Math.min(500, totalSelecionado))
                  }}
                  className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    amostragemModo === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {ROTULO_MODO_AMOSTRAGEM[m]}
                </button>
              ))}
            </div>

            {amostragemModo !== 'todos' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={amostragemModo === 'percentual' ? 100 : undefined}
                  value={amostragemValor}
                  onChange={(e) => setAmostragemValor(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 w-28 text-xs"
                />
                <span className="text-[11px] text-muted-foreground">
                  {amostragemModo === 'percentual' ? '% do recorte, sorteado ao acaso' : 'pessoas, sorteadas ao acaso do recorte'}
                </span>
              </div>
            )}

            <p className="text-[11px] leading-snug text-muted-foreground">
              {amostragemModo === 'todos' ? (
                <>Todas as <strong>{totalSelecionado.toLocaleString('pt-BR')}</strong> pessoas selecionadas recebem a onda.</>
              ) : amostragemVazia ? (
                'Esse valor não sorteia ninguém — aumente a quantidade ou o percentual.'
              ) : (
                <>
                  Sorteio de <strong>{tamanhoOnda.toLocaleString('pt-BR')}</strong> de{' '}
                  {totalSelecionado.toLocaleString('pt-BR')} pessoas
                  {totalSelecionado > 0 && <> ({Math.round((tamanhoOnda / totalSelecionado) * 100)}%)</>}. Cada onda
                  sorteia de novo — repetir a seleção não repete as mesmas pessoas.
                </>
              )}
            </p>
          </div>

          {totalSelecionado === 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Marque ao menos uma pessoa na tela antes de criar — pelo checkbox de cada
                linha, ou "marcar todos do filtro".
              </span>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-snug text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Quem estiver em estado <strong>Ativo</strong> é bloqueado pelo servidor na hora
              de criar, mesmo que tenha sido selecionado — mandar "volta pro app" para quem
              já usa destrói credibilidade. A tabela mostra o estado de cada linha antes de
              você marcar.
            </p>
          )}

          <Campo rotulo="Nome da onda" dica="Só para você achar depois. Ex.: “Dormentes · setembro”.">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Dormentes · setembro"
            />
          </Campo>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Campo
              rotulo="Template aprovado na Meta"
              dica="Nome exato. Template que não existe volta erro 500 no envio."
            >
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="reativacao_dormente"
              />
            </Campo>
            <Campo rotulo="Idioma">
              <Input
                value={templateLang}
                onChange={(e) => setTemplateLang(e.target.value)}
                placeholder="pt_BR"
              />
            </Campo>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-medium">Variáveis do template</label>
              <button
                type="button"
                onClick={() =>
                  setVariaveis((v) => [
                    ...v,
                    { posicao: v.length + 1, fonte: 'primeiro_nome' }
                  ])
                }
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                + acrescentar
              </button>
            </div>

            {variaveis.length === 0 && (
              <p className="rounded-md border border-dashed p-2.5 text-[11px] text-muted-foreground">
                Nenhuma. Use se o template não tiver <code>{'{{1}}'}</code>.
              </p>
            )}

            {variaveis.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-9 shrink-0 rounded border bg-muted px-1.5 py-1 text-center text-[11px] font-medium tabular-nums">
                  {`{{${v.posicao}}}`}
                </span>
                <select
                  value={v.fonte}
                  onChange={(e) =>
                    setVariaveis((lista) =>
                      lista.map((x, j) =>
                        j === i ? { ...x, fonte: e.target.value as FonteVariavel } : x
                      )
                    )
                  }
                  className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                >
                  {FONTES_VARIAVEL.map((f) => (
                    <option key={f} value={f}>
                      {ROTULO_FONTE_VARIAVEL[f]}
                    </option>
                  ))}
                </select>
                {v.fonte === 'literal' && (
                  <Input
                    value={v.valor ?? ''}
                    onChange={(e) =>
                      setVariaveis((lista) =>
                        lista.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x))
                      )
                    }
                    placeholder="texto fixo"
                    className="h-8 flex-1 text-xs"
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setVariaveis((lista) =>
                      lista
                        .filter((_, j) => j !== i)
                        .map((x, j) => ({ ...x, posicao: j + 1 }))
                    )
                  }
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remover variável"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs">
              <input
                type="checkbox"
                checked={temBotao}
                onChange={(e) => setTemBotao(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5"
              />
              <span>
                O template tem botão de URL
                <span className="block text-[11px] text-muted-foreground">
                  A base do botão na Meta precisa ser <code>https://mediz.app/r/</code> —
                  ela guarda a base e concatena só o token, que é o que registra o
                  clique.
                </span>
              </span>
            </label>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Cenário no CRM" dica="Opcional. Para onde a conversa anda depois do envio.">
              <Input
                value={crmScenarioId}
                onChange={(e) => setCrmScenarioId(e.target.value)}
                placeholder="cmr..."
              />
            </Campo>
            <Campo rotulo="Etapa no CRM" dica="Opcional.">
              <Input
                value={crmStepId}
                onChange={(e) => setCrmStepId(e.target.value)}
                placeholder="cmr..."
              />
            </Campo>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Teto por dia" dica="O plano recomenda 700 a 1.000.">
              <Input
                type="number"
                min={1}
                value={tetoDiario}
                onChange={(e) => setTetoDiario(Math.max(1, Number(e.target.value) || 1))}
              />
            </Campo>
            <Campo rotulo="A partir das">
              <Input
                type="number"
                min={0}
                max={23}
                value={horaInicio}
                onChange={(e) => setHoraInicio(Number(e.target.value) || 0)}
              />
            </Campo>
            <Campo rotulo="Até as" dica="Horário de São Paulo.">
              <Input
                type="number"
                min={0}
                max={23}
                value={horaFim}
                onChange={(e) => setHoraFim(Number(e.target.value) || 0)}
              />
            </Campo>
          </div>

          <p className="text-[11px] leading-snug text-muted-foreground">
            Teto e janela são regra da fila, não disciplina de quem aperta o botão:
            o worker não entrega nada fora disso, mesmo que a onda esteja ativa.
          </p>

          {erro && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {erro}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={criar}
            disabled={salvando || bloqueado || !nome.trim() || !templateName.trim()}
          >
            {salvando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Criar rascunho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
