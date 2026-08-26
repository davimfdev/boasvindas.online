import { useEffect, useRef, useState } from 'react'
import { gridRowSpan } from './layout'

// Measures an element's natural height and returns the implicit grid rows it should span.
// Attach `ref` to the content wrapper (height:auto), apply `span` as the grid item's row span.
export function useGridRowSpan<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [span, setSpan] = useState(1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSpan(gridRowSpan(el.getBoundingClientRect().height))
    const observer = new ResizeObserver(update)
    observer.observe(el)
    update()
    return () => observer.disconnect()
  }, [])

  return { ref, span }
}
