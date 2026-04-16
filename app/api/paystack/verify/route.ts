import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.redirect(
        new URL('/dashboard/client?payment=failed', request.url)
      )
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.redirect(
        new URL('/dashboard/client?payment=failed', request.url)
      )
    }

    const contractId = paystackData.data.metadata?.contractId

    if (!contractId) {
      return NextResponse.redirect(
        new URL('/dashboard/client?payment=failed', request.url)
      )
    }

    const supabase = await createClient()

    // Update contract status to active
    const { error } = await supabase
      .from('contracts')
      .update({
        status: 'active',
        start_date: new Date().toISOString(),
        stripe_payment_intent_id: reference,
      })
      .eq('id', contractId)
      .eq('status', 'pending')

    if (error) {
      console.error('Contract update error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/client?payment=failed', request.url)
      )
    }

    // Redirect to client dashboard with success
    return NextResponse.redirect(
      new URL(`/dashboard/client?payment=success&contractId=${contractId}`, request.url)
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/client?payment=failed', request.url)
    )
  }
}