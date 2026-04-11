'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function JobApplicationsPage() {
  const router = useRouter()
  const { jobId } = useParams()
  const supabase = createClient()

  const [job, setJob] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Load job
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('client_id', user.id)
        .single()

      if (!jobData) { router.push('/dashboard/client/jobs'); return }
      setJob(jobData)

      // Load applications with professional profile
      const { data: apps } = await supabase
        .from('job_applications')
        .select(`
          *,
          profiles (
            full_name,
            country,
            email
          ),
          professional_profiles (
            profession_type,
            years_experience,
            verification_status
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      setApplications(apps || [])
      setLoading(false)
    }
    getData()
  }, [jobId])

  const handleAccept = async (applicationId: string, professionalId: string) => {
    setAccepting(applicationId)

    try {
      // Update application status to accepted
      await supabase
        .from('job_applications')
        .update({ status: 'accepted' })
        .eq('id', applicationId)

      // Reject all other applications for this job
      await supabase
        .from('job_applications')
        .update({ status: 'rejected' })
        .eq('job_id', jobId)
        .neq('id', applicationId)

      // Update job status to in_progress
      await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId)

      // Create contract
      const acceptedApp = applications.find(a => a.id === applicationId)
      await supabase
        .from('contracts')
        .insert({
          job_id: jobId,
          client_id: job.client_id,
          professional_id: professionalId,
          application_id: applicationId,
          agreed_budget: acceptedApp?.proposed_rate,
          platform_fee: acceptedApp?.proposed_rate * 0.15,
          professional_receives: acceptedApp?.proposed_rate * 0.85,
          status: 'pending_payment',
        })

      // Refresh applications
      const { data: updated } = await supabase
        .from('job_applications')
        .select(`
          *,
          profiles (full_name, country, email),
          professional_profiles (profession_type, years_experience, verification_status)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

      setApplications(updated || [])
    } catch (err) {
      console.error(err)
    } finally {
      setAccepting(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    await supabase
      .from('job_applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId)

    setApplications(prev =>
      prev.map(a => a.id === applicationId ? { ...a, status: 'rejected' } : a)
    )
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
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Survey<span className="text-green-600">Connect</span>
        </h1>
        <Link
          href="/dashboard/client/jobs"
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to My Jobs
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Job Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{job?.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{job?.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
            <span>💰 ${job?.budget} {job?.budget_type}</span>
            <span>📍 {[job?.location_city, job?.location_country].filter(Boolean).join(', ')}</span>
            <span>👥 {applications.length} application{applications.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Applications */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Applications ({applications.length})
        </h3>

        {applications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No applications yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Check back later — professionals will apply soon</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all ${
                  app.status === 'accepted'
                    ? 'border-green-400 dark:border-green-600'
                    : app.status === 'rejected'
                    ? 'border-gray-200 dark:border-gray-800 opacity-60'
                    : 'border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">

                    {/* Professional Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <span className="text-green-700 dark:text-green-300 text-sm font-bold">
                          {app.profiles?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '??'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{app.profiles?.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{app.profiles?.country}</span>
                          {app.professional_profiles?.verification_status === 'verified' && (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                              ✓ Verified
                            </span>
                          )}
                          {app.professional_profiles?.years_experience && (
                            <span>{app.professional_profiles.years_experience} yrs exp</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cover Letter */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 leading-relaxed">
                      {app.cover_letter}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span>📅 Applied {formatDate(app.created_at)}</span>
                      {app.availability_date && (
                        <span>🗓 Available from {formatDate(app.availability_date)}</span>
                      )}
                    </div>
                  </div>

                  {/* Rate + Actions */}
                  <div className="text-right shrink-0 space-y-3">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">${app.proposed_rate}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">proposed rate</p>
                    </div>

                    {app.status === 'pending' && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleAccept(app.id, app.professional_id)}
                          disabled={accepting === app.id}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                        >
                          {accepting === app.id ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {app.status === 'accepted' && (
                      <span className="block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold px-4 py-2 rounded-xl text-center">
                        ✓ Accepted
                      </span>
                    )}

                    {app.status === 'rejected' && (
                      <span className="block bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm font-semibold px-4 py-2 rounded-xl text-center">
                        Rejected
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