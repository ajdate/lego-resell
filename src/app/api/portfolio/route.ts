import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Service role key first 10 chars:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10))

  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('portfolio')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const firstCopy = Array.isArray(body.copies) ? body.copies[0] : null

  const { data, error } = await supabaseAdmin
    .from('portfolio')
    .upsert(
      {
        user_id: userId,
        set_number: String(body.setNumber || ''),
        set_name: String(body.name || ''),
        purchase_price: Number(
          body.pricePaid || body.purchasePrice || firstCopy?.purchasePrice || 0,
        ),
        condition: String(body.condition || firstCopy?.condition || 'sealed'),
        intent: String(
          body.intent || body.intentTag || firstCopy?.intentTag || 'undecided',
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
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()

  const { error } = await supabaseAdmin
    .from('portfolio')
    .delete()
    .eq('set_number', id)
    .eq('user_id', userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
