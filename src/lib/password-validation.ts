export const MIN_PASSWORD_LENGTH = 8;

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`At least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('One number');
  }

  return errors;
}

export function isPasswordValid(password: string): boolean {
  return getPasswordErrors(password).length === 0;
}
