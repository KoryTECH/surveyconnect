'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ClientContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [releasing, setReleasing] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('contracts')
        .select(`
          *,
          jobs(title, description),
          profiles!contracts_professional_id_fkey(full_name, email)
        `)
        .eq('client_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false })

      setContracts(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleReleasePayment = async (contractId: string) => {
    setReleasing(contractId)
    setMessage('')

    try {
      const response = await fetch('/api/paystack/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Failed to release payment')
        setReleasing(null)
        return
      }

      setContracts(prev =>
        prev.map(c => c.id === contractId ? { ...c, status: 'paid' } : c)
      )
      setMessage('Payment released successfully!')

    } catch (err) {
      setMessage('Something went wrong. Please try again.')
    } finally {
      setReleasing(null)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Survey<span className="text-green-600">Connect</span>
        </h1>
        <Link
          href="/dashboard/client"
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Contracts</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {message && (
          <div className={`rounded-xl p-4 mb-6 text-sm font-medium ${
            message.includes('success')
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message}
          </div>
        )}

        {contracts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No contracts yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Accept a proposal and pay to start a contract
            </p>
            <Link
              href="/dashboard/client/jobs"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              View My Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all ${
                  contract.status === 'completed'
                    ? 'border-yellow-300 dark:border-yellow-700'
                    : contract.status === 'paid'
                    ? 'border-gray-200 dark:border-gray-700 opacity-75'
                    : 'border-green-300 dark:border-green-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {contract.jobs?.title}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        contract.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : contract.status === 'completed'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {contract.status === 'active' ? '🟢 In Progress'
                          : contract.status === 'completed' ? '⏳ Awaiting Approval'
                          : '✅ Paid'}
                      </span>
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                      Professional: {contract.profiles?.full_name}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span>📅 Started {formatDate(contract.start_date)}</span>
                    </div>

                    {contract.status === 'completed' && (
                      <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                          ⚠️ The professional has marked this job as complete. Review the work and release payment if satisfied.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${Number(contract.agreed_budget).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">agreed budget</p>
                    </div>

                    {contract.status === 'active' && (
                      <div className="space-y-2">
                        <Link
                          href={`/messages/${contract.id}`}
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors text-center"
                        >
                          💬 Message
                        </Link>
                        <span className="block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold px-4 py-2 rounded-xl text-center">
                          Work in Progress
                        </span>
                      </div>
                    )}

                    {contract.status === 'completed' && (
                      <div className="space-y-2">
                        <Link
                          href={`/messages/${contract.id}`}
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors text-center"
                        >
                          💬 Message
                        </Link>
                        <button
                          onClick={() => handleReleasePayment(contract.id)}
                          disabled={releasing === contract.id}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                        >
                          {releasing === contract.id ? 'Releasing...' : '💸 Release Payment'}
                        </button>
                      </div>
                    )}

                    {contract.status === 'paid' && (
                      <span className="block bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-semibold px-4 py-2 rounded-xl text-center">
                        ✅ Payment Released
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}