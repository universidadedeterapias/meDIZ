export function SpainFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira da Espanha"
    >
      <rect width="640" height="480" fill="#AA151B" />
      <rect y="120" width="640" height="240" fill="#F1BF00" />
      <rect y="180" width="640" height="120" fill="#AA151B" />
    </svg>
  )
}
