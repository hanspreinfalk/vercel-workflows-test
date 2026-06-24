export function StopIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}
