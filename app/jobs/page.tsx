'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function JobsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filterProfession, setFilterProfession] = useState('')
  const [filterBudget, setFilterBudget] = useState('')
  const [filterRemote, setFilterRemote] = useState(false)

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUser(user)
      setProfile(profile)
      await fetchJobs()
      setLoading(false)
    }

    getData()
  }, [])

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select(`
        *,
        profiles (
          full_name,
          country
        )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    setJobs(data || [])
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = search === '' ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase())

    const matchesProfession = filterProfession === '' ||
      job.profession_type === filterProfession

    const matchesBudget = filterBudget === '' ||
      (filterBudget === 'under500' && job.budget < 500) ||
      (filterBudget === '500to2000' && job.budget >= 500 && job.budget <= 2000) ||
      (filterBudget === 'above2000' && job.budget > 2000)

    const matchesRemote = !filterRemote || job.is_remote === true

    return matchesSearch && matchesProfession && matchesBudget && matchesRemote
  })

  const formatBudget = (budget: number, type: string) => {
    return type === 'hourly' ? `$${budget}/hr` : `$${budget}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getProfessionLabel = (type: string) => {
    const labels: any = {
      land_surveyor: 'Land Surveyor',
      gis_analyst: 'GIS Analyst',
      drone_pilot: 'Drone/UAV Pilot',
      cartographer: 'Cartographer',
      photogrammetrist: 'Photogrammetrist',
      lidar_specialist: 'LiDAR Specialist',
      remote_sensing_analyst: 'Remote Sensing Analyst',
      urban_planner: 'Urban Planner',
      spatial_data_scientist: 'Spatial Data Scientist',
      hydrographic_surveyor: 'Hydrographic Surveyor',
      mining_surveyor: 'Mining Surveyor',
      construction_surveyor: 'Construction Surveyor',
      environmental_analyst: 'Environmental Analyst',
      bim_specialist: 'BIM Specialist',
      other: 'Other'
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading jobs...</div>
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
        <div className="flex items-center gap-4">
          <Link
            href={profile?.role === 'client' ? '/dashboard/client' : '/dashboard/professional'}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Dashboard
          </Link>
          <span className="text-gray-600 dark:text-gray-300 text-sm">{profile?.full_name}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Browse Jobs</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {filteredJobs.length} open job{filteredJobs.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Search + Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Profession Filter */}
            <div>
              <select
                value={filterProfession}
                onChange={(e) => setFilterProfession(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              >
                <option value="">All Professions</option>
                <option value="land_surveyor">Land Surveyor</option>
                <option value="gis_analyst">GIS Analyst</option>
                <option value="drone_pilot">Drone/UAV Pilot</option>
                <option value="cartographer">Cartographer</option>
                <option value="photogrammetrist">Photogrammetrist</option>
                <option value="lidar_specialist">LiDAR Specialist</option>
                <option value="remote_sensing_analyst">Remote Sensing Analyst</option>
                <option value="urban_planner">Urban Planner</option>
                <option value="spatial_data_scientist">Spatial Data Scientist</option>
                <option value="hydrographic_surveyor">Hydrographic Surveyor</option>
                <option value="mining_surveyor">Mining Surveyor</option>
                <option value="construction_surveyor">Construction Surveyor</option>
                <option value="environmental_analyst">Environmental Analyst</option>
                <option value="bim_specialist">BIM Specialist</option>
              </select>
            </div>

            {/* Budget Filter */}
            <div>
              <select
                value={filterBudget}
                onChange={(e) => setFilterBudget(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              >
                <option value="">Any Budget</option>
                <option value="under500">Under $500</option>
                <option value="500to2000">$500 - $2,000</option>
                <option value="above2000">Above $2,000</option>
              </select>
            </div>

          </div>

          {/* Remote Toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filterRemote}
                onChange={(e) => setFilterRemote(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Remote jobs only</span>
            </label>
          </div>
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No jobs found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">

                    {/* Title + Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {job.title}
                      </h3>
                      {job.is_remote && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium px-2 py-1 rounded-full">
                          Remote
                        </span>
                      )}
                      {job.required_verification && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-2 py-1 rounded-full">
                          ✓ Verified only
                        </span>
                      )}
                    </div>

                    {/* Profession */}
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium mb-2">
                      {getProfessionLabel(job.profession_type)}
                    </p>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {job.description}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                      {(job.location_city || job.location_country) && (
                        <span>
                          📍 {[job.location_city, job.location_country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span>📅 Posted {formatDate(job.created_at)}</span>
                      {job.deadline && (
                        <span>⏰ Deadline {formatDate(job.deadline)}</span>
                      )}
                      <span>👤 {job.profiles?.full_name}</span>
                    </div>
                  </div>

                  {/* Budget + Apply */}
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatBudget(job.budget, job.budget_type)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                      {job.budget_type === 'hourly' ? 'per hour' : 'fixed price'}
                    </p>
                    {profile?.role === 'professional' && (
                      <Link
                        href={`/jobs/${job.id}/apply`}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        Apply Now
                      </Link>
                    )}
                    {profile?.role === 'client' && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {job.applications_count || 0} applicant(s)
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