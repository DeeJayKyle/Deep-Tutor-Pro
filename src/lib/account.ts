/** Why the new-account form cannot be sent yet, or '' when it can. */
export function createProblem(username: string, password: string, repeat: string): string {
  const u = username.trim();
  if (!u) return 'Choose a username: 3–64 letters, numbers, dots, dashes or underscores, or your email address.';
  if (!/^(?:[A-Za-z0-9_.-]{3,64}|[^@\s]{1,64}@[^@\s]+\.[^@\s]+)$/.test(u)) return 'Usernames use 3–64 letters, numbers, dots, dashes or underscores, or are an email address.';
  if (password.length < 8) return 'Passwords need at least 8 characters.';
  if (password !== repeat) return 'The two passwords are different.';
  return '';
}
