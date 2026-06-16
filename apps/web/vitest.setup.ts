import '@testing-library/jest-dom'

// jsdom has no ResizeObserver; useGridRowSpan relies on it. Stub so component renders don't throw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver)
