import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateOrigin } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/email/notify";
import { firstOf } from "@/lib/db";
import { ReleaseError, performFlatRateRelease } from "@/lib/paystack/release";

export async function POST(request: NextRequest) {
	try {
		if (!validateOrigin(request)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const allowed = await checkRateLimit(`transfer:${user.id}`, 3, 60);
		if (!allowed) {
			return NextResponse.json({ error: "Too many requests" }, { status: 429 });
		}

		const body = await request.json();
		const { contractId, milestoneId } = body;

		if (milestoneId) {
			// Milestone release path: only pay out a single approved milestone.
			// The contract itself stays open for the remaining milestones.
			const { data: contract, error: contractError } = await supabase
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
				.eq("client_id", user.id)
				.single();

			if (contractError || !contract) {
				return NextResponse.json({ error: "Contract not found" }, { status: 404 });
			}

			const { data: milestone, error: milestoneError } = await supabase
				.from("milestones")
				.select("id, amount, status, approved_at, released_at")
				.eq("id", milestoneId)
				.eq("contract_id", contractId)
				.single();

			if (milestoneError || !milestone) {
				return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
			}
			if (milestone.status !== "approved") {
				return NextResponse.json(
					{ error: "Milestone must be approved before release" },
					{ status: 400 },
				);
			}
			if (milestone.released_at) {
				return NextResponse.json(
					{ error: "Milestone already released" },
					{ status: 409 },
				);
			}

			const professional = contract.profiles;
			if (!professional?.bank_account_number || !professional?.bank_name) {
				return NextResponse.json(
					{
						error:
							"Professional has not added their bank details yet. Ask them to add their bank account in their profile settings.",
					},
					{ status: 400 },
				);
			}
			if (!contract.exchange_rate_used || !contract.exchange_rate_used) {
				return NextResponse.json(
					{ error: "Contract exchange rate not initialized" },
					{ status: 400 },
				);
			}

			const exchangeRate = Number(contract.exchange_rate_used);
			const milestoneAmount = Number(milestone.amount);
			const professionalAmountNgn = Math.round(
				milestoneAmount * exchangeRate * 0.95,
			);
			const professionalAmountKobo = professionalAmountNgn * 100;
			const professionalReceivesUsd = Number((milestoneAmount * 0.95).toFixed(2));
			const platformFeeUsd = Number((milestoneAmount * 0.1).toFixed(2));

			const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
			if (!paystackSecretKey) {
				return NextResponse.json(
					{ error: "Payment service not configured" },
					{ status: 500 },
				);
			}

			let recipientCode = professional.paystack_recipient_code;
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
					return NextResponse.json(
						{ error: "Failed to create transfer recipient" },
						{ status: 502 },
					);
				}
				const recipientData = await recipientResponse.json();
				if (!recipientData.status) {
					return NextResponse.json(
						{ error: "Failed to create transfer recipient" },
						{ status: 500 },
					);
				}
				recipientCode = recipientData.data.recipient_code;
				await supabase
					.from("profiles")
					.update({ paystack_recipient_code: recipientCode })
					.eq("id", contract.professional_id);
			}

			// Atomically claim the milestone release before calling Paystack.
			const releaseTimestamp = new Date().toISOString();
			const { data: claimedRows, error: claimError } = await supabase
				.from("milestones")
				.update({
					status: "released",
					released_at: releaseTimestamp,
					paystack_transfer_reference: `SC-MREL-${milestoneId}-${Date.now()}`,
				})
				.eq("id", milestoneId)
				.eq("status", "approved")
				.is("released_at", null)
				.select("id");

			if (claimError) {
				return NextResponse.json(
					{ error: "Failed to record milestone release" },
					{ status: 500 },
				);
			}
			if (!claimedRows || claimedRows.length === 0) {
				return NextResponse.json(
					{ error: "Milestone already released" },
					{ status: 409 },
				);
			}

			const transferReference = `SC-MREL-${milestoneId}-${Date.now()}`;
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
					reason: `Milestone payment for ${firstOf(contract.jobs)?.title ?? contract.job_id} on SurveyConnectHub`,
					metadata: { contract_id: contractId, milestone_id: milestoneId },
				}),
			});

			if (!transferResponse.ok) {
				try {
					await supabase
						.from("milestones")
						.update({
							status: "approved",
							released_at: null,
							paystack_transfer_reference: null,
						})
						.eq("id", milestoneId)
						.eq("released_at", releaseTimestamp);
				} catch {}
				return NextResponse.json({ error: "Transfer failed" }, { status: 502 });
			}

			const transferData = await transferResponse.json();
			if (!transferData.status) {
				try {
					await supabase
						.from("milestones")
						.update({
							status: "approved",
							released_at: null,
							paystack_transfer_reference: null,
						})
						.eq("id", milestoneId)
						.eq("released_at", releaseTimestamp);
				} catch {}
				return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
			}

			// Record the two transactions rows for the audit trail.
			try {
				const serviceClient = createServiceClient();
				await serviceClient.from("transactions").insert([
					{
						contract_id: contractId,
						milestone_id: milestoneId,
						type: "milestone_release",
						amount: professionalReceivesUsd,
						platform_fee: 0,
						status: "completed",
						paystack_transfer_reference: transferReference,
					},
					{
						contract_id: contractId,
						milestone_id: milestoneId,
						type: "platform_fee",
						amount: platformFeeUsd,
						platform_fee: platformFeeUsd,
						status: "completed",
					},
				]);
			} catch (err) {
				console.error("Failed to insert milestone release transactions:", err);
			}

			if (professional?.email && professional?.full_name) {
				sendNotificationEmail({
					supabase,
					userId: user.id,
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
				const serviceClient = createServiceClient();
				await serviceClient
					.from("notifications")
					.insert({
						user_id: contract.professional_id,
						title: "Milestone payment released",
						message: `$${professionalReceivesUsd.toFixed(2)} released for milestone "${
							milestoneId
						}" on "${firstOf(contract.jobs)?.title ?? "your job"}"`,
						type: "payment",
						link: "/dashboard/professional/contracts",
						is_read: false,
					});
			} catch {}

			return NextResponse.json({
				success: true,
				message: "Milestone payment released successfully",
				amount: professionalAmountNgn,
			});
		}

		// Flat-rate release path — shared with the admin force-release flow.
		// The client flow requires ownership and a completed contract; the
		// admin flow (/api/admin/force-release) passes neither.
		const releaseResult = await performFlatRateRelease({
			serviceClient: createServiceClient(),
			contractId,
			clientId: user.id,
			requireCompleted: true,
			notifyPartyId: user.id,
		});

		return NextResponse.json({
			success: true,
			message: "Payment released successfully",
			amount: releaseResult.professionalAmountNgn,
		});
	} catch (error) {
		if (error instanceof ReleaseError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
