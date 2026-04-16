import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contractId } = await request.json()

    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    // Fetch contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        jobs(title),
        profiles!contracts_client_id_fkey(email)
      `)
      .eq('id', contractId)
      .eq('client_id', user.id)
      .eq('status', 'pending')
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Amount in kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(Number(contract.agreed_budget) * 100)

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: 'NGN',
        reference: `sc_${contractId}_${Date.now()}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify`,
        metadata: {
          contractId,
          clientId: user.id,
          jobTitle: contract.jobs?.title,
        },
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
    }

    // Store the payment reference in contract
    await supabase
      .from('contracts')
      .update({ stripe_payment_intent_id: paystackData.data.reference })
      .eq('id', contractId)

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    })

  } catch (error) {
    console.error('Payment initialization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}