export function BrazilFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira do Brasil"
    >
      <rect width="640" height="480" fill="#009739" />
      <path
        d="M320 240c0 88.4-71.6 160-160 160S0 328.4 0 240 71.6 80 160 80s160 71.6 160 160z"
        fill="#FEDD00"
      />
      <path
        d="M320 240c0 88.4-71.6 160-160 160S0 328.4 0 240 71.6 80 160 80s160 71.6 160 160z"
        fill="#012169"
        opacity="0.1"
      />
      <circle cx="320" cy="240" r="80" fill="#012169" />
      <path
        d="M280 200l40 40-40 40-40-40z"
        fill="#FEDD00"
      />
      <path
        d="M320 200l40 40-40 40-40-40z"
        fill="#FEDD00"
      />
      <path
        d="M300 220l20 20-20 20-20-20z"
        fill="#009739"
      />
    </svg>
  )
}
