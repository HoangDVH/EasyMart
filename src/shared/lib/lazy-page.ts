import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Lazy-load page component exported by name from a feature module. */
export function lazyPage<T extends ComponentType<unknown>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const module = await loader()
    const Component = module[exportName]
    if (!Component) {
      throw new Error(`Missing export "${exportName}" in lazy page module`)
    }
    return { default: Component }
  })
}
