import { createClient } from '@supabase/supabase-js'
import { currentUser } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .eq('dismissed', false)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(request: NextRequest) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('alerts')
    .insert({
      user_id: user.id,
      set_number: String(body.setNumber || ''),
      set_name: String(body.setName || ''),
      type: String(body.type || ''),
      message: String(body.message || ''),
      dismissed: false,
      notes: JSON.stringify(body),
    })
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  const { error } = await supabaseAdmin
    .from('alerts')
    .update({ dismissed: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
