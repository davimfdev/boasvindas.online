export function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr.slice()
  const copy = arr.slice()
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}
