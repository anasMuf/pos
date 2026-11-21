export type PasswordStrength = 'weak' | 'medium' | 'strong';

/**
 * Rough strength estimate for registration feedback only. The server remains the
 * authority on password policy; this just nudges users towards better passwords.
 */
export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}

export const PASSWORD_STRENGTH_LABEL: Record<PasswordStrength, string> = {
  weak: 'Lemah',
  medium: 'Sedang',
  strong: 'Kuat',
};
