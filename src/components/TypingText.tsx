// app/components/TypingText.tsx
'use client'
import { useEffect, useState } from 'react'

interface TypingTextProps {
  text: string
  speed?: number // ms por caractere
  className?: string
}

export function TypingText({
  text,
  speed = 80,
  className = ''
}: TypingTextProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    let idx = 0
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, idx + 1))
      idx++
      if (idx >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return <h3 className={className}>{displayed}</h3>
}
