import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NewPageDialog } from './_components/NewPageDialog'

export default async function DashboardPage() {
  const session = await auth()
  const userPages = await db
    .select()
    .from(pages)
    .where(eq(pages.userId, session!.user!.id))
    .orderBy(pages.createdAt)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Suas páginas</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie as páginas de boas-vindas dos seus hóspedes.</p>
        </div>
        <NewPageDialog />
      </div>

      {userPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não criou nenhuma página.</p>
            <NewPageDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {userPages.map((page) => (
            <Card key={page.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{page.title}</CardTitle>
                <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                  {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                </Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm text-muted-foreground">/{page.slug}</span>
                <Button variant="outline" size="sm" render={<Link href={`/${page.slug}`} target="_blank" />}>
                  <ExternalLink className="size-4" />
                  Ver
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
