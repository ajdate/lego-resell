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
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(request: NextRequest) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .upsert(
      {
        user_id: user.id,
        set_number: String(body.setNumber || body.set_number || ''),
        set_name: String(body.name || body.set_name || ''),
        target_price: Number(
          body.targetPrice || body.target_price || body.estimatedValue || 0,
        ),
        notes: JSON.stringify(body),
      },
      { onConflict: 'user_id,set_number' },
    )
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { set_number } = await request.json()

  const { error } = await supabaseAdmin
    .from('watchlist')
    .delete()
    .eq('set_number', set_number)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
