import Link from 'next/link'
import { ExternalLink, LayoutGrid, Hammer } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NewPageDialog } from './_components/NewPageDialog'
import { PublishToggle } from './_components/PublishToggle'
import { EditPageDialog } from './_components/EditPageDialog'

const THEME_ACCENT: Record<string, string> = {
  modern: 'from-[#0d9488] to-[#5eead4]',
  rustic: 'from-[#5d4017] to-[#d99a2b]',
}

export default async function DashboardPage() {
  const session = await auth()
  const userPages = await db
    .select()
    .from(pages)
    .where(eq(pages.userId, session!.user!.id))
    .orderBy(pages.createdAt)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0a0a0a]">Suas páginas</h1>
          <p className="mt-1 text-black/50">Crie e gerencie as boas-vindas dos seus hóspedes.</p>
        </div>
        <NewPageDialog />
      </div>

      {userPages.length === 0 ? (
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-black/15 bg-[#fdfdfb] py-20 text-center">
          <div className="rounded-2xl bg-[#0d9488]/10 p-4 text-[#0d9488]">
            <LayoutGrid className="size-7" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[#0a0a0a]">Nenhuma página ainda</p>
            <p className="mt-1 text-sm text-black/50">Crie a primeira página de boas-vindas do seu apartamento.</p>
          </div>
          <NewPageDialog />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {userPages.map((page) => (
            <article
              key={page.id}
              className="group overflow-hidden rounded-3xl border border-black/8 bg-[#fdfdfb] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
            >
              <div className={`h-1.5 bg-gradient-to-r ${THEME_ACCENT[page.theme] ?? THEME_ACCENT.modern}`} />
              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display truncate text-xl font-bold text-[#0a0a0a]">{page.title}</h2>
                    <span className="block truncate font-mono text-sm text-black/45">/{page.slug}</span>
                  </div>
                  <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                    {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PublishToggle pageId={page.id} published={page.status === 'published'} />
                  <Button variant="outline" size="sm" render={<Link href={`/app/${page.id}/edit`} />}>
                    <Hammer className="size-4" />
                    Construir
                  </Button>
                  <EditPageDialog page={page} />
                  <Button variant="outline" size="sm" render={<Link href={`/${page.slug}`} target="_blank" />}>
                    <ExternalLink className="size-4" />
                    Ver
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
