import Image from 'next/image'
import { BookOpen, CircleCheck, User } from 'lucide-react'
import styles from './mapa.module.css'

/** Pecas repetidas nas telas do Mapa. */

export function Marca() {
  return (
    <div className={styles.brand}>
      <i />
      <b>meDIZ!</b>
    </div>
  )
}

export function CapaMapa({ tamanho, className }: { tamanho: number; className?: string }) {
  return (
    <Image
      src="/mapa/capa.webp"
      alt="Capa do Mapa da Origem Emocional"
      width={tamanho}
      height={tamanho}
      className={className}
      style={{ borderRadius: tamanho > 60 ? 14 : 10 }}
      priority
    />
  )
}

export function SelosConfianca() {
  return (
    <div className={styles.foot}>
      <div>
        <BookOpen size={18} color="#6366f1" />
        <span>
          Baseado no livro <b>O Corpo Diz</b>
        </span>
      </div>
      <div>
        <CircleCheck size={18} color="#6366f1" />
        <span>
          Validado por <b>terapeutas</b>
        </span>
      </div>
      <div>
        <User size={18} color="#6366f1" />
        <span>
          Prof. <b>Paulo Barbosa</b>
        </span>
      </div>
    </div>
  )
}
