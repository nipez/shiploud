import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData } from './types'
import { loadData, saveData } from './storage'
import {
  API_URL,
  clearToken,
  fetchMe,
  fetchState,
  getToken,
  hasApi,
  loginWithPassphrase,
  loginWithEmail,
  signup as apiSignup,
  putState,
  type AuthUser,
  type SyncStatus,
} from './api'
import { track } from './track'

function isEmptyState(state: AppData | null): boolean {
  if (!state) return true
  return state.journals.length === 0 && state.drafts.length === 0 && state.replies.length === 0
}

export function useCloudSync() {
  const [data, setData] = useState<AppData | null>(null)
  const [token, setTokenState] = useState<string | null>(() => (hasApi() ? getToken() : 'local'))
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading')
  const [bootError, setBootError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef<AppData | null>(null)

  const boot = useCallback(async () => {
    setBootError(null)
    if (!hasApi()) {
      const local = loadData()
      latestRef.current = local
      setData(local)
      setTokenState('local')
      setNeedsLogin(false)
      setUser(null)
      setSyncStatus('offline')
      return
    }

    const existing = getToken()
    if (!existing) {
      setNeedsLogin(true)
      setData(null)
      setUser(null)
      setTokenState(null)
      setSyncStatus('idle')
      return
    }

    setSyncStatus('loading')
    try {
      const { data: remote, migratedSetup } = await fetchState(existing)
      if (isEmptyState(remote)) {
        const seed = loadData()
        latestRef.current = seed
        setData(seed)
        saveData(seed)
        await putState(seed, existing)
        setSyncStatus('synced')
      } else {
        latestRef.current = remote
        setData(remote!)
        saveData(remote!)
        if (migratedSetup) {
          // Persist setup defaults into cloud so they aren't wiped on next clients
          await putState(remote!, existing)
        }
        setSyncStatus('synced')
      }
      setTokenState(existing)
      setNeedsLogin(false)
      const me = await fetchMe(existing)
      setUser(me)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'boot_failed'
      if (msg === 'unauthorized') {
        clearToken()
        setTokenState(null)
        setNeedsLogin(true)
        setData(null)
        setUser(null)
        setSyncStatus('idle')
        return
      }
      const local = loadData()
      latestRef.current = local
      setData(local)
      setTokenState(existing)
      setNeedsLogin(false)
      setSyncStatus('offline')
      setBootError(msg)
    }
  }, [])

  useEffect(() => {
    void boot()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [boot])

  const flushRemote = useCallback(async (next: AppData) => {
    if (!hasApi()) {
      setSyncStatus('offline')
      return
    }
    const t = getToken()
    if (!t) {
      setNeedsLogin(true)
      return
    }
    setSyncStatus('saving')
    try {
      await putState(next, t)
      if (latestRef.current === next) setSyncStatus('synced')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'put_failed'
      if (msg === 'unauthorized') {
        clearToken()
        setTokenState(null)
        setNeedsLogin(true)
        setSyncStatus('idle')
        return
      }
      setSyncStatus('offline')
    }
  }, [])

  const persist = useCallback(
    (next: AppData) => {
      latestRef.current = next
      setData(next)
      saveData(next)
      if (!hasApi() || !getToken()) {
        setSyncStatus(hasApi() ? 'idle' : 'offline')
        return
      }
      setSyncStatus('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        // Always flush the latest ref — avoids racing a stale intermediate blob.
        const latest = latestRef.current
        if (latest) void flushRemote(latest)
      }, 450)
    },
    [flushRemote],
  )

  /** Immediate cloud write (regen / strip) — cancel debounce so old essays can't win. */
  const persistImmediate = useCallback(
    (next: AppData) => {
      latestRef.current = next
      setData(next)
      saveData(next)
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      if (!hasApi() || !getToken()) {
        setSyncStatus(hasApi() ? 'idle' : 'offline')
        return
      }
      setSyncStatus('saving')
      void flushRemote(next)
    },
    [flushRemote],
  )

  const afterAuth = useCallback(async () => {
    setTokenState(getToken())
    setNeedsLogin(false)
    track('session_login')
    await boot()
  }, [boot])

  const login = useCallback(
    async (pass: string) => {
      await loginWithPassphrase(pass)
      await afterAuth()
    },
    [afterAuth],
  )

  const loginEmail = useCallback(
    async (email: string, password: string) => {
      await loginWithEmail(email, password)
      await afterAuth()
    },
    [afterAuth],
  )

  const signup = useCallback(
    async (input: {
      email: string
      password: string
      inviteCode: string
      displayName?: string
    }) => {
      await apiSignup(input)
      await afterAuth()
    },
    [afterAuth],
  )

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setNeedsLogin(true)
    setData(null)
    setUser(null)
    setSyncStatus('idle')
  }, [])

  const statusLabel =
    !API_URL
      ? 'Offline (local only)'
      : syncStatus === 'saving'
        ? 'Saving…'
        : syncStatus === 'loading'
          ? 'Syncing…'
          : syncStatus === 'synced'
            ? 'Synced'
            : syncStatus === 'offline'
              ? 'Offline (local only)'
              : syncStatus === 'error'
                ? 'Sync error'
                : 'Not synced'

  return {
    data,
    persist,
    persistImmediate,
    syncStatus,
    statusLabel,
    needsLogin: Boolean(API_URL) && needsLogin,
    login,
    loginEmail,
    signup,
    logout,
    bootError,
    apiConfigured: Boolean(API_URL),
    token,
    user,
  }
}
