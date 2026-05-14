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
      .select('id, role, tpk_id, nama_operator, tabel_tpk(id, namatpk, kode_tpk)')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setProfile(data)
        setTpk(data.tabel_tpk ?? null)
      })
      .catch(() => {
        setProfile(null)
        setTpk(null)
      })
  }, [session])

  const signOut = () => supabase.auth.signOut()

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
