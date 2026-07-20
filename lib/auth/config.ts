export function getMissingAuthEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  return missing;
}

export function getAuthConfigError(): string | null {
  const missing = getMissingAuthEnvVars();
  if (missing.length === 0) {
    return null;
  }

  return `Authentication is not configured correctly. Missing environment variable(s): ${missing.join(', ')}.`;
}
