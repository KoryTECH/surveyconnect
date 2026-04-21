import { createClient } from "@/lib/supabase/server";
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
			.single();

		if (contractError || !contract) {
			return NextResponse.json(
				{ error: "Contract not found" },
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

		// Fetch live exchange rate
		let usdToNgn = 1600;
		try {
			const rateResponse = await fetch(
				`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`,
			);
			const rateData = await rateResponse.json();
			if (rateData.result === "success") {
				usdToNgn = rateData.conversion_rates.NGN;
			}
		} catch (err) {
			console.error("Exchange rate fetch failed, using fallback");
		}

		// Professional receives 93% of agreed budget
		const professionalAmountUsd = Number(contract.agreed_budget) * 0.93;
		const professionalAmountNgn = Math.round(professionalAmountUsd * usdToNgn);
		const professionalAmountKobo = professionalAmountNgn * 100;

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
			return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
		}

		// Update contract status to paid
		await supabase
			.from("contracts")
			.update({ status: "completed" })
			.eq("id", contractId);

		return NextResponse.json({
			success: true,
			message: "Payment released successfully",
			amount: professionalAmountUsd,
		});
	} catch (error) {
		console.error("Transfer error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
