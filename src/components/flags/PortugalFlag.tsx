export function PortugalFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira de Portugal"
    >
      <rect width="640" height="480" fill="#006600" />
      <rect x="0" y="0" width="320" height="480" fill="#FF0000" />
      <circle cx="160" cy="240" r="80" fill="#FFD700" />
      <circle cx="160" cy="240" r="60" fill="#006600" />
      <path
        d="M160 200l20 20-20 20-20-20z"
        fill="#FF0000"
      />
      <path
        d="M160 240l20 20-20 20-20-20z"
        fill="#FF0000"
      />
      <path
        d="M160 280l20 20-20 20-20-20z"
        fill="#FF0000"
      />
    </svg>
  )
}
