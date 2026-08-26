import { useState } from 'react'
import { Search as SearchIcon, ChevronRight } from 'lucide-react'
import type { PageContent } from '@/lib/blocks/schema'
import { searchContent } from '@/lib/blocks/search'

interface SearchOverlayProps {
  content: PageContent
  onNavigate: (sectionId: string) => void
  onClose: () => void
}

export function SearchOverlay({ content, onNavigate, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const results = searchContent(content, query)
  const trimmed = query.trim()

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white animate-fadeIn">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="O que você procura?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl bg-gray-50 py-3 pl-10 pr-4 text-gaccent-strong outline-none focus:ring-2 focus:ring-gsecondary"
          />
        </div>
        <button onClick={onClose} className="px-2 text-sm font-bold text-gaccent">Fechar</button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {!trimmed ? (
          <p className="pt-10 text-center text-sm text-gray-400">Digite para pesquisar na página</p>
        ) : results.length === 0 ? (
          <p className="pt-10 text-center text-sm text-gray-400">Nenhum resultado para &ldquo;{query}&rdquo;</p>
        ) : (
          results.map((r, idx) => (
            <button
              key={idx}
              onClick={() => { onNavigate(r.sectionId); onClose() }}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-50 bg-white p-4 text-left shadow-sm hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-gaccent">{r.snippet}</h4>
                <p className="mt-0.5 text-[11px] text-gray-400">{r.blockType} · {r.sectionTitle}</p>
              </div>
              <ChevronRight size={18} className="text-gray-200" />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
