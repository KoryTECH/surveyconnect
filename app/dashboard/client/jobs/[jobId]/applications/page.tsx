"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { userLocale } from "@/lib/datetime";
import type { Job, JobApplication, Profile } from "@/types/database";
import BackButton from "@/components/ui/BackButton";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Inbox,
  MapPin,
  Users,
  Wallet,
  X,
} from "lucide-react";

type AppRow = Pick<
  JobApplication,
  | "id"
  | "professional_id"
  | "proposed_rate"
  | "estimated_delivery"
  | "status"
  | "created_at"
> & {
  profiles: Pick<Profile, "full_name" | "country"> | null;
};

export default function JobApplicationsPage() {
  const router = useRouter();
  const { jobId } = useParams();

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("client_id", user.id)
        .single();

      if (!jobData) {
        router.push("/dashboard/client/jobs");
        return;
      }
      setJob(jobData);

      const { data: apps } = await supabase
        .from("job_applications")
        .select(
          `
          id,
          professional_id,
          proposed_rate,
          estimated_delivery,
          status,
          created_at,
          profiles!job_applications_professional_id_fkey (
            full_name,
            country
          )
        `,
        )
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      setApplications((apps || []) as unknown as AppRow[]);
      setLoading(false);
    };
    getData();
  }, [jobId, router]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(userLocale(), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Survey<span className="text-green-600">ConnectHub</span>
        </h1>
        <BackButton href="/dashboard/client/jobs" label="My Jobs" />
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {job?.title}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {job?.description}
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> ${job?.budget} {job?.budget_type}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {job?.location || "Remote"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {applications.length}{" "}
              application{applications.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Applications ({applications.length})
        </h3>

        {applications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800">
            <div className="flex justify-center mb-4">
              <Inbox className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No applications yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Check back later — professionals will apply soon
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/dashboard/client/jobs/${jobId}/applications/${app.id}`}
                className={`block bg-white dark:bg-gray-900 rounded-2xl p-5 border transition-all hover:shadow-md ${
                  app.status === "accepted"
                    ? "border-green-400 dark:border-green-600"
                    : app.status === "rejected"
                      ? "border-gray-200 dark:border-gray-800 opacity-70"
                      : "border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                      <span className="text-green-700 dark:text-green-300 text-sm font-bold">
                        {app.profiles?.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("") || "??"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {app.profiles?.full_name || "Applicant"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {app.profiles?.country || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ${app.proposed_rate.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      proposed
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(app.created_at)}
                    </div>
                    {app.status === "pending" && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 whitespace-nowrap">
                        Pending
                      </span>
                    )}
                    {app.status === "accepted" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" /> Accepted
                      </span>
                    )}
                    {app.status === "rejected" && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <X className="w-3 h-3" /> Rejected
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
