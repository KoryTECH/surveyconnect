import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, email, contractId, metadata } = body

    if (!amount || !email || !contractId) {
      return NextResponse.json({ error: 'Missing required fields: amount, email, contractId' }, { status: 400 })
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY is not set in environment variables')
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 })
    }

    const paystackPayload = {
      amount: Math.round(amount * 100), // Convert to kobo
      email,
      reference: `SC-${contractId}-${Date.now()}`,
      metadata: {
        contractId,
        userId: user.id,
        ...metadata,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
    }

    console.log('Initializing Paystack payment:', JSON.stringify({
      ...paystackPayload,
      // Don't log sensitive data but log structure
      amount: paystackPayload.amount,
      email: paystackPayload.email,
      reference: paystackPayload.reference,
    }))

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    })

    const paystackData = await paystackResponse.json()

    // ✅ THIS IS THE KEY FIX — surface the actual Paystack error
    if (!paystackData.status) {
      console.error('Paystack initialization failed:', JSON.stringify({
        httpStatus: paystackResponse.status,
        httpStatusText: paystackResponse.statusText,
        paystackStatus: paystackData.status,
        paystackMessage: paystackData.message,
        fullResponse: paystackData,
      }))
      return NextResponse.json({
        error: paystackData.message || 'Failed to initialize payment',
        debug: {
          paystackMessage: paystackData.message,
          paystackStatus: paystackData.status,
          httpStatus: paystackResponse.status,
        }
      }, { status: 500 })
    }

    console.log('Paystack initialization successful, reference:', paystackData.data?.reference)

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference: paystackData.data.reference,
    })

  } catch (error) {
    console.error('Unexpected error in payment initialization:', error)
    return NextResponse.json({
      error: 'Internal server error',
      debug: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}