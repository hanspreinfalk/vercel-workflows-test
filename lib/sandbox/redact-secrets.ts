const TOKEN_PATTERNS = [
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgho_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /x-access-token:[^\s@]+/g,
  /https:\/\/x-access-token:[^\s@]+@github\.com/g,
];

export function redactSecrets(text: string, extraSecrets: string[] = []): string {
  let redacted = text;

  for (const secret of extraSecrets) {
    if (!secret) continue;
    redacted = redacted.split(secret).join("[REDACTED]");
  }

  for (const pattern of TOKEN_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }

  return redacted;
}
