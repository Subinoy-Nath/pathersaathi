import { SupabaseClient } from '@supabase/supabase-js'

export interface BufferedLocation {
  schedule_id: string
  vehicle_id: string
  driver_id: string
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  accuracy: number | null
  recorded_at: string
}

const DB_NAME = 'pathersaathi_telemetry_cache'
const STORE_NAME = 'gps_buffer'
const MAX_BUFFER_SIZE = 50

class OfflineGpsBuffer {
  private memoryFallback: BufferedLocation[] = []

  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) return null

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { autoIncrement: true })
          }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }

  // Push new ping to ring buffer; discard oldest if > MAX_BUFFER_SIZE
  public async push(point: BufferedLocation): Promise<void> {
    const db = await this.getDB()
    if (!db) {
      if (this.memoryFallback.length >= MAX_BUFFER_SIZE) {
        this.memoryFallback.shift() // drop oldest
      }
      this.memoryFallback.push(point)
      return
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const countReq = store.count()

        countReq.onsuccess = () => {
          if (countReq.result >= MAX_BUFFER_SIZE) {
            // Open cursor and delete oldest record
            const cursorReq = store.openCursor()
            cursorReq.onsuccess = () => {
              const cursor = cursorReq.result
              if (cursor) {
                store.delete(cursor.key)
              }
            }
          }
          store.add(point)
          resolve()
        }
        countReq.onerror = () => {
          // fallback to memory
          if (this.memoryFallback.length >= MAX_BUFFER_SIZE) {
            this.memoryFallback.shift()
          }
          this.memoryFallback.push(point)
          resolve()
        }
      } catch {
        resolve()
      }
    })
  }

  // Count pending records in buffer
  public async count(): Promise<number> {
    const db = await this.getDB()
    if (!db) return this.memoryFallback.length

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).count()
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(this.memoryFallback.length)
      } catch {
        resolve(this.memoryFallback.length)
      }
    })
  }

  // Replay all buffered points to Supabase in chunks of 10
  // Returns count of successfully replayed records
  public async replayAll(supabase: SupabaseClient): Promise<number> {
    const db = await this.getDB()
    let records: BufferedLocation[] = []

    if (!db) {
      records = [...this.memoryFallback]
      this.memoryFallback = []
    } else {
      records = await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const store = tx.objectStore(STORE_NAME)
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result || [])
          req.onerror = () => resolve([])
        } catch {
          resolve([])
        }
      })
    }

    if (records.length === 0) return 0

    let successfullyFlushed = 0
    const chunkSize = 10

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      try {
        const { error } = await supabase.from('trip_locations').insert(chunk)
        if (error) {
          console.warn('Failed to upload buffered chunk:', error.message)
          // Keep remaining records in buffer
          const remaining = records.slice(i)
          if (!db) {
            this.memoryFallback = remaining
          } else {
            const clearTx = db.transaction(STORE_NAME, 'readwrite')
            const store = clearTx.objectStore(STORE_NAME)
            store.clear()
            remaining.forEach((p) => store.add(p))
          }
          return successfullyFlushed
        }
        successfullyFlushed += chunk.length
      } catch (err) {
        console.error('Network or database exception while replaying buffered points:', err)
        return successfullyFlushed
      }
    }

    // Clear IndexedDB store on full success
    if (db) {
      try {
        const clearTx = db.transaction(STORE_NAME, 'readwrite')
        clearTx.objectStore(STORE_NAME).clear()
      } catch {
        // ignore
      }
    }

    return successfullyFlushed
  }

  public async clear(): Promise<void> {
    this.memoryFallback = []
    const db = await this.getDB()
    if (db) {
      try {
        const clearTx = db.transaction(STORE_NAME, 'readwrite')
        clearTx.objectStore(STORE_NAME).clear()
      } catch {
        // ignore
      }
    }
  }
}

export const offlineBuffer = new OfflineGpsBuffer()
