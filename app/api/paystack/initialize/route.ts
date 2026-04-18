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

    // Fetch live USD to NGN exchange rate
    let usdToNgn = 1600 // fallback rate if API fails
    try {
      const rateResponse = await fetch(
        `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`
      )
      const rateData = await rateResponse.json()
      if (rateData.result === 'success') {
        usdToNgn = rateData.conversion_rates.NGN
      }
    } catch (rateError) {
      console.error('Exchange rate fetch failed, using fallback:', rateError)
    }

    // Convert USD to NGN then to kobo (Paystack uses smallest currency unit)
    const amountInUsd = Number(contract.agreed_budget) * 1.08
    const amountInNgn = amountInUsd * usdToNgn
    const amountInKobo = Math.round(amountInNgn * 100)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`

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
        callback_url: `${appUrl}/api/paystack/verify`,
        metadata: {
          contractId,
          clientId: user.id,
          jobTitle: contract.jobs?.title,
          usdAmount: amountInUsd,
          exchangeRate: usdToNgn,
        },
      }),
    })

    const paystackData = await paystackResponse.json()

    if (!paystackData.status) {
  console.error('Paystack error:', JSON.stringify(paystackData))
  return NextResponse.json({ 
    error: paystackData.message || 'Failed to initialize payment' 
  }, { status: 500 })
}

    // Store the payment reference in contract
    await supabase
      .from('contracts')
      .update({ stripe_payment_intent_id: paystackData.data.reference })
      .eq('id', contractId)

    return NextResponse.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      usdAmount: amountInUsd,
      ngnAmount: Math.round(amountInNgn),
      exchangeRate: usdToNgn,
    })

  } catch (error) {
    console.error('Payment initialization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}