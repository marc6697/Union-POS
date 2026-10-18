// Supabase Edge Function: manage-staff
// Trusted server layer: only a business owner (for their own business) or superadmin
// may call it. Uses the service-role key to manage staff accounts and auth credentials.
//
// Actions: create | update | delete
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BAN_FOREVER = '876000h'

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1. Authenticate caller from their JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) throw new HttpError(401, 'Token autentikasi tidak ditemukan')

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) {
      throw new HttpError(401, `Sesi tidak valid: ${userErr?.message ?? 'User tidak ditemukan'}`)
    }

    // 2. Authorize caller profile
    const { data: callerProfile, error: callerErr } = await admin
      .from('profiles')
      .select('id, role, business_id')
      .eq('id', userData.user.id)
      .single()

    if (callerErr || !callerProfile) throw new HttpError(403, 'Profil pemanggil tidak ditemukan')
    const isSuperadmin = callerProfile.role === 'superadmin'
    const isOwner = callerProfile.role === 'owner'

    if (!isSuperadmin && !isOwner) {
      throw new HttpError(403, 'Hanya Owner atau Superadmin yang dapat mengelola staff')
    }

    const body = await req.json()
    const action = String(body.action ?? '')

    // Resolve target business_id
    const targetBusinessId = isSuperadmin ? body.business_id : callerProfile.business_id
    if (!targetBusinessId) throw new HttpError(400, 'ID bisnis wajib disertakan')

    // -------------------------------------------------------------------------
    // ACTION: CREATE
    // -------------------------------------------------------------------------
    if (action === 'create') {
      const full_name = String(body.full_name ?? '').trim()
      const phone = String(body.phone ?? '').trim() || null
      const position = String(body.position ?? '').trim() || null
      const can_login = Boolean(body.can_login)
      const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true
      const email = String(body.email ?? '').trim().toLowerCase() || null
      const password = String(body.password ?? '')

      if (!full_name) throw new HttpError(400, 'Nama staff wajib diisi')

      if (can_login) {
        if (!email) throw new HttpError(400, 'Email wajib diisi jika staff diizinkan login')
        if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Format email tidak valid')
        if (!password || password.length < 8) {
          throw new HttpError(400, 'Password minimal 8 karakter')
        }

        // Cek duplikasi email di profiles
        const { data: existingEmail } = await admin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .is('deleted_at', null)
          .maybeSingle()
        if (existingEmail) throw new HttpError(400, 'Email ini sudah terdaftar di sistem')

        // Buat akun di auth.users
        const { data: createdAuth, error: authErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        })
        if (authErr || !createdAuth.user) {
          throw new HttpError(400, authErr?.message ?? 'Gagal membuat akun autentikasi staff')
        }

        const staffId = createdAuth.user.id

        // Simpan ke profiles
        const { data: profile, error: profErr } = await admin
          .from('profiles')
          .insert({
            id: staffId,
            business_id: targetBusinessId,
            full_name,
            phone,
            position,
            can_login: true,
            is_active,
            email,
            role: 'staff',
          })
          .select()
          .single()

        if (profErr) {
          await admin.auth.admin.deleteUser(staffId)
          throw new HttpError(400, profErr.message)
        }

        if (!is_active) {
          await admin.auth.admin.updateUserById(staffId, { ban_duration: BAN_FOREVER })
        }

        return json({ data: profile })
      } else {
        // Staff tanpa akses login
        const { data: profile, error: profErr } = await admin
          .from('profiles')
          .insert({
            business_id: targetBusinessId,
            full_name,
            phone,
            position,
            can_login: false,
            is_active,
            email,
            role: 'staff',
          })
          .select()
          .single()

        if (profErr) throw new HttpError(400, profErr.message)
        return json({ data: profile })
      }
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE
    // -------------------------------------------------------------------------
    if (action === 'update') {
      const id = String(body.id ?? '')
      if (!id) throw new HttpError(400, 'ID staff wajib diisi')

      // Verifikasi bahwa staff milik bisnis pemanggil
      const { data: existing, error: existErr } = await admin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (existErr || !existing) throw new HttpError(404, 'Staff tidak ditemukan')
      if (!isSuperadmin && existing.business_id !== callerProfile.business_id) {
        throw new HttpError(403, 'Akses ditolak: staff bukan milik bisnis Anda')
      }
      if (existing.role === 'owner' || existing.role === 'superadmin') {
        throw new HttpError(403, 'Hanya data staff yang dapat diubah melalui endpoint ini')
      }

      const full_name = String(body.full_name ?? existing.full_name).trim()
      const phone = body.phone !== undefined ? (String(body.phone).trim() || null) : existing.phone
      const position = body.position !== undefined ? (String(body.position).trim() || null) : existing.position
      const can_login = body.can_login !== undefined ? Boolean(body.can_login) : existing.can_login
      const is_active = body.is_active !== undefined ? Boolean(body.is_active) : existing.is_active
      // Email tidak dapat diubah jika sudah pernah dibuat
      const email = existing.email
        ? existing.email
        : (body.email !== undefined ? (String(body.email).trim().toLowerCase() || null) : null)
      const password = String(body.password ?? '').trim()

      if (!full_name) throw new HttpError(400, 'Nama staff wajib diisi')

      // Cek status akun di auth.users
      const { data: authUserObj } = await admin.auth.admin.getUserById(id)
      const hasAuthAccount = Boolean(authUserObj?.user)

      if (can_login) {
        if (!email) throw new HttpError(400, 'Email wajib diisi jika staff diizinkan login')
        if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Format email tidak valid')

        if (hasAuthAccount) {
          // Akun auth sudah ada -> update password/ban (email tetap)
          const authUpdates: Record<string, unknown> = {
            user_metadata: { full_name },
            ban_duration: is_active ? 'none' : BAN_FOREVER,
          }
          if (password) {
            if (password.length < 8) throw new HttpError(400, 'Password baru minimal 8 karakter')
            authUpdates.password = password
          }

          const { error: updateAuthErr } = await admin.auth.admin.updateUserById(id, authUpdates)
          if (updateAuthErr) throw new HttpError(400, updateAuthErr.message)
        } else {
          // Belum punya akun auth -> buat akun auth baru dengan menyematkan ID yang sama
          if (!password || password.length < 8) {
            throw new HttpError(400, 'Password wajib diisi minimal 8 karakter untuk mengaktifkan login')
          }
          const { error: createAuthErr } = await admin.auth.admin.createUser({
            id,
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name },
            ban_duration: is_active ? 'none' : BAN_FOREVER,
          })
          if (createAuthErr) throw new HttpError(400, createAuthErr.message)
        }
      } else {
        // can_login = false. Jika sebelumnya punya auth account, blokir login-nya
        if (hasAuthAccount) {
          await admin.auth.admin.updateUserById(id, { ban_duration: BAN_FOREVER })
        }
      }

      // Update data di public.profiles
      const { data: updated, error: updErr } = await admin
        .from('profiles')
        .update({
          full_name,
          phone,
          position,
          can_login,
          is_active,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updErr) throw new HttpError(400, updErr.message)
      return json({ data: updated })
    }

    // -------------------------------------------------------------------------
    // ACTION: DELETE (SOFT DELETE)
    // -------------------------------------------------------------------------
    if (action === 'delete') {
      const id = String(body.id ?? '')
      if (!id) throw new HttpError(400, 'ID staff wajib diisi')

      const { data: existing } = await admin
        .from('profiles')
        .select('id, business_id, role')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (!existing) throw new HttpError(404, 'Staff tidak ditemukan')
      if (!isSuperadmin && existing.business_id !== callerProfile.business_id) {
        throw new HttpError(403, 'Akses ditolak: staff bukan milik bisnis Anda')
      }
      if (existing.role === 'owner' || existing.role === 'superadmin') {
        throw new HttpError(403, 'Tidak dapat menghapus Owner atau Superadmin')
      }

      // Blokir akun auth jika ada
      const { data: authUserObj } = await admin.auth.admin.getUserById(id)
      if (authUserObj?.user) {
        await admin.auth.admin.updateUserById(id, { ban_duration: BAN_FOREVER })
      }

      const now = new Date().toISOString()
      const { data: deleted, error: delErr } = await admin
        .from('profiles')
        .update({
          deleted_at: now,
          is_active: false,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()

      if (delErr) throw new HttpError(400, delErr.message)
      return json({ data: { id } })
    }

    throw new HttpError(400, 'Action tidak dikenal')
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    return json({ error: e instanceof Error ? e.message : 'Terjadi kesalahan server' }, 500)
  }
})
