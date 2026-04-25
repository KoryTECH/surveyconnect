import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const allowed = checkRateLimit(`transfer:${user.id}`, 3, 60_000);
		if (!allowed) {
			return NextResponse.json({ error: "Too many requests" }, { status: 429 });
		}

		const { contractId } = await request.json();

		// Get contract details
		const { data: contract, error: contractError } = await supabase
			.from("contracts")
			.select(
				`
        *,
        profiles!contracts_professional_id_fkey(
          full_name,
          bank_account_number,
          bank_name,
          bank_account_name,
          paystack_recipient_code
        )
      `,
			)
			.eq("id", contractId)
			.eq("client_id", user.id)
			.eq("status", "completed")
			.is("payment_released_at", null)
			.single();

		if (contractError || !contract) {
			return NextResponse.json(
				{ error: "Contract not found or already paid" },
				{ status: 404 },
			);
		}

		const professional = contract.profiles;

		// Check if professional has bank details
		if (!professional?.bank_account_number || !professional?.bank_name) {
			return NextResponse.json(
				{
					error:
						"Professional has not added their bank details yet. Ask them to add their bank account in their profile settings.",
				},
				{ status: 400 },
			);
		}

		if (!contract.exchange_rate_used) {
			return NextResponse.json(
				{ error: "Contract exchange rate not initialized" },
				{ status: 400 },
			);
		}

		if (!contract.agreed_budget) {
			return NextResponse.json(
				{ error: "Contract agreed budget not available" },
				{ status: 400 },
			);
		}

		// Professional receives 95% of agreed budget, converted using stored exchange rate.
		const exchangeRate = Number(contract.exchange_rate_used);
		const agreedBudget = Number(contract.agreed_budget);
		const professionalAmountNgn = Math.round(
			agreedBudget * exchangeRate * 0.95,
		);
		const professionalAmountKobo = professionalAmountNgn * 100;
		const professionalReceivesUsd = Number((agreedBudget * 0.95).toFixed(2));
		const platformFeeUsd = Number((agreedBudget * 0.1).toFixed(2));

		let recipientCode = professional.paystack_recipient_code;

		// Create transfer recipient if not exists
		if (!recipientCode) {
			const recipientResponse = await fetch(
				"https://api.paystack.co/transferrecipient",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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

			const recipientData = await recipientResponse.json();

			if (!recipientData.status) {
				return NextResponse.json(
					{ error: "Failed to create transfer recipient" },
					{ status: 500 },
				);
			}

			recipientCode = recipientData.data.recipient_code;

			// Save recipient code for future transfers
			await supabase
				.from("profiles")
				.update({ paystack_recipient_code: recipientCode })
				.eq("id", contract.professional_id);
		}

		const releaseTimestamp = new Date().toISOString();
		const { data: releaseLockRows, error: releaseLockError } = await supabase
			.from("contracts")
			.update({ payment_released_at: releaseTimestamp })
			.eq("id", contractId)
			.is("payment_released_at", null)
			.select("id");

		if (releaseLockError) {
			console.error("Failed to acquire release lock:", releaseLockError);
			return NextResponse.json(
				{ error: "Could not release payment" },
				{ status: 500 },
			);
		}

		if (!releaseLockRows || releaseLockRows.length === 0) {
			return NextResponse.json(
				{ error: "Payment already released" },
				{ status: 409 },
			);
		}

		// Initiate transfer
		const transferResponse = await fetch("https://api.paystack.co/transfer", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				source: "balance",
				amount: professionalAmountKobo,
				recipient: recipientCode,
				reason: `Payment for ${contract.job_id} on SurveyConnectHub`,
			}),
		});

		const transferData = await transferResponse.json();

		if (!transferData.status) {
			await supabase
				.from("contracts")
				.update({ payment_released_at: null })
				.eq("id", contractId);
			return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
		}

		await supabase
			.from("contracts")
			.update({
				professional_receives: professionalReceivesUsd,
				platform_fee: platformFeeUsd,
			})
			.eq("id", contractId);

		return NextResponse.json({
			success: true,
			message: "Payment released successfully",
			amount: professionalAmountNgn,
		});
	} catch (error) {
		console.error("Transfer error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
