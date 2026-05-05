import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifikasi caller adalah admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client dengan anon key + JWT caller untuk cek role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: callerProfile, error: profileErr } = await callerClient
      .from('profiles')
      .select('role')
      .single()

    if (profileErr || callerProfile?.role !== 'admin') {
      return json({ error: 'Forbidden: hanya admin yang bisa membuat akun TPK' }, 403)
    }

    // Parse body
    const { namatpk, kode_tpk, email, password } = await req.json()

    // Validasi input
    if (!namatpk?.trim()) return json({ error: 'namatpk wajib diisi' }, 400)
    if (!email?.trim())    return json({ error: 'email wajib diisi' }, 400)
    if (!password)         return json({ error: 'password wajib diisi' }, 400)
    if (password.length < 8) return json({ error: 'password minimal 8 karakter' }, 400)
    if (kode_tpk && !/^\d{7}$/.test(kode_tpk)) {
      return json({ error: 'kode_tpk harus 7 digit angka' }, 400)
    }

    // Service role client untuk operasi admin
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Buat TPK
    const { data: tpk, error: tpkErr } = await admin
      .from('tabel_tpk')
      .insert({ namatpk: namatpk.trim(), kode_tpk: kode_tpk || null })
      .select('id')
      .single()

    if (tpkErr) return json({ error: `Gagal membuat TPK: ${tpkErr.message}` }, 500)

    // 2. Buat Auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (authErr) {
      // Rollback: hapus TPK yang sudah dibuat
      await admin.from('tabel_tpk').delete().eq('id', tpk.id)
      return json({ error: `Gagal membuat user: ${authErr.message}` }, 500)
    }

    // 3. Buat profile
    const { error: profileInsertErr } = await admin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        tpk_id: tpk.id,
        role: 'operator',
      })

    if (profileInsertErr) {
      // Rollback: hapus user dan TPK
      await admin.auth.admin.deleteUser(authUser.user.id)
      await admin.from('tabel_tpk').delete().eq('id', tpk.id)
      return json({ error: `Gagal membuat profil: ${profileInsertErr.message}` }, 500)
    }

    return json({
      tpk_id: tpk.id,
      user_id: authUser.user.id,
      message: `Akun TPK ${namatpk} berhasil dibuat`,
    }, 200)

  } catch (err) {
    return json({ error: err.message ?? 'Internal server error' }, 500)
  }
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
