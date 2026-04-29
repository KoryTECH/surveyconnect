import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

type NotifyEvent =
  | "contract_activated"
  | "job_completed"
  | "payment_released"
  | "application_received";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { event, recipientEmail, recipientName, details } =
    (await request.json()) as {
      event: NotifyEvent;
      recipientEmail: string;
      recipientName: string;
      details: Record<string, string>;
    };

  const subjects: Record<NotifyEvent, string> = {
    contract_activated: "Your contract is now active — SurveyConnectHub",
    job_completed: "Job marked complete — review and release payment",
    payment_released: "Payment has been released to your account",
    application_received: "New application received for your job",
  };

  const bodies: Record<NotifyEvent, string> = {
    contract_activated: `Hi ${recipientName},<br><br>Your contract for <strong>${details.jobTitle}</strong> is now active. You can communicate with your ${details.otherParty} via the platform chat.<br><br><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${details.role}/contracts">View Contract</a>`,
    job_completed: `Hi ${recipientName},<br><br>The professional has marked <strong>${details.jobTitle}</strong> as complete. Please review the work and release payment if satisfied.<br><br><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/contracts">Review & Release Payment</a>`,
    payment_released: `Hi ${recipientName},<br><br>Payment of <strong>$${details.amount}</strong> has been released for <strong>${details.jobTitle}</strong>. It will be transferred to your bank account.<br><br><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/professional/contracts">View Contracts</a>`,
    application_received: `Hi ${recipientName},<br><br>You have a new application for <strong>${details.jobTitle}</strong> from ${details.applicantName}.<br><br><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/jobs/${details.jobId}/applications">Review Application</a>`,
  };

  await resend.emails.send({
    from: "SurveyConnectHub <notifications@resend.dev>",
    to: recipientEmail,
    subject: subjects[event],
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      ${bodies[event]}
      <hr style="margin: 24px 0; border-color: #e5e7eb;" />
      <p style="color: #6b7280; font-size: 12px;">SurveyConnectHub — Marketplace for Geospatial Professionals</p>
    </div>`,
  });

  return NextResponse.json({ success: true });
}
