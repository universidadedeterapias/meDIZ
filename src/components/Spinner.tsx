// components/Spinner.tsx
'use client'

export default function Spinner({ size = 16 }: { size?: number }) {
  const px = `${size}px`
  return (
    <div
      className="inline-block animate-spin rounded-full border-4 border-current border-r-transparent text-white"
      style={{ width: px, height: px }}
      role="status"
      aria-label="Loading"
    />
  )
}
