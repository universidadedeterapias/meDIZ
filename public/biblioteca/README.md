# Biblioteca — arquivos por idioma

O app usa o **idioma selecionado** no meDIZ (cookie `mediz-language`: `pt-BR`, `pt-PT`, `en`, `es`).
Se faltar arquivo no idioma, tenta fallback (ex.: `pt-PT` → `pt-BR` → `en` → `es`).

## Estrutura de pastas

```
public/biblioteca/
├── audioterapias/          ← pasta usada no projeto (com "s")
│   ├── Audioterapia Dor Existencial/
│   │   ├── 1- Instruções....mp3
│   │   └── 2- Audioterapia Dor Existencial.mp3
│   ├── Audioterapia Liberando Traumas/
│   │   └── AUDIOTERAPIA LIBERANDO TRAUMAS.mp4
│   └── ...
├── audioterapia/           ← alternativa (sem "s"), 1 arquivo por idioma
│   └── pt-BR.mp4
├── livro-digital/
│   ├── pt-BR.pdf
│   ├── pt-PT.pdf
│   ├── en.pdf
│   └── es.pdf
└── pdf/
    ├── pt-BR/
    │   ├── material-1.pdf
    │   └── material-2.pdf
    ├── pt-PT/
    │   ├── material-1.pdf
    │   └── material-2.pdf
    ├── en/
    │   ├── material-1.pdf
    │   └── material-2.pdf
    └── es/
        ├── material-1.pdf
        └── material-2.pdf
```

## Regras

| Tipo | Arquivos | Quem acessa |
|------|----------|-------------|
| Audioterapia | 1 MP3/MP4 por idioma **ou** vários arquivos (1 por produto no admin) | Permissão `audioterapia` |
| Livro digital | 1 PDF por idioma | Permissão `livro_digital` |
| PDF | **2 PDFs** por idioma (`material-1` e `material-2`) | Permissão `pdf` — **as duas versões** |

Os nomes `material-1.pdf` e `material-2.pdf` são fixos no código.
Renomeie seus arquivos ao colar nas pastas ou altere `src/lib/library/contentPaths.ts`.

## Deploy (Vercel / produção)

Os PDFs e áudios **não vão no Git** (são grandes). Em produção, use uma destas opções:

1. **Admin** → Catálogo → enviar PDF no produto (grava URL do Cloudinary no banco).
2. **Script** (com Cloudinary no `.env`): `npm run sync:library-cloudinary`
3. **Variáveis de ambiente** — veja `.env.example` (`LIBRARY_LIVRO_DIGITAL_URL_*`, `LIBRARY_PDF_URL_*`).

Em desenvolvimento local, basta manter os arquivos nesta pasta.

## Permissões (Hotmart)

Continua igual: o n8n envia `permissoes` no `PUT /api/library/permissions`.
Idioma **não** vem do Hotmart — vem do seletor de idioma do app na hora do download.
