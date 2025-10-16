'use client'

// components/Footer.tsx

export function Footer() {
  return (
    <footer className="w-full py-4 bg-transparent">
      <div className="max-w-4xl mx-auto text-center space-y-1">
        <p className="text-xs text-zinc-400">
          meDIZ! © {new Date().getFullYear()} - Todos os direitos reservados
        </p>
        <p className="text-xs text-zinc-400">
          Universidade de Terapias – CNPJ 27.926.887/0001-08
        </p>
      </div>
    </footer>
  )
}
