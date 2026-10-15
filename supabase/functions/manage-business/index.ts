// Supabase Edge Function: manage-business
// Trusted server layer: only a superadmin may call it. Uses the service-role key
// (auto-injected by Supabase, never sent to the client) to create/update/delete
// the owner's auth account together with the business row.
//
// Actions: create | update | set_status | delete
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATUSES = ['active', 'inactive']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9]{9,15}$/
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

// deno-lint-ignore no-explicit-any
function parseFields(b: any, { passwordRequired }: { passwordRequired: boolean }) {
  const business_name = String(b.business_name ?? '').trim()
  const business_type = String(b.business_type ?? '')
  const owner_name = String(b.owner_name ?? '').trim()
  const owner_phone = String(b.owner_phone ?? '').trim().replace(/[\s-]/g, '')
  const owner_email = String(b.owner_email ?? '').trim().toLowerCase()
  const status = String(b.status ?? 'active')
  const password = String(b.password ?? '')

  if (!business_name) throw new HttpError(400, 'Nama bisnis wajib diisi')
  if (!business_type) throw new HttpError(400, 'Tipe bisnis wajib diisi')
  if (!owner_name) throw new HttpError(400, 'Nama owner wajib diisi')
  if (!owner_phone) throw new HttpError(400, 'No. telepon wajib diisi')
  if (!PHONE_RE.test(owner_phone)) {
    throw new HttpError(400, 'No. telepon hanya boleh berisi angka (9-15 digit, boleh diawali +)')
  }
  if (!EMAIL_RE.test(owner_email)) throw new HttpError(400, 'Format email tidak valid')
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Status tidak valid')
  if (passwordRequired || password) {
    if (password.length < 8) throw new HttpError(400, 'Password minimal 8 karakter')
  }
  return { business_name, business_type, owner_name, owner_phone, owner_email, status, password }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
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
      console.error('Auth error in Edge Function:', userErr)
      throw new HttpError(401, `Sesi tidak valid: ${userErr?.message ?? 'User tidak ditemukan'}`)
    }

    // 2. Authorize: superadmin only (checked server-side)
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (callerProfile?.role !== 'superadmin') throw new HttpError(403, 'Akses ditolak')

    const body = await req.json()
    const action = body.action

    // Find the owner auth user for a business
    const findOwnerId = async (businessId: string): Promise<string | null> => {
      const { data } = await admin
        .from('profiles')
        .select('id')
        .eq('business_id', businessId)
        .eq('role', 'owner')
        .maybeSingle()
      return data?.id ?? null
    }

    // Reject operations on missing or soft-deleted businesses
    const assertNotDeleted = async (businessId: string) => {
      const { data } = await admin
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .is('deleted_at', null)
        .maybeSingle()
      if (!data) throw new HttpError(404, 'Bisnis tidak ditemukan atau sudah dihapus')
    }

    if (action === 'create') {
      const f = parseFields(body, { passwordRequired: true })

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: f.owner_email,
        password: f.password,
        email_confirm: true,
        user_metadata: { full_name: f.owner_name },
      })
      if (createErr || !created.user) {
        throw new HttpError(400, createErr?.message ?? 'Gagal membuat akun owner')
      }
      const ownerId = created.user.id

      const rollback = async () => {
        await admin.auth.admin.deleteUser(ownerId)
      }

      const { data: business, error: bizErr } = await admin
        .from('businesses')
        .insert({
          business_name: f.business_name,
          business_type: f.business_type,
          owner_name: f.owner_name,
          owner_phone: f.owner_phone,
          owner_email: f.owner_email,
          status: f.status,
        })
        .select()
        .single()
      if (bizErr || !business) {
        await rollback()
        throw new HttpError(400, bizErr?.message ?? 'Gagal menyimpan bisnis')
      }

      const { error: profErr } = await admin.from('profiles').upsert({
        id: ownerId,
        email: f.owner_email,
        full_name: f.owner_name,
        role: 'owner',
        business_id: business.id,
      })
      if (profErr) {
        await admin.from('businesses').delete().eq('id', business.id)
        await rollback()
        throw new HttpError(400, profErr.message)
      }

      if (f.status === 'inactive') {
        await admin.auth.admin.updateUserById(ownerId, { ban_duration: BAN_FOREVER })
      }
      return json({ data: business })
    }

    if (action === 'update') {
      const id = String(body.id ?? '')
      if (!id) throw new HttpError(400, 'ID bisnis wajib diisi')
      const f = parseFields(body, { passwordRequired: false })
      await assertNotDeleted(id)
      const ownerId = await findOwnerId(id)

      if (ownerId) {
        const { error: authErr } = await admin.auth.admin.updateUserById(ownerId, {
          email: f.owner_email,
          email_confirm: true,
          ...(f.password ? { password: f.password } : {}),
          user_metadata: { full_name: f.owner_name },
          ban_duration: f.status === 'active' ? 'none' : BAN_FOREVER,
        })
        if (authErr) throw new HttpError(400, authErr.message)
        await admin
          .from('profiles')
          .update({ email: f.owner_email, full_name: f.owner_name })
          .eq('id', ownerId)
      }

      const { data: business, error: bizErr } = await admin
        .from('businesses')
        .update({
          business_name: f.business_name,
          business_type: f.business_type,
          owner_name: f.owner_name,
          owner_phone: f.owner_phone,
          owner_email: f.owner_email,
          status: f.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (bizErr || !business) throw new HttpError(400, bizErr?.message ?? 'Gagal memperbarui bisnis')
      return json({ data: business })
    }

    if (action === 'set_status') {
      const id = String(body.id ?? '')
      const status = String(body.status ?? '')
      if (!id) throw new HttpError(400, 'ID bisnis wajib diisi')
      if (!STATUSES.includes(status)) throw new HttpError(400, 'Status tidak valid')

      await assertNotDeleted(id)
      const ownerId = await findOwnerId(id)
      if (ownerId) {
        const { error: authErr } = await admin.auth.admin.updateUserById(ownerId, {
          ban_duration: status === 'active' ? 'none' : BAN_FOREVER,
        })
        if (authErr) throw new HttpError(400, authErr.message)
      }
      const { data: business, error: bizErr } = await admin
        .from('businesses')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      if (bizErr || !business) throw new HttpError(400, bizErr?.message ?? 'Gagal mengubah status')
      return json({ data: business })
    }

    if (action === 'delete') {
      // Soft delete: keep the row and the auth user, but hide the business and block login.
      const id = String(body.id ?? '')
      if (!id) throw new HttpError(400, 'ID bisnis wajib diisi')
      const ownerId = await findOwnerId(id)

      if (ownerId) {
        const { error: authErr } = await admin.auth.admin.updateUserById(ownerId, {
          ban_duration: BAN_FOREVER,
        })
        if (authErr) throw new HttpError(400, authErr.message)
      }

      const now = new Date().toISOString()
      const { data: business, error: bizErr } = await admin
        .from('businesses')
        .update({ deleted_at: now, status: 'inactive', updated_at: now })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      if (bizErr || !business) throw new HttpError(400, bizErr?.message ?? 'Bisnis tidak ditemukan')
      return json({ data: { id } })
    }

    throw new HttpError(400, 'Action tidak dikenal')
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    return json({ error: e instanceof Error ? e.message : 'Terjadi kesalahan server' }, 500)
  }
})
