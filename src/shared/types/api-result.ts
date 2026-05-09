/** Envelope JSON thường gặp ở backend Spring của project */
export type ApiEnvelope<T> = {
  code: number
  message: string
  result: T
}
