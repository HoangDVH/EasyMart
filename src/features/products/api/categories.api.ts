import { CATEGORY_ENDPOINTS } from '@/shared/constants/catalog'
import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'
import type { Category } from '@/features/products/types/product.types'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function toIdString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function fromCodeToName(code: string): string {
  return code
    .trim()
    .replace(/[_\s]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function pickCategoryArray(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  const record = asRecord(result)
  if (!record) return []
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.content)) return record.content
  if (Array.isArray(record.categories)) return record.categories
  return []
}

function coerceCategory(raw: Record<string, unknown>): Category | null {
  const id = toIdString(raw.id ?? raw.categoryId)
  const code = typeof raw.code === 'string' ? raw.code : typeof raw.categoryCode === 'string' ? raw.categoryCode : null
  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.categoryName === 'string'
        ? raw.categoryName
        : typeof raw.displayName === 'string'
          ? raw.displayName
          : code
            ? fromCodeToName(code)
            : null
  if (!id || !name) return null
  return {
    id,
    name,
    code,
  }
}

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(CATEGORY_ENDPOINTS.list)
    return pickCategoryArray(data.result)
      .map((row) => asRecord(row))
      .filter(Boolean)
      .map((row) => coerceCategory(row as Record<string, unknown>))
      .filter((c): c is Category => c !== null)
  },
}
