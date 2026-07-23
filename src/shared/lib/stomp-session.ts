import { Client, type StompSubscription } from '@stomp/stompjs'
import { env } from '@/shared/config/env'

export type SharedStompStatus = 'connecting' | 'connected' | 'disconnected'

type MessageHandler = (body: string) => void

type Listener = {
  id: string
  destination: string
  handler: MessageHandler
}

function resolveBrokerUrl(): string {
  if (env.WS_URL) return env.WS_URL
  return `${env.API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/ws`
}

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Một kết nối STOMP dùng chung (orders + reviews).
 * retain/release theo số nơi cần realtime; subscribe theo destination.
 */
class SharedStompSession {
  private client: Client | null = null
  private token: string | null = null
  private retainCount = 0
  private listeners = new Map<string, Listener>()
  private stompSubs = new Map<string, StompSubscription>()
  private status: SharedStompStatus = 'disconnected'
  private statusHandlers = new Set<(status: SharedStompStatus) => void>()

  getStatus() {
    return this.status
  }

  onStatus(handler: (status: SharedStompStatus) => void) {
    this.statusHandlers.add(handler)
    handler(this.status)
    return () => {
      this.statusHandlers.delete(handler)
    }
  }

  private setStatus(next: SharedStompStatus) {
    this.status = next
    for (const handler of this.statusHandlers) handler(next)
  }

  retain(accessToken: string) {
    this.retainCount += 1
    if (this.client && this.token === accessToken) return
    this.token = accessToken
    this.reconnect(accessToken)
  }

  release() {
    this.retainCount = Math.max(0, this.retainCount - 1)
    if (this.retainCount > 0) return
    void this.client?.deactivate()
    this.client = null
    this.token = null
    this.stompSubs.clear()
    this.setStatus('disconnected')
  }

  subscribe(destination: string, handler: MessageHandler) {
    const id = makeId()
    this.listeners.set(id, { id, destination, handler })
    this.attachListener(id)
    return () => {
      const sub = this.stompSubs.get(id)
      sub?.unsubscribe()
      this.stompSubs.delete(id)
      this.listeners.delete(id)
    }
  }

  private reconnect(accessToken: string) {
    void this.client?.deactivate()
    this.stompSubs.clear()
    this.setStatus('connecting')

    const client = new Client({
      brokerURL: resolveBrokerUrl(),
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.setStatus('connected')
        for (const id of this.listeners.keys()) {
          this.attachListener(id)
        }
      },
      onWebSocketClose: () => this.setStatus('disconnected'),
      onStompError: () => this.setStatus('disconnected'),
    })

    this.client = client
    client.activate()
  }

  private attachListener(id: string) {
    const listener = this.listeners.get(id)
    const client = this.client
    if (!listener || !client?.connected) return
    this.stompSubs.get(id)?.unsubscribe()
    const sub = client.subscribe(listener.destination, (message) => {
      listener.handler(message.body)
    })
    this.stompSubs.set(id, sub)
  }
}

export const sharedStompSession = new SharedStompSession()
