import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationEmail } from "@/lib/email/notify";
import { firstOf } from "@/lib/db";

export class ReleaseError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ReleaseError";
  }
}

export type ReleaseResult = {
  contractId: string;
  professionalAmountUsd: number;
  professionalAmountNgn: number;
  platformFeeUsd: number;
  transferReference: string;
};

export type FlatRateReleaseOptions = {
  serviceClient: SupabaseClient;
  contractId: string;
  /** When set, the contract must be owned by this client (client-triggered flow). */
  clientId?: string;
  /** When true, the contract must already be marked completed (client-triggered flow). */
  requireCompleted?: boolean;
  /** Party id passed to the notification helper for its ownership authorization. */
  notifyPartyId?: string;
};

/**
 * Releases the full flat-rate escrow for a contract to its professional.
 * Shared by the client-triggered path (/api/paystack/transfer) and the
 * admin force-release path (/api/admin/force-release). The admin path
 * passes no clientId/requireCompleted, which is the point: admins can
 * release for contracts the client never marked complete.
 *
 * Order of operations (identical for both callers):
 *   1. Load the contract with ownership/status guards.
 *   2. Validate bank details, exchange rate and budget.
 *   3. Create a Paystack transfer recipient if one isn't stored.
 *   4. Atomically claim the release (payment_released_at IS NULL) BEFORE
 *      calling Paystack, so concurrent requests can't double-spend.
 *   5. Call Paystack; on failure roll the claim back.
 *   6. Record transaction audit rows and notifications (best-effort).
 */
export async function performFlatRateRelease(
  options: FlatRateReleaseOptions,
): Promise<ReleaseResult> {
  const { serviceClient, contractId, clientId, requireCompleted, notifyPartyId } =
    options;

  let query = serviceClient
    .from("contracts")
    .select(
      `
      *,
      jobs(title),
      profiles!contracts_professional_id_fkey(
        full_name,
        email,
        bank_account_number,
        bank_name,
        bank_account_name,
        paystack_recipient_code
      )
    `,
    )
    .eq("id", contractId)
    .is("payment_released_at", null);

  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  if (requireCompleted) {
    query = query.eq("status", "completed");
  }

  const { data: contract, error: contractError } = await query.single();

  if (contractError || !contract) {
    throw new ReleaseError(404, "Contract not found or already paid");
  }

  const professional = contract.profiles;

  if (!professional?.bank_account_number || !professional?.bank_name) {
    throw new ReleaseError(
      400,
      "Professional has not added their bank details yet. Ask them to add their bank account in their profile settings.",
    );
  }

  if (!contract.exchange_rate_used) {
    throw new ReleaseError(400, "Contract exchange rate not initialized");
  }

  if (!contract.agreed_budget) {
    throw new ReleaseError(400, "Contract agreed budget not available");
  }

  // Professional receives 95% of agreed budget, converted using stored exchange rate.
  const exchangeRate = Number(contract.exchange_rate_used);
  const agreedBudget = Number(contract.agreed_budget);
  const professionalAmountNgn = Math.round(agreedBudget * exchangeRate * 0.95);
  const professionalAmountKobo = professionalAmountNgn * 100;
  const professionalReceivesUsd = Number((agreedBudget * 0.95).toFixed(2));
  // Platform earns 10% total: 5% charged to client on top of
  // agreedBudget at initialize (client pays agreedBudget * 1.05),
  // and 5% withheld from pro here (pro receives agreedBudget * 0.95).
  // The 10% platform_fee row records both halves of the spread.
  const platformFeeUsd = Number((agreedBudget * 0.1).toFixed(2));

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    throw new ReleaseError(500, "Payment service not configured");
  }

  let recipientCode = professional.paystack_recipient_code;

  // Create transfer recipient if not exists
  if (!recipientCode) {
    const recipientResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: professional.bank_account_name || professional.full_name,
          account_number: professional.bank_account_number,
          bank_code: professional.bank_name,
          currency: "NGN",
        }),
      },
    );

    if (!recipientResponse.ok) {
      throw new ReleaseError(502, "Failed to create transfer recipient");
    }

    const recipientData = await recipientResponse.json();

    if (!recipientData.status) {
      throw new ReleaseError(500, "Failed to create transfer recipient");
    }

    recipientCode = recipientData.data.recipient_code;

    const { error: recipientUpdateError } = await serviceClient
      .from("profiles")
      .update({ paystack_recipient_code: recipientCode })
      .eq("id", contract.professional_id);

    if (recipientUpdateError) {
      console.error(
        "Failed to save paystack_recipient_code:",
        recipientUpdateError,
      );
    }
  }

  // Atomically claim the release BEFORE calling Paystack to prevent
  // concurrent requests from both calling Paystack (double-spend).
  const releaseTimestamp = new Date().toISOString();
  const { data: claimedRows, error: claimError } = await serviceClient
    .from("contracts")
    .update({
      payment_released_at: releaseTimestamp,
      professional_receives: professionalReceivesUsd,
      platform_fee: platformFeeUsd,
    })
    .eq("id", contractId)
    .is("payment_released_at", null)
    .select("id");

  if (claimError) {
    throw new ReleaseError(500, "Failed to record payment release");
  }

  if (!claimedRows || claimedRows.length === 0) {
    throw new ReleaseError(409, "Payment already released");
  }

  // Claim acquired — now call Paystack. If this fails, rollback the claim.
  const transferReference = `SC-REL-${contractId}-${Date.now()}`;
  const transferResponse = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: professionalAmountKobo,
      recipient: recipientCode,
      reference: transferReference,
      reason: `Payment for ${firstOf(contract.jobs)?.title ?? contract.job_id} on SurveyConnectHub`,
      metadata: { contract_id: contractId },
    }),
  });

  if (!transferResponse.ok) {
    try {
      await serviceClient
        .from("contracts")
        .update({
          payment_released_at: null,
          professional_receives: null,
          platform_fee: null,
        })
        .eq("id", contractId)
        .eq("payment_released_at", releaseTimestamp);
    } catch {
      // best-effort rollback
    }
    throw new ReleaseError(502, "Transfer failed");
  }

  const transferData = await transferResponse.json();

  if (!transferData.status) {
    try {
      await serviceClient
        .from("contracts")
        .update({
          payment_released_at: null,
          professional_receives: null,
          platform_fee: null,
        })
        .eq("id", contractId)
        .eq("payment_released_at", releaseTimestamp);
    } catch {
      // best-effort rollback
    }
    throw new ReleaseError(500, "Transfer failed");
  }

  // Record the two transactions rows for the audit trail (flat-rate
  // flow). Best-effort: a missing audit row does not unwind the release,
  // since the contract is already marked paid and Paystack has sent the funds.
  try {
    await serviceClient.from("transactions").insert([
      {
        contract_id: contractId,
        type: "payment_release",
        amount: professionalReceivesUsd,
        platform_fee: 0,
        status: "completed",
        paystack_transfer_reference: transferReference,
      },
      {
        contract_id: contractId,
        type: "platform_fee",
        amount: platformFeeUsd,
        platform_fee: platformFeeUsd,
        status: "completed",
      },
    ]);
  } catch (err) {
    console.error("Failed to insert flat-rate release transactions:", err);
  }

  // Notifications — best effort, non-critical
  const notifyAs = notifyPartyId ?? contract.professional_id;
  if (professional?.email && professional?.full_name) {
    sendNotificationEmail({
      supabase: serviceClient,
      userId: notifyAs,
      payload: {
        event: "payment_released",
        recipientEmail: professional.email,
        recipientName: professional.full_name,
        details: {
          amount: professionalReceivesUsd.toFixed(2),
          jobTitle: firstOf(contract.jobs)?.title ?? "your job",
          contractId,
        },
      },
    }).catch(() => {});
  }

  try {
    await serviceClient.from("notifications").insert({
      user_id: contract.professional_id,
      title: "Payment released",
      message: `$${professionalReceivesUsd.toFixed(2)} released for "${
        firstOf(contract.jobs)?.title ?? "your job"
      }"`,
      type: "payment",
      link: "/dashboard/professional/contracts",
      is_read: false,
    });
  } catch {
    // Non-critical
  }

  return {
    contractId,
    professionalAmountUsd: professionalReceivesUsd,
    professionalAmountNgn,
    platformFeeUsd,
    transferReference,
  };
}
