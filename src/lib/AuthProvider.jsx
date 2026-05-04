import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = masih loading
  const [profile, setProfile] = useState(null)
  const [tpk, setTpk] = useState(null)
  const [activeTpkId, setActiveTpkId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setTpk(null)
      return
    }

    supabase
      .from('profiles')
      .select('id, role, tpk_id, nama_operator, tabel_tpk(id, nama_tpk, kode_tpk)')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        setTpk(data.tabel_tpk ?? null)
      })
  }, [session])

  const signOut = () => supabase.auth.signOut()

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      tpk,
      isAdmin,
      activeTpkId,
      setActiveTpkId,
      signOut,
      loading: session === undefined,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
