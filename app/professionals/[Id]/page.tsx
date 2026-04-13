'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfessionalProfilePage() {
  const router = useRouter()
  const { id } = useParams()
  const supabase = createClient()

  const [prof, setProf] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [viewerRole, setViewerRole] = useState<string>('')
  const [loading, setLoading] = useState(true)

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

  const getInitials = (name: string) => {
    if (!name) return '??'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setViewerRole(viewerProfile?.role || '')

      const { data: profData } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('id', id)
        .single()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, country, email')
        .eq('id', id)
        .single()

      setProf(profData)
      setProfile(profileData)
      setLoading(false)
    }
    getData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!prof || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Professional not found</p>
          <Link href="/professionals" className="text-green-600 hover:underline">← Back to Professionals</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Survey<span className="text-green-600">Connect</span>
        </h1>
        <Link href="/professionals" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
          ← Back to Professionals
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
              <span className="text-green-700 dark:text-green-300 text-2xl font-bold">
                {getInitials(profile?.full_name || '')}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile?.full_name}
                </h2>
                {prof?.verification_status === 'verified' && (
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium px-3 py-1 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium mb-1">
                {getProfessionLabel(prof?.profession_type)}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                📍 {profile?.country}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Professional Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prof?.years_experience > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Experience</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {prof.years_experience} year{prof.years_experience !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {prof?.license_number && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">License Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">{prof.license_number}</p>
              </div>
            )}

            {prof?.profession_type && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profession</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {getProfessionLabel(prof.profession_type)}
                </p>
              </div>
            )}

            {prof?.secondary_profession && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Secondary Profession</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {getProfessionLabel(prof.secondary_profession)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action — only clients see this */}
        {viewerRole === 'client' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Hire this Professional</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Post a job and this professional can apply, or browse your existing jobs to invite them.
            </p>
            <Link
              href="/jobs/post"
              className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Post a Job
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}