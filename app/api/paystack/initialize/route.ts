import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const allowed = checkRateLimit(`initialize:${user.id}`, 3, 60_000);
		if (!allowed) {
			return NextResponse.json({ error: "Too many requests" }, { status: 429 });
		}

		const body = await request.json();
		const { contractId } = body;

		if (!contractId) {
			return NextResponse.json(
				{ error: "Missing contractId" },
				{ status: 400 },
			);
		}

		// Look up contract server-side — never trust client-sent amounts
		const { data: contract, error: contractError } = await supabase
			.from("contracts")
			.select("id, agreed_budget, status, client_id")
			.eq("id", contractId)
			.single();

		if (contractError || !contract) {
			console.error("Contract lookup failed:", contractError);
			return NextResponse.json(
				{ error: "Contract not found" },
				{ status: 404 },
			);
		}

		if (contract.status !== "pending") {
			return NextResponse.json(
				{ error: "Contract is not in a payable state" },
				{ status: 400 },
			);
		}

		if (contract.client_id !== user.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}

		// Fetch exchange rate USD → NGN
		const exchangeResponse = await fetch(
			`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/USD/NGN`,
		);
		const exchangeData = await exchangeResponse.json();

		if (!exchangeData.conversion_rate) {
			console.error("Exchange rate fetch failed:", exchangeData);
			return NextResponse.json(
				{ error: "Could not fetch exchange rate" },
				{ status: 500 },
			);
		}

		const exchangeRate = exchangeData.conversion_rate;

		// 5% client fee on top of agreed budget
		const agreedBudget = Number(contract.agreed_budget);
		const clientTotal = agreedBudget * 1.05;
		const ngnAmount = Math.round(clientTotal * exchangeRate);

		// Paystack expects amount in kobo (NGN × 100)
		const amountInKobo = ngnAmount * 100;

		const { error: amountPersistError } = await supabase
			.from("contracts")
			.update({ ngn_amount_paid: ngnAmount, exchange_rate_used: exchangeRate })
			.eq("id", contractId);

		if (amountPersistError) {
			console.error("Failed to persist exchange data:", amountPersistError);
			return NextResponse.json(
				{ error: "Could not prepare payment" },
				{ status: 500 },
			);
		}

		const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
		if (!paystackSecretKey) {
			console.error("PAYSTACK_SECRET_KEY is not set");
			return NextResponse.json(
				{ error: "Payment service not configured" },
				{ status: 500 },
			);
		}

		// Get user email from their profile
		const { data: profile } = await supabase
			.from("profiles")
			.select("email")
			.eq("id", user.id)
			.single();

		const email = profile?.email || user.email;

		if (!email) {
			return NextResponse.json(
				{ error: "User email not found" },
				{ status: 400 },
			);
		}

		const reference = `SC-${contractId}-${Date.now()}`;

		const paystackPayload = {
			amount: amountInKobo,
			email,
			reference,
			metadata: {
				contractId,
				userId: user.id,
				agreedBudget,
				clientTotal,
				exchangeRate,
				ngnAmount,
			},
			callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify`,
		};

		console.log("Initializing Paystack payment:", {
			contractId,
			agreedBudget,
			clientTotal,
			exchangeRate,
			ngnAmount,
			amountInKobo,
			reference,
			email,
		});

		const paystackResponse = await fetch(
			"https://api.paystack.co/transaction/initialize",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${paystackSecretKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(paystackPayload),
			},
		);

		const paystackData = await paystackResponse.json();

		if (!paystackData.status) {
			console.error("Paystack initialization failed:", {
				httpStatus: paystackResponse.status,
				paystackMessage: paystackData.message,
				fullResponse: paystackData,
			});
			return NextResponse.json(
				{
					error: paystackData.message || "Failed to initialize payment",
					debug: {
						paystackMessage: paystackData.message,
						httpStatus: paystackResponse.status,
					},
				},
				{ status: 500 },
			);
		}

		console.log(
			"Paystack initialization successful:",
			paystackData.data?.reference,
		);

		return NextResponse.json({
			authorizationUrl: paystackData.data.authorization_url,
			access_code: paystackData.data.access_code,
			reference: paystackData.data.reference,
			exchangeRate,
			ngnAmount,
		});
	} catch (error) {
		console.error("Unexpected error in payment initialization:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				debug: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
