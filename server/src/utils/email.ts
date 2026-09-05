/**
 * The one place that decides what an e-mail address *is* for this product.
 *
 * Identity has to be a single value, or the same person becomes two accounts:
 * a phone keyboard capitalising the first letter at sign-up is enough. Login,
 * registration, the per-account rate limiter and any future password recovery
 * all compare against this form, and the database enforces it with a CHECK.
 */
export function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}
