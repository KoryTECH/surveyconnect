import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/contract-reports";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { contractId, reason, details } = body || {};

  if (!contractId || typeof contractId !== "string") {
    return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
  }
  if (typeof reason !== "string" || !REPORT_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  const trimmedDetails =
    typeof details === "string" ? details.trim() : "";
  if (trimmedDetails.length > 2000) {
    return NextResponse.json(
      { error: "Details must be 2000 characters or fewer" },
      { status: 400 },
    );
  }

  const { data: report, error } = await supabase
    .from("contract_reports")
    .insert({
      contract_id: contractId,
      reporter_id: user.id,
      reason,
      details: trimmedDetails || null,
    })
    .select("id")
    .single();

  if (error || !report) {
    console.error("Failed to insert contract report:", error);
    return NextResponse.json(
      { error: "Could not submit report" },
      { status: 500 },
    );
  }

  // Notify the admin — reuses the shared /api/admin/alerts endpoint
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const secret = process.env.ADMIN_ALERT_SECRET;
    if (baseUrl && secret) {
      await fetch(`${baseUrl.replace(/\/+$/, "")}/api/admin/alerts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-alert-secret": secret,
        },
        body: JSON.stringify({
          type: "contract_reported",
          reference: contractId,
          message: `${reason}${trimmedDetails ? ` — ${trimmedDetails}` : ""}`,
        }),
      }).catch(() => {});
    }
  } catch {
    // Non-critical
  }

  return NextResponse.json({ success: true, id: report.id });
}
