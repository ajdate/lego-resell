import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()
    
    if (!idToken) {
      return NextResponse.json({ error: 'No token' }, { status: 400 })
    }
    
    // Use Clerk's Frontend API to authenticate with Apple token
    const clerkResponse = await fetch('https://clerk.brickvalue.app/v1/client/sign_ins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://brickvalue.app',
      },
      body: new URLSearchParams({
        strategy: 'id_token',
        provider: 'oauth_apple',
        token: idToken,
      }).toString()
    })
    
    const clerkData = await clerkResponse.json()
    console.log('Clerk response:', JSON.stringify(clerkData).substring(0, 500))
    
    if (clerkData.errors || !clerkData.response) {
      return NextResponse.json({ error: 'Authentication failed', details: clerkData.errors }, { status: 401 })
    }
    
    return NextResponse.json({ success: true, sessionId: clerkData.response?.id })
  } catch (err) {
    console.error('Apple auth error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
