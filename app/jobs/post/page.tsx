'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PostJobPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    profession_type: '',
    budget: '',
    budget_type: 'fixed',
    location_country: '',
    location_city: '',
    is_remote: false,
    deadline: '',
    required_verification: true,
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'client') {
        router.push('/dashboard/professional')
        return
      }

      setUser(user)
      setPageLoading(false)
    }

    checkUser()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement
    const value = target.type === 'checkbox' ? target.checked : target.value
    setFormData({ ...formData, [target.name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.title) { setError('Job title is required'); return }
    if (!formData.description) { setError('Job description is required'); return }
    if (!formData.profession_type) { setError('Please select a profession type'); return }
    if (!formData.budget) { setError('Budget is required'); return }
    if (parseFloat(formData.budget) < 1) { setError('Budget must be greater than 0'); return }

    setLoading(true)

    try {
      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          client_id: user.id,
          title: formData.title,
          description: formData.description,
          profession_type: formData.profession_type,
          budget: parseFloat(formData.budget),
          budget_type: formData.budget_type,
          location_country: formData.location_country,
          location_city: formData.location_city,
          is_remote: formData.is_remote,
          deadline: formData.deadline || null,
          required_verification: formData.required_verification,
          status: 'open',
        })

      if (jobError) throw jobError

      router.push('/dashboard/client?posted=true')

    } catch (err: any) {
      setError(err.message || 'Failed to post job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Survey<span className="text-green-600">Connect</span>
          </h1>
          <p className="text-gray-500 mt-2">Post a New Job</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Land Survey for 50 Hectare Farm in Ogun State"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                placeholder="Describe the project in detail. Include scope, deliverables, timeline expectations, and any special requirements..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 resize-none"
              />
            </div>

            {/* Profession Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profession Needed <span className="text-red-500">*</span>
              </label>
              <select
                name="profession_type"
                value={formData.profession_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value="">Select profession type</option>
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
                <option value="other">Other</option>
              </select>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Type
                </label>
                <select
                  name="budget_type"
                  value={formData.budget_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  name="location_country"
                  value={formData.location_country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                >
                  <option value="">Select country</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Kenya">Kenya</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
                  <option value="Senegal">Senegal</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="Uganda">Uganda</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="location_city"
                  value={formData.location_city}
                  onChange={handleChange}
                  placeholder="e.g. Lagos"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_remote"
                  checked={formData.is_remote}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  This job can be done remotely
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="required_verification"
                  checked={formData.required_verification}
                  onChange={handleChange}
                  className="w-4 h-4 text-green-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  Require verified professionals only (recommended)
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Posting job...' : 'Post Job'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/dashboard/client" className="text-green-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}