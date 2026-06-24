export function ManualTriggerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M4 2.5v11l9-5.5-9-5.5Z" />
    </svg>
  );
}
