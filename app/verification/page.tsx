'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function VerificationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [profProfile, setProfProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [idFile, setIdFile] = useState<File | null>(null)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [professionType, setProfessionType] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'professional') {
        router.push('/dashboard/client')
        return
      }

      const { data: profProfile } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUser(user)
      setProfile(profile)
      setProfProfile(profProfile)
      setLoading(false)
    }

    getData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!idFile) {
      setError('Please upload your government-issued ID')
      return
    }
    if (!licenseFile) {
      setError('Please upload your professional license or certificate')
      return
    }
    if (!professionType) {
      setError('Please select your profession type')
      return
    }

    setUploading(true)

    try {
      // Upload ID document
      const idFileName = `${user.id}/id-${Date.now()}.${idFile.name.split('.').pop()}`
      const { error: idError } = await supabase.storage
        .from('verification-documents')
        .upload(idFileName, idFile)

      if (idError) throw idError

      // Upload license document
      const licenseFileName = `${user.id}/license-${Date.now()}.${licenseFile.name.split('.').pop()}`
      const { error: licenseError } = await supabase.storage
        .from('verification-documents')
        .upload(licenseFileName, licenseFile)

      if (licenseError) throw licenseError

      // Update professional profile
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .upsert({
          id: user.id,
          profession_type: professionType,
          license_number: licenseNumber,
          years_experience: parseInt(yearsExperience) || 0,
          id_document_url: idFileName,
          license_url: licenseFileName,
          verification_status: 'pending',
        })

      if (updateError) throw updateError

      setSuccess('Documents uploaded successfully! Our team will review your verification within 24-48 hours.')

    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Already submitted
  if (profProfile?.verification_status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Pending
          </h2>
          <p className="text-gray-500 mb-6">
            Your documents have been submitted and are being reviewed by our team. 
            This usually takes 24-48 hours.
          </p>
          <Link
            href="/dashboard/professional"
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Already verified
  if (profProfile?.verification_status === 'verified') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You are Verified!
          </h2>
          <p className="text-gray-500 mb-6">
            Your professional credentials have been verified. 
            You can now apply to jobs on SurveyConnect.
          </p>
          <Link
            href="/dashboard/professional"
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
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
          <p className="text-gray-500 mt-2">Professional Verification</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
            <h3 className="font-semibold text-blue-800 mb-1">
              Why do we verify professionals?
            </h3>
            <p className="text-sm text-blue-700">
              Verification builds trust with clients and ensures only qualified 
              professionals work on critical geospatial projects. 
              Verified professionals get more job opportunities.
            </p>
          </div>

          {/* Error/Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Profession Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profession Type <span className="text-red-500">*</span>
              </label>
              <select
                value={professionType}
                onChange={(e) => setProfessionType(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value="">Select your profession</option>
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

            {/* License Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License / Registration Number
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. NIS/2024/12345"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="e.g. 5"
                min="0"
                max="50"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>

            {/* ID Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Government-Issued ID <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Passport, Driver's License, or National ID Card (JPG, PNG or PDF, max 5MB)
              </p>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center ${idFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="id-upload"
                />
                <label htmlFor="id-upload" className="cursor-pointer">
                  {idFile ? (
                    <div>
                      <div className="text-2xl mb-1">✅</div>
                      <p className="text-green-700 font-medium">{idFile.name}</p>
                      <p className="text-xs text-green-600 mt-1">Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">🪪</div>
                      <p className="text-gray-600 font-medium">Click to upload ID</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* License Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional License / Certificate <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Your surveying license, GIS certification, or relevant professional certificate (JPG, PNG or PDF, max 5MB)
              </p>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center ${licenseFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="license-upload"
                />
                <label htmlFor="license-upload" className="cursor-pointer">
                  {licenseFile ? (
                    <div>
                      <div className="text-2xl mb-1">✅</div>
                      <p className="text-green-700 font-medium">{licenseFile.name}</p>
                      <p className="text-xs text-green-600 mt-1">Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">📜</div>
                      <p className="text-gray-600 font-medium">Click to upload license</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG or PDF</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {uploading ? 'Uploading documents...' : 'Submit for Verification'}
            </button>

          </form>

          {/* Back Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/dashboard/professional" className="text-green-600 hover:underline">
              ← Back to Dashboard
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}