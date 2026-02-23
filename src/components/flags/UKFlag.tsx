export function UKFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Bandeira do Reino Unido"
    >
      <rect width="640" height="480" fill="#012169" />
      <path
        d="M0 0h640v480H0z"
        fill="#012169"
      />
      <path
        d="M0 0l640 480M640 0L0 480"
        stroke="#FFF"
        strokeWidth="80"
        strokeLinecap="square"
      />
      <path
        d="M0 0l640 480M640 0L0 480"
        stroke="#C8102E"
        strokeWidth="53.3"
        strokeLinecap="square"
      />
      <path
        d="M320 0v480M0 240h640"
        stroke="#FFF"
        strokeWidth="80"
      />
      <path
        d="M320 0v480M0 240h640"
        stroke="#C8102E"
        strokeWidth="53.3"
      />
    </svg>
  )
}
