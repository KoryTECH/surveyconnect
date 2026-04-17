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

    const { data: contract } = await supabase
      .from('contracts')
      .select('job_id, application_id, status')
      .eq('id', contractId)
      .single()

    if (!contract) {
      return NextResponse.redirect(
        new URL('/dashboard/client?payment=failed', request.url)
      )
    }

    if (contract.status === 'pending') {
      // 1. Activate contract
      await supabase
        .from('contracts')
        .update({
          status: 'active',
          start_date: new Date().toISOString(),
          stripe_payment_intent_id: reference,
        })
        .eq('id', contractId)

      // 2. Mark application as accepted
      await supabase
        .from('job_applications')
        .update({ status: 'accepted' })
        .eq('id', contract.application_id)

      // 3. Reject all other applications
      await supabase
        .from('job_applications')
        .update({ status: 'rejected' })
        .eq('job_id', contract.job_id)
        .neq('id', contract.application_id)

      // 4. Update job to in_progress
      await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', contract.job_id)
    }

    return NextResponse.redirect(
      new URL(
        `/dashboard/client/jobs/${contract.job_id}/applications?payment=success`,
        request.url
      )
    )

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/client?payment=failed', request.url)
    )
  }
}