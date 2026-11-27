// значок крана (в lucide его нет)
export default function FaucetIcon({ size = 24, strokeWidth = 2, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 7h9a4 4 0 0 1 4 4v1" />
      <path d="M2 7h2" />
      <path d="M7 7V4h4v3" />
      <path d="M15 12h4" />
      <path d="M17 15c0 1.2-1 2-1 3a1 1 0 0 0 2 0c0-1-1-1.8-1-3z" />
    </svg>
  )
}