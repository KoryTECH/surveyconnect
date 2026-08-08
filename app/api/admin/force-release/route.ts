import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateOrigin } from "@/lib/csrf";
import { firstOf } from "@/lib/db";
import { ReleaseError, performFlatRateRelease } from "@/lib/paystack/release";

export const dynamic = "force-dynamic";

type AdminContext =
  | { user: { id: string }; response: null }
  | { user: null; response: NextResponse };

async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, response: null };
}

const CONTRACT_SELECT = `
  id,
  status,
  agreed_budget,
  exchange_rate_used,
  is_milestone_based,
  payment_released_at,
  jobs(title),
  professional:profiles!contracts_professional_id_fkey(
    full_name,
    email,
    bank_account_number,
    bank_name
  ),
  client:profiles!contracts_client_id_fkey(
    full_name,
    email
  )
`;

type ContractRow = {
  id: string;
  status: string;
  agreed_budget: number | null;
  exchange_rate_used: number | null;
  is_milestone_based: boolean;
  payment_released_at: string | null;
  jobs: { title: string } | { title: string }[] | null;
  professional:
    | {
        full_name: string | null;
        email: string | null;
        bank_account_number: string | null;
        bank_name: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
        bank_account_number: string | null;
        bank_name: string | null;
      }[]
    | null;
  client:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
};

function normalizeContract(row: ContractRow) {
  const professional = Array.isArray(row.professional)
    ? row.professional[0]
    : row.professional;
  const client = Array.isArray(row.client) ? row.client[0] : row.client;
  const jobTitle = Array.isArray(row.jobs) ? row.jobs[0]?.title : row.jobs?.title;
  const hasBankDetails = Boolean(
    professional?.bank_account_number && professional?.bank_name,
  );
  return {
    id: row.id,
    status: row.status,
    agreedBudget: Number(row.agreed_budget || 0),
    professionalReceives: Number(
      (Number(row.agreed_budget || 0) * 0.95).toFixed(2),
    ),
    isMilestoneBased: row.is_milestone_based,
    paymentReleasedAt: row.payment_released_at,
    jobTitle: jobTitle || null,
    professionalName: professional?.full_name || null,
    professionalEmail: professional?.email || null,
    clientName: client?.full_name || null,
    clientEmail: client?.email || null,
    hasBankDetails,
  };
}

// GET: contract lookup (?contractId=...) or dashboard feed (unreleased
// contracts + recent admin actions) for the admin panel.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const ctx = await requireAdmin(supabase);
  if (!ctx.user) return ctx.response;

  const serviceClient = createServiceClient();
  const contractId = request.nextUrl.searchParams.get("contractId");

  if (contractId) {
    const { data: row, error } = await serviceClient
      .from("contracts")
      .select(CONTRACT_SELECT)
      .eq("id", contractId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const { data: openReports } = await serviceClient
      .from("contract_reports")
      .select("id, reason, details, created_at")
      .eq("contract_id", contractId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      contract: {
        ...normalizeContract(row as ContractRow),
        openReport: openReports?.[0] || null,
      },
    });
  }

  const [
    { data: pendingRows, error: pendingError },
    { data: actions, error: actionsError },
  ] = await Promise.all([
    serviceClient
      .from("contracts")
      .select(CONTRACT_SELECT)
      .is("payment_released_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    serviceClient
      .from("admin_actions")
      .select(
        `
        id,
        action,
        contract_id,
        details,
        created_at,
        admin:profiles!admin_actions_admin_id_fkey(full_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (pendingError) {
    console.error("Failed to load unreleased contracts:", pendingError);
    return NextResponse.json(
      { error: "Failed to load contracts" },
      { status: 500 },
    );
  }

  const pendingIds = (pendingRows || []).map((row) => row.id);
  let reportedContractIds = new Set<string>();
  if (pendingIds.length > 0) {
    const { data: openReportRows } = await serviceClient
      .from("contract_reports")
      .select("contract_id")
      .eq("status", "open")
      .in("contract_id", pendingIds);
    reportedContractIds = new Set(
      (openReportRows || []).map((report) => report.contract_id),
    );
  }

  return NextResponse.json({
    pendingContracts: (pendingRows || []).map((row) => ({
      ...normalizeContract(row as ContractRow),
      hasOpenReport: reportedContractIds.has(row.id),
    })),
    actions: (actions || []).map((action) => ({
      id: action.id,
      action: action.action,
      contractId: action.contract_id,
      details: action.details,
      createdAt: action.created_at,
      adminName: firstOf(action.admin)?.full_name || "Unknown admin",
    })),
    actionsError: actionsError ? "Failed to load action log" : null,
  });
}

// POST: force-release escrow for a contract outside the normal client
// flow. Logs the action to admin_actions for the audit trail.
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const ctx = await requireAdmin(supabase);
  if (!ctx.user) return ctx.response;

  const allowed = await checkRateLimit(`force-release:${ctx.user.id}`, 3, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const { contractId } = body || {};

  if (!contractId || typeof contractId !== "string") {
    return NextResponse.json({ error: "Missing contract id" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: contract } = await serviceClient
    .from("contracts")
    .select("id, status, professional_id, is_milestone_based, payment_released_at")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  if (contract.is_milestone_based) {
    return NextResponse.json(
      {
        error:
          "Milestone-based contracts use the per-milestone release flow — force release is only available for flat-rate contracts.",
      },
      { status: 400 },
    );
  }

  if (contract.payment_released_at) {
    return NextResponse.json(
      { error: "Payment already released" },
      { status: 409 },
    );
  }

  try {
    const releaseResult = await performFlatRateRelease({
      serviceClient,
      contractId,
      // The admin is not a party to the contract; the notification helper's
      // ownership check needs a party id, so it runs as the professional.
      notifyPartyId: contract.professional_id,
    });

    try {
      await serviceClient.from("admin_actions").insert({
        admin_id: ctx.user.id,
        action: "force_release",
        contract_id: contractId,
        details: {
          prior_status: contract.status,
          professional_receives_usd: releaseResult.professionalAmountUsd,
          professional_amount_ngn: releaseResult.professionalAmountNgn,
          platform_fee_usd: releaseResult.platformFeeUsd,
          transfer_reference: releaseResult.transferReference,
        },
      });
    } catch (logError) {
      console.error("Failed to log admin action:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Payment force-released successfully",
      amount: releaseResult.professionalAmountNgn,
      transferReference: releaseResult.transferReference,
    });
  } catch (error) {
    if (error instanceof ReleaseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Force release failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
