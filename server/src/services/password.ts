import bcrypt from 'bcryptjs'

const COST = 12

/**
 * Hash of a value no user can produce. Comparing against it keeps the response
 * time of an unknown email identical to a known one, blocking enumeration.
 */
const DUMMY_HASH = '$2a$12$LCKVGPkZasFme5oXALhh6ubFv4B.0KBaseFXnPT9aMRRNGnWxLcKm'

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export function verifyPassword(plain: string, hash: string | undefined): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH)
}
