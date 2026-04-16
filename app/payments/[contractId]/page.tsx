'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Contract {
  id: string
  agreed_budget: number
  platform_fee: number
  professional_receives: number
  status: string
  jobs: { title: string }
  profiles: { full_name: string }
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.contractId as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchContract()
  }, [contractId])

  async function fetchContract() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        jobs(title),
        profiles!contracts_professional_id_fkey(full_name)
      `)
      .eq('id', contractId)
      .single()

    if (error || !data) {
      setError('Contract not found')
    } else if (data.status !== 'pending') {
      router.push('/dashboard/client?payment=already_paid')
    } else {
      setContract(data)
    }
    setLoading(false)
  }

  async function handlePayment() {
    setPaying(true)
    setError('')

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      })

      const data = await response.json()

      if (!response.ok || !data.authorizationUrl) {
        setError(data.error || 'Failed to initialize payment')
        setPaying(false)
        return
      }

      window.location.href = data.authorizationUrl

    } catch (err) {
      setError('Something went wrong. Please try again.')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => router.push('/dashboard/client')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Payment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Funds are held in escrow until work is complete
          </p>
        </div>

        {/* Job Details */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Job</p>
          <p className="font-semibold text-gray-900 dark:text-white">{contract?.jobs?.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Professional: {contract?.profiles?.full_name}
          </p>
        </div>

        {/* Payment Breakdown */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Agreed Budget</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ₦{Number(contract?.agreed_budget).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Platform Fee (15%)</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ₦{Number(contract?.platform_fee).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Professional Receives</span>
            <span className="font-medium text-green-600">
              ₦{Number(contract?.professional_receives).toLocaleString()}
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 flex justify-between">
            <span className="font-bold text-gray-900 dark:text-white">Total to Pay</span>
            <span className="font-bold text-xl text-blue-600">
              ₦{Number(contract?.agreed_budget).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Escrow Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-6">
          <p className="text-xs text-green-700 dark:text-green-400 text-center">
            🔒 Your payment is protected. Funds are only released when you approve the completed work.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Redirecting to Paystack...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay ₦{Number(contract?.agreed_budget).toLocaleString()} Now
            </>
          )}
        </button>

        <button
          onClick={() => router.push('/dashboard/client')}
          className="w-full mt-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm py-2 transition-colors"
        >
          Cancel and go back
        </button>
      </div>
    </div>
  )
}