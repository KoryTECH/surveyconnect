import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email/notify";
import { NextRequest, NextResponse } from "next/server";
import { firstOf } from "@/lib/db";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const reference = searchParams.get("reference");

		if (!reference) {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const controller = new AbortController();
		const timeoutMs = Number(process.env.PAYSTACK_TIMEOUT_MS ?? "8000");
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		let paystackResponse: Response;
		try {
			paystackResponse = await fetch(
				`https://api.paystack.co/transaction/verify/${reference}`,
				{
					headers: {
						Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
					},
					signal: controller.signal,
				},
			);
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return NextResponse.redirect(
					new URL("/dashboard/client?payment=failed", request.url),
				);
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}

		if (!paystackResponse.ok) {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const paystackData = await paystackResponse.json();

		if (!paystackData.status || paystackData.data.status !== "success") {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const contractId = paystackData.data.metadata?.contractId;
		const milestoneId = paystackData.data.metadata?.milestoneId;

		if (!contractId) {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const { data: ownerCheck } = await supabase
			.from("contracts")
			.select("client_id")
			.eq("id", contractId)
			.single();

		if (!ownerCheck || ownerCheck.client_id !== user.id) {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const { data: contract } = await supabase
			.from("contracts")
			.select(
				"job_id, application_id, status, ngn_amount_paid, agreed_budget, client_id, professional_id, jobs(title)",
			)
			.eq("id", contractId)
			.single();

		if (!contract) {
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		const expectedAmountKobo = Number(contract.ngn_amount_paid || 0) * 100;
		const paidAmountKobo = Number(paystackData.data.amount || 0);

		if (milestoneId) {
			// Milestone funding path: verify amount against milestone.amount ×
			// 1.05 × exchange_rate_used, then mark milestone funded + insert
			// a transactions row.
			const { data: milestone } = await supabase
				.from("milestones")
				.select("id, amount, status, funded_reference")
				.eq("id", milestoneId)
				.eq("contract_id", contractId)
				.single();

			if (!milestone) {
				return NextResponse.redirect(
					new URL("/dashboard/client?payment=failed", request.url),
				);
			}

			// The exchange rate used at initialize time was stored in the
			// Paystack metadata payload (sent by /api/paystack/initialize).
			const exchangeRate = paystackData.data.metadata?.exchangeRate
				? Number(paystackData.data.metadata.exchangeRate)
				: null;
			if (!exchangeRate) {
				console.error("Missing exchange rate in Paystack metadata for milestone funding");
				return NextResponse.redirect(
					new URL("/dashboard/client?payment=failed", request.url),
				);
			}

			const expectedMilestoneAmountKobo =
				Math.round(Number(milestone.amount) * 1.05 * exchangeRate) * 100;

			if (
				expectedMilestoneAmountKobo <= 0 ||
				paidAmountKobo !== expectedMilestoneAmountKobo ||
				paystackData.data.currency !== "NGN"
			) {
				console.error("Milestone payment amount mismatch:", {
					contractId,
					milestoneId,
					expectedMilestoneAmountKobo,
					paidAmountKobo,
				});
				return NextResponse.redirect(
					new URL("/dashboard/client?payment=failed", request.url),
				);
			}

			// Atomically flip the milestone to "funded". Use the funded_reference
			// guard so a duplicate webhook cannot double-flip it.
			const { data: updatedMilestone, error: milestoneUpdateError } = await supabase
				.from("milestones")
				.update({
					status: "funded",
					funded_at: new Date().toISOString(),
					paystack_payment_reference: reference,
				})
				.eq("id", milestoneId)
				.eq("status", "pending")
				.eq("funded_reference", reference)
				.select("id")
				.single();

			if (milestoneUpdateError || !updatedMilestone) {
				console.error("Milestone funding update failed:", milestoneUpdateError);
				return NextResponse.redirect(
					new URL("/dashboard/client?payment=failed", request.url),
				);
			}

			// Record the escrow deposit as a transactions row.
			try {
				const serviceClient = createServiceClient();
				await serviceClient.from("transactions").insert({
					contract_id: contractId,
					milestone_id: milestoneId,
					type: "escrow_deposit",
					amount: Number(milestone.amount),
					platform_fee: Number(milestone.amount) * 0.05,
					status: "completed",
					paystack_reference: reference,
				});
			} catch (err) {
				// Non-critical — the milestone is funded, we just lost the audit row.
				console.error("Failed to insert milestone escrow_deposit transaction:", err);
			}

			// If the contract is still pending and this is its first funded
			// milestone, activate the contract so work can begin.
			if (contract.status === "pending") {
				await supabase
					.from("contracts")
					.update({
						status: "active",
						start_date: new Date().toISOString(),
						payment_reference: reference,
					})
					.eq("id", contractId)
					.eq("status", "pending")
					.is("payment_reference", null);

				const { error: acceptError } = await supabase
					.from("job_applications")
					.update({ status: "accepted" })
					.eq("id", contract.application_id);
				if (acceptError) {
					console.error("Failed to mark application accepted on milestone funding:", acceptError);
				}
			}

			return NextResponse.redirect(
				new URL("/dashboard/client/contracts?payment=success", request.url),
			);
		}

		if (
			expectedAmountKobo <= 0 ||
			paidAmountKobo !== expectedAmountKobo ||
			paystackData.data.currency !== "NGN"
		) {
			console.error("Payment amount mismatch on verify:", {
				contractId,
				expectedAmountKobo,
				paidAmountKobo,
			});
			return NextResponse.redirect(
				new URL("/dashboard/client?payment=failed", request.url),
			);
		}

		if (contract.status === "pending") {
			// Atomically activate contract — this is the lock
			const { data: activatedRows } = await supabase
				.from("contracts")
				.update({
					status: "active",
					start_date: new Date().toISOString(),
					payment_reference: reference,
				})
				.eq("id", contractId)
				.eq("status", "pending")
				.is("payment_reference", null)
				.select("id");

			if (activatedRows && activatedRows.length > 0) {
				// Multi-step writes with manual rollback on failure
				const { error: acceptError } = await supabase
					.from("job_applications")
					.update({ status: "accepted" })
					.eq("id", contract.application_id);

				if (acceptError) {
					await supabase.from("contracts").update({ status: "pending", start_date: null, payment_reference: null }).eq("id", contractId);
					return NextResponse.redirect(new URL("/dashboard/client?payment=failed", request.url));
				}

				const { error: rejectError } = await supabase
					.from("job_applications")
					.update({ status: "rejected" })
					.eq("job_id", contract.job_id)
					.neq("id", contract.application_id);

				if (rejectError) {
					await supabase.from("contracts").update({ status: "pending", start_date: null, payment_reference: null }).eq("id", contractId);
					await supabase.from("job_applications").update({ status: "pending" }).eq("id", contract.application_id);
					return NextResponse.redirect(new URL("/dashboard/client?payment=failed", request.url));
				}

				const { error: jobError } = await supabase
					.from("jobs")
					.update({ status: "in_progress" })
					.eq("id", contract.job_id);

			if (jobError) {
				await supabase.from("contracts").update({ status: "pending", start_date: null, payment_reference: null }).eq("id", contractId);
				await supabase.from("job_applications").update({ status: "pending" }).eq("id", contract.application_id);
				await supabase.from("job_applications").update({ status: "pending" }).eq("job_id", contract.job_id).neq("id", contract.application_id);
				return NextResponse.redirect(new URL("/dashboard/client?payment=failed", request.url));
			}

			// Record the escrow deposit as a transactions row (flat-rate flow).
			// Mirrors the milestone funding path at line 179. Best-effort: a
			// missing audit row does not unwind the activation, since the
			// contract is already committed and the client has paid Paystack.
			try {
				const escrowServiceClient = createServiceClient();
				const agreedBudgetUsd = Number(contract.agreed_budget) || 0;
				await escrowServiceClient.from("transactions").insert({
					contract_id: contractId,
					type: "escrow_deposit",
					amount: agreedBudgetUsd,
					platform_fee: Number((agreedBudgetUsd * 0.05).toFixed(2)),
					status: "completed",
					paystack_reference: reference,
				});
			} catch (err) {
				console.error("Failed to insert flat-rate escrow_deposit transaction:", err);
			}

			// Notifications — best effort, non-critical
				const jobData = firstOf(contract.jobs);
				const jobTitle = jobData?.title ?? "your job";

				const { data: clientProfile } = await supabase
					.from("profiles")
					.select("full_name, email")
					.eq("id", contract.client_id)
					.single();
				const { data: professionalProfile } = await supabase
					.from("profiles")
					.select("full_name, email")
					.eq("id", contract.professional_id)
					.single();

				if (clientProfile?.email && clientProfile?.full_name) {
					sendNotificationEmail({
						supabase,
						userId: user.id,
						payload: {
							event: "contract_activated",
							recipientEmail: clientProfile.email,
							recipientName: clientProfile.full_name,
							details: {
								jobTitle,
								otherParty: professionalProfile?.full_name ?? "professional",
								role: "client",
								contractId,
							},
						},
					}).catch(() => {});
				}

				if (professionalProfile?.email && professionalProfile?.full_name) {
					sendNotificationEmail({
						supabase,
						userId: user.id,
						payload: {
							event: "contract_activated",
							recipientEmail: professionalProfile.email,
							recipientName: professionalProfile.full_name,
							details: {
								jobTitle,
								otherParty: clientProfile?.full_name ?? "client",
								role: "professional",
								contractId,
							},
						},
					}).catch(() => {});
				}

				try {
					const serviceClient = createServiceClient();
					await serviceClient
						.from("notifications")
						.insert([
							{
								user_id: contract.client_id,
								title: "Contract activated",
								message: `Your contract for "${jobTitle}" with ${
									professionalProfile?.full_name ?? "the professional"
								} is now active.`,
								type: "contract",
								link: "/dashboard/client/contracts",
								is_read: false,
							},
							{
								user_id: contract.professional_id,
								title: "Contract activated",
								message: `Your contract for "${jobTitle}" with ${
									clientProfile?.full_name ?? "the client"
								} is now active.`,
								type: "contract",
								link: "/dashboard/professional/contracts",
								is_read: false,
							},
						]);
				} catch {
					// Non-critical
				}
			}
		}

		return NextResponse.redirect(
			new URL("/dashboard/client/contracts?payment=success", request.url),
		);
	} catch (error) {
		console.error("Payment verification error:", error);
		return NextResponse.redirect(
			new URL("/dashboard/client?payment=failed", request.url),
		);
	}
}
