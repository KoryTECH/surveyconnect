"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ProfessionalApplicationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("job_applications")
        .select(`
          *,
          jobs (
            title,
            description,
            budget,
            budget_type,
            location_city,
            location_country,
            status
          )
        `)
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false });

      setApplications(data || []);
      setLoading(false);
    };
    getData();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "accepted": return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
      case "rejected": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default: return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted": return "✓ Accepted";
      case "rejected": return "✗ Rejected";
      default: return "⏳ Pending";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="SurveyConnect" className="h-8 w-auto" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Survey<span className="text-green-600">Connect</span>
          </h1>
        </div>
        <Link
          href="/dashboard/professional"
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          ← Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Applications</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {applications.length} application{applications.length !== 1 ? "s" : ""} submitted
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No applications yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Start applying to jobs to see them here</p>
            <Link
              href="/jobs"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border transition-all ${
                  app.status === "accepted"
                    ? "border-green-400 dark:border-green-600"
                    : app.status === "rejected"
                    ? "border-gray-200 dark:border-gray-800 opacity-70"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {app.jobs?.title}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusStyle(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {app.jobs?.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                      <span>📍 {[app.jobs?.location_city, app.jobs?.location_country].filter(Boolean).join(", ") || "Remote"}</span>
                      <span>💰 ${app.jobs?.budget} {app.jobs?.budget_type}</span>
                      <span>📅 Applied {formatDate(app.created_at)}</span>
                      {app.availability_date && (
                        <span>🗓 Available from {formatDate(app.availability_date)}</span>
                      )}
                    </div>

                    {app.status === "accepted" && (
                      <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3">
                        <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                          🎉 Your application was accepted! The client will fund the escrow to start the contract.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">${app.proposed_rate}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">your rate</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      You receive ${(app.proposed_rate * 0.85).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}