export function OpenCodeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 20"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M12 16H4V8H12V16Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M12 4H4V16H12V4ZM16 20H0V0H16V20Z"
        fill="currentColor"
      />
    </svg>
  );
}
