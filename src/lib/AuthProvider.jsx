import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = masih loading
  const [profile, setProfile] = useState(null)
  const [tpk, setTpk] = useState(null)

  // Persist ke sessionStorage agar admin tidak kehilangan konteks TPK saat refresh
  const [activeTpkId, setActiveTpkIdState] = useState(
    () => sessionStorage.getItem('activeTpkId') ?? null
  )

  const setActiveTpkId = (id) => {
    if (id) sessionStorage.setItem('activeTpkId', id)
    else sessionStorage.removeItem('activeTpkId')
    setActiveTpkIdState(id)
  }

  useEffect(() => {
    let cancelled = false

    // Session + profile di-fetch atomik — tidak ada render di antara keduanya
    async function handleAuthChange(newSession) {
      if (!newSession) {
        sessionStorage.removeItem('activeTpkId')
        setActiveTpkIdState(null)
        setSession(null)
        setProfile(null)
        setTpk(null)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, role, tpk_id, nama_operator, tabel_tpk(id, namatpk, kode_tpk)')
        .eq('id', newSession.user.id)
        .single()

      if (cancelled) return
      setSession(newSession)
      setProfile(data ?? null)
      setTpk(data?.tabel_tpk ?? null)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // TOKEN_REFRESHED tidak perlu re-fetch profile
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession)
        return
      }
      handleAuthChange(newSession)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    sessionStorage.removeItem('activeTpkId')
    setActiveTpkIdState(null)
    await supabase.auth.signOut()
  }

  const isAdmin = profile?.role === 'admin'

  const updateProfile = async (fields) => {
    if (!session) return { error: 'Tidak ada sesi aktif' }
    const { error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', session.user.id)
    if (!error) setProfile(p => ({ ...p, ...fields }))
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      tpk,
      isAdmin,
      activeTpkId,
      setActiveTpkId,
      signOut,
      updateProfile,
      loading: session === undefined,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
