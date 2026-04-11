"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Job = {
  id: string;
  title: string;
  description: string;
  budget_min: number;
  budget_max: number;
  location: string;
  job_type: string;
  status: string;
  client_id: string;
};

export default function ApplyPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "professional") {
        router.push("/dashboard/client");
        return;
      }

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();

      if (jobError || !jobData) {
        setError("Job not found.");
        setLoading(false);
        return;
      }

      setJob(jobData);

      const { data: existing } = await supabase
        .from("job_applications")
        .select("id")
        .eq("job_id", id)
        .eq("professional_id", user.id)
        .single();

      if (existing) setAlreadyApplied(true);

      setLoading(false);
    };

    init();
  }, [id]);

  const handleSubmit = async () => {
    if (!coverLetter.trim() || !proposedRate || !availability) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error: insertError } = await supabase.from("job_applications").insert({
      job_id: id,
      professional_id: user.id,
      cover_letter: coverLetter.trim(),
      proposed_rate: parseFloat(proposedRate),
      availability_date: availability,
      status: "pending",
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/jobs"), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center text-red-500 dark:text-red-400 transition-colors duration-300">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          ← Back
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <span className="text-gray-500 dark:text-gray-400 text-sm">Apply for Job</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Job Summary */}
        {job && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{job.location} · {job.job_type}</p>
              </div>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                ${job.budget_min?.toLocaleString()} – ${job.budget_max?.toLocaleString()}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">{job.description}</p>
          </div>
        )}

        {/* Already Applied */}
        {alreadyApplied ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center space-y-2">
            <p className="text-yellow-600 dark:text-yellow-400 font-medium">You&apos;ve already applied to this job.</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Check your dashboard for application status.</p>
            <button
              onClick={() => router.push("/dashboard/professional")}
              className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Go to Dashboard →
            </button>
          </div>
        ) : success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-2">
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg">Application Submitted! 🎉</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting you back to jobs...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Proposal</h2>

            {/* Cover Letter */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Cover Letter <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={6}
                placeholder="Introduce yourself. Why are you the best fit for this job? What's your relevant experience?"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">{coverLetter.length} / 1000 characters</p>
            </div>

            {/* Proposed Rate */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Your Rate ($) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Platform takes 15% commission. You&apos;ll receive{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  ${proposedRate ? (parseFloat(proposedRate) * 0.85).toLocaleString() : "0"}
                </span>
              </p>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Available to Start <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              By applying, you agree to SurveyConnect&apos;s terms. The client will review your proposal and may reach out via the platform.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}