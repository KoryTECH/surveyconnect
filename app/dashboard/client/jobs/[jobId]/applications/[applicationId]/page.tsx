"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { userLocale } from "@/lib/datetime";
import type { Job, JobApplication, Profile, PortfolioItem } from "@/types/database";
import BackButton from "@/components/ui/BackButton";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Inbox,
  MapPin,
  MessageSquare,
  Upload,
  Wallet,
  X,
} from "lucide-react";

type AppRow = JobApplication & {
  profiles: Pick<Profile, "full_name" | "country" | "email"> | null;
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  const applicationId = Array.isArray(params.applicationId)
    ? params.applicationId[0]
    : params.applicationId;

  const [job, setJob] = useState<Job | null>(null);
  const [application, setApplication] = useState<AppRow | null>(null);
  const [portfolioItem, setPortfolioItem] = useState<Pick<PortfolioItem, "title" | "file_url"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  useEffect(() => {
    const getData = async () => {
      if (!jobId || !applicationId) {
        setError("Invalid URL.");
        setLoading(false);
        return;
      }

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

      const { data: appData, error: appError } = await supabase
        .from("job_applications")
        .select(
          `
          *,
          profiles!job_applications_professional_id_fkey (
            full_name,
            country,
            email
          )
        `,
        )
        .eq("id", applicationId)
        .eq("job_id", jobId)
        .maybeSingle();

      if (appError || !appData) {
        setError("Application not found.");
        setLoading(false);
        return;
      }
      setApplication(appData as AppRow);

      if (appData.portfolio_item_id) {
        const { data: pItem } = await supabase
          .from("portfolio_items")
          .select("title, file_url")
          .eq("id", appData.portfolio_item_id)
          .maybeSingle();
        if (pItem) setPortfolioItem(pItem as Pick<PortfolioItem, "title" | "file_url">);
      }

      setLoading(false);
    };
    getData();
  }, [jobId, applicationId, router]);

  const handleAccept = async () => {
    if (!job || !application) return;
    setAccepting(true);
    const supabase = createClient();

    try {
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .insert({
          job_id: jobId,
          client_id: job.client_id,
          professional_id: application.professional_id,
          application_id: applicationId,
          agreed_budget: application.proposed_rate,
          escrow_amount: application.proposed_rate,
          status: "pending",
        })
        .select()
        .single();

      if (contractError || !contract) {
        console.error("Contract creation failed:", contractError);
        setAccepting(false);
        setShowAcceptModal(false);
        return;
      }

      router.push(`/payments/${contract.id}`);
    } catch (err) {
      console.error(err);
      setAccepting(false);
      setShowAcceptModal(false);
    }
  };

  const handleReject = async () => {
    if (!application) return;
    setRejecting(true);
    const supabase = createClient();
    await supabase
      .from("job_applications")
      .update({ status: "rejected" })
      .eq("id", applicationId);

    setApplication((prev) =>
      prev ? { ...prev, status: "rejected" as const } : prev,
    );
    setRejecting(false);
  };

  const fetchAttachmentUrl = async () => {
    if (!application?.portfolio_attachment_url) return;
    setAttachmentLoading(true);
    setAttachmentError("");
    try {
      const res = await fetch("/api/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: application.portfolio_attachment_url,
          bucket: "portfolio-attachments",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.signedUrl) {
        setAttachmentError(data?.error || "Could not generate download link.");
      } else {
        setAttachmentUrl(data.signedUrl);
      }
    } catch {
      setAttachmentError("Network error generating download link.");
    } finally {
      setAttachmentLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(userLocale(), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDelivery = (value: string | null) => {
    if (!value) return "Not specified";
    return value
      .split("_")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500 dark:text-red-400">{error}</p>
        <Link
          href={`/dashboard/client/jobs/${jobId}/applications`}
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          ← Back to applications
        </Link>
      </div>
    );
  }

  if (!application || !job) {
    return null;
  }

  const screeningQuestions = job.screening_questions ?? [];
  const screeningAnswers = application.screening_answers ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Survey<span className="text-green-600">ConnectHub</span>
        </h1>
        <BackButton
          href={`/dashboard/client/jobs/${jobId}/applications`}
          label="All applications"
        />
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Job context header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Application for
          </p>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {job.title}
          </h2>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> ${job.budget} {job.budget_type}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {job.location || "Remote"}
            </span>
          </div>
        </div>

        {/* Applicant header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-green-700 dark:text-green-300 text-lg font-bold">
                  {application.profiles?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("") || "??"}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {application.profiles?.full_name || "Applicant"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {application.profiles?.country || "—"}
                </p>
                <Link
                  href={`/professionals/${application.professional_id}`}
                  target="_blank"
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium underline underline-offset-2 mt-1 inline-block"
                >
                  View full profile →
                </Link>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${application.proposed_rate.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                proposed rate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Applied{" "}
              {formatDate(application.created_at)}
            </span>
            {application.estimated_delivery && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> Est. delivery{" "}
                {formatDelivery(application.estimated_delivery)}
              </span>
            )}
          </div>

          {/* Status pill */}
          <div className="mt-4">
            {application.status === "pending" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                <Clock className="w-3.5 h-3.5" /> Pending review
              </span>
            )}
            {application.status === "accepted" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
              </span>
            )}
            {application.status === "rejected" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <X className="w-3.5 h-3.5" /> Rejected
              </span>
            )}
          </div>
        </div>

        {/* Cover Letter */}
        <Section icon={<FileText className="w-4 h-4" />} title="Cover Letter">
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
            {application.cover_letter}
          </p>
        </Section>

        {/* Relevant Experience */}
        <Section icon={<FileText className="w-4 h-4" />} title="Relevant Experience">
          {application.relevant_experience ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {application.relevant_experience}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              Not provided.
            </p>
          )}
        </Section>

        {/* Questions for Client */}
        <Section
          icon={<MessageSquare className="w-4 h-4" />}
          title="Questions for Client"
        >
          {application.questions_for_client ? (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
              {application.questions_for_client}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No questions asked.
            </p>
          )}
        </Section>

        {/* Screening Questions */}
        {screeningQuestions.length > 0 && (
          <Section
            icon={<MessageSquare className="w-4 h-4" />}
            title="Screening Questions"
          >
            <div className="space-y-4">
              {screeningQuestions.map((question, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {index + 1}. {question}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {screeningAnswers[index]?.trim() || (
                      <span className="italic text-gray-400 dark:text-gray-500">
                        No answer provided.
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Portfolio Attachment */}
        <Section
          icon={<Upload className="w-4 h-4" />}
          title="Portfolio Attachment"
        >
          {application.portfolio_attachment_url ? (
            <div className="space-y-2">
              {!attachmentUrl && !attachmentLoading && (
                <button
                  onClick={fetchAttachmentUrl}
                  className="inline-flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" /> Generate download link
                </button>
              )}
              {attachmentLoading && (
                <p className="text-sm text-gray-500 dark:text-gray-400 inline-flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  Generating secure link...
                </p>
              )}
              {attachmentError && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {attachmentError}
                </p>
              )}
              {attachmentUrl && (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Download className="w-4 h-4" /> Open attachment (link valid 1 hour)
                </a>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Attachment stored securely. Link expires 1 hour after generation.
              </p>
            </div>
          ) : portfolioItem ? (
            <Link
              href={`/professionals/${application.professional_id}`}
              target="_blank"
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> {portfolioItem.title || "Portfolio item"} — view on profile
            </Link>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              No portfolio attachment submitted.
            </p>
          )}
        </Section>

        {/* Action buttons */}
        {application.status === "pending" && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setShowAcceptModal(true)}
              disabled={accepting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/40 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
            >
              {accepting ? "Creating contract..." : "Accept & Pay"}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="flex-1 sm:flex-none bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              {rejecting ? "Rejecting..." : "Reject"}
            </button>
          </div>
        )}

        {application.status === "accepted" && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              Application accepted — proceed to payment to activate the contract.
            </p>
          </div>
        )}

        {application.status === "rejected" && (
          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-3">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              This application has been rejected.
            </p>
          </div>
        )}
      </div>

      {/* Accept confirmation modal */}
      {showAcceptModal && application && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Acceptance
              </h3>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are about to accept <strong>${application.proposed_rate.toLocaleString()}</strong> as the
              contracted rate for <strong>{application.profiles?.full_name || "this professional"}</strong> on
              the job <strong>{job.title}</strong>.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              You will be redirected to the payment page to fund the escrow. The
              proposed rate is locked in once the contract is created.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAcceptModal(false)}
                disabled={accepting}
                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/40 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm & Proceed to Pay"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
