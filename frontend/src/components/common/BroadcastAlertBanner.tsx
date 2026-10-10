'use client'

import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertTriangle, X, ShieldAlert, Radio } from 'lucide-react'

export interface BroadcastNotificationItem {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | string
  alert_type: string
  starts_at: string
  expires_at: string | null
  is_active: boolean
  route_id?: string | null
  routes?: {
    origin?: { name: string } | null
    destination?: { name: string } | null
  } | null
  vehicles?: { name: string } | null
}

interface BroadcastAlertBannerProps {
  initialBroadcasts?: BroadcastNotificationItem[]
}

const EMPTY_SNAPSHOT: string[] = []

class DismissedAlertsStore {
  private cache: string[] = EMPTY_SNAPSHOT
  private raw: string | null = null
  private listeners = new Set<() => void>()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'dismissed_broadcasts') {
          this.raw = null
          this.notify()
        }
      })
    }
  }

  getSnapshot = (): string[] => {
    if (typeof window === 'undefined') return EMPTY_SNAPSHOT
    try {
      const raw = localStorage.getItem('dismissed_broadcasts')
      if (raw !== this.raw) {
        this.raw = raw
        this.cache = raw ? JSON.parse(raw) : EMPTY_SNAPSHOT
      }
    } catch {
      this.cache = EMPTY_SNAPSHOT
    }
    return this.cache
  }

  getServerSnapshot = (): string[] => EMPTY_SNAPSHOT

  subscribe = (callback: () => void): (() => void) => {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb())
  }

  dismiss(id: string) {
    const current = this.getSnapshot()
    if (!current.includes(id)) {
      const next = [...current, id]
      this.raw = JSON.stringify(next)
      this.cache = next
      try {
        localStorage.setItem('dismissed_broadcasts', this.raw)
      } catch (e) {
        console.error('Failed to write dismissed_broadcasts to localStorage:', e)
      }
      this.notify()
    }
  }
}

const dismissedStore = new DismissedAlertsStore()

export default function BroadcastAlertBanner({
  initialBroadcasts = [],
}: BroadcastAlertBannerProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastNotificationItem[]>(initialBroadcasts)
  const dismissedIds = useSyncExternalStore(
    dismissedStore.subscribe,
    dismissedStore.getSnapshot,
    dismissedStore.getServerSnapshot
  )

  // Subscribe to Supabase Realtime for live alert updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('public_broadcast_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcast_notifications'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as BroadcastNotificationItem
            if (newItem.is_active) {
              if (newItem.route_id && !newItem.routes) {
                const { data: routeData } = await supabase
                  .from('routes')
                  .select('origin:locations!routes_origin_id_fkey(name), destination:locations!routes_destination_id_fkey(name)')
                  .eq('id', newItem.route_id)
                  .single()
                if (routeData) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  newItem.routes = routeData as any
                }
              }
              setBroadcasts((prev) => [newItem, ...prev.filter(b => b.id !== newItem.id)])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as BroadcastNotificationItem
            if (!updatedItem.is_active) {
              setBroadcasts((prev) => prev.filter(b => b.id !== updatedItem.id))
            } else {
              setBroadcasts((prev) => prev.map(b => b.id === updatedItem.id ? { ...b, ...updatedItem } : b))
            }
          } else if (payload.eventType === 'DELETE') {
            const oldItem = payload.old as { id: string }
            setBroadcasts((prev) => prev.filter(b => b.id !== oldItem.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDismiss = (id: string) => {
    dismissedStore.dismiss(id)
  }

  // Filter alerts: must be active, not expired, and not dismissed
  const activeAlerts = broadcasts.filter((b) => {
    if (!b.is_active) return false
    if (b.expires_at && new Date(b.expires_at) <= new Date()) return false
    if (dismissedIds.includes(b.id)) return false
    return true
  })

  if (activeAlerts.length === 0) return null

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-3 z-30 relative">
      {activeAlerts.map((alert) => {
        const isCritical = alert.severity === 'critical'
        const originName = alert.routes?.origin?.name
        const destName = alert.routes?.destination?.name
        const hasRoute = originName && destName

        return (
          <aside
            key={alert.id}
            aria-label="Public Transit Alert"
            className={`relative flex items-start justify-between gap-4 p-4 sm:p-5 rounded-2xl border backdrop-blur-md shadow-md transition-all animate-fadeIn ${
              isCritical
                ? 'bg-red-500/15 border-red-500/40 text-red-950'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-4 flex-1">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                isCritical ? 'bg-red-500/20 text-red-700' : 'bg-amber-500/20 text-amber-800'
              }`}>
                {isCritical ? (
                  <ShieldAlert className="w-5 h-5 animate-pulse text-red-700" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-800" />
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] sm:text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider inline-flex items-center gap-1 ${
                    isCritical ? 'bg-red-700 text-white' : 'bg-amber-700 text-white'
                  }`}>
                    <Radio className="w-3 h-3 animate-pulse" />
                    {isCritical ? 'CRITICAL DISRUPTION' : 'SERVICE ADVISORY'}
                  </span>

                  {hasRoute && (
                    <span className="text-xs font-bold text-[#00342b] bg-white/70 px-2.5 py-0.5 rounded-full border border-black/5 shadow-xs">
                      {originName} ↔ {destName}
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-[#00342b] leading-snug">
                  {alert.title}
                </h4>

                <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/5 transition shrink-0 self-start"
              title="Dismiss this advisory"
              aria-label="Dismiss alert"
            >
              <X className="w-5 h-5" />
            </button>
          </aside>
        )
      })}
    </div>
  )
}
