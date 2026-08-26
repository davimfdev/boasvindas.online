export const RESERVED_SLUGS = new Set([
  'app', 'api', 'login', 'cadastro', 'logout',
  'pricing', 'sobre', 'termos', 'privacidade',
  'admin', 'dashboard', 'settings', 'blog',
])

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50)
}

export function isSlugReserved(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

export function isSlugValid(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,49}$/.test(slug)
}
