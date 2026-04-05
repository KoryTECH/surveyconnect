'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfessionalDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    getProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Survey<span className="text-green-600">Connect</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">
            {profile?.full_name}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Find jobs and grow your geospatial career
          </p>
        </div>

        {/* Verification Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">
                Complete your verification
              </p>
              <p className="text-sm text-yellow-700">
                Upload your ID and license to apply for jobs
              </p>
            </div>
          </div>
          <Link
            href="/verification"
            className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Verify Now
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Jobs Completed</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">0</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Total Earned</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">$0</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm">Average Rating</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-left hover:border-green-400 hover:bg-green-50 transition-all">
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold text-gray-900">Browse Jobs</div>
              <div className="text-sm text-gray-500 mt-1">
                Find geospatial projects matching your skills
              </div>
            </button>
            <button className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-left hover:border-green-400 hover:bg-green-50 transition-all">
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold text-gray-900">Update Profile</div>
              <div className="text-sm text-gray-500 mt-1">
                Add your skills and portfolio
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}