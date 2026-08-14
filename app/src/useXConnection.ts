import { useCallback, useEffect, useState } from 'react'
import {
  disconnectX,
  fetchXConnection,
  hasApi,
  startXOAuth,
  type XConnection,
} from './api'

const EMPTY: XConnection = { connected: false, handle: null, configured: true }

export type XConnectionState = XConnection & {
  loading: boolean
  error: string
  banner: string
  refresh: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  clearBanner: () => void
}

export function useXConnection(enabled = true): XConnectionState {
  const [conn, setConn] = useState<XConnection>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')

  const refresh = useCallback(async () => {
    if (!hasApi()) {
      setConn({ connected: false, handle: null, configured: false })
      setLoading(false)
      return
    }
    try {
      const next = await fetchXConnection()
      setConn(next)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'connection_failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('x')
    if (flag === 'connected' || flag === 'error') {
      const reason = params.get('reason') || ''
      const url = new URL(window.location.href)
      url.searchParams.delete('x')
      url.searchParams.delete('reason')
      const next = url.pathname + url.search + url.hash
      window.history.replaceState({}, '', next)
      if (flag === 'connected') {
        setBanner('Connected to X. Posts from your account. Radar still uses public posts.')
      } else {
        setBanner(reason === 'x_not_configured' ? 'X posting not configured' : 'Could not connect X. Try again.')
      }
    }
    if (enabled) void refresh()
    else setLoading(false)
  }, [refresh, enabled])

  const connect = useCallback(async () => {
    setError('')
    if (!conn.configured) {
      setError('X posting not configured')
      return
    }
    try {
      const { url } = await startXOAuth()
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'X posting not configured')
    }
  }, [conn.configured])

  const disconnect = useCallback(async () => {
    setError('')
    try {
      await disconnectX()
      setConn((prev) => ({ ...prev, connected: false, handle: null }))
      setBanner('Disconnected X posting.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'disconnect_failed')
    }
  }, [])

  const clearBanner = useCallback(() => {
    setBanner('')
    setError('')
  }, [])

  return {
    ...conn,
    loading,
    error,
    banner,
    refresh,
    connect,
    disconnect,
    clearBanner,
  }
}
