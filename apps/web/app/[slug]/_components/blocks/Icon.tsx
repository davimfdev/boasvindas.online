import * as Lucide from 'lucide-react'
import { HelpCircle, type LucideProps } from 'lucide-react'

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Lucide as unknown as Record<string, React.ComponentType<LucideProps>>)[name] ?? HelpCircle
  return <Cmp {...props} />
}
