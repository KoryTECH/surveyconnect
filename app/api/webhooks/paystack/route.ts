import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const signature = request.headers.get("x-paystack-signature");

		if (!signature) {
			return NextResponse.json({ error: "No signature" }, { status: 400 });
		}

		// Verify webhook signature — this is what makes it secure
		const hash = crypto
			.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
			.update(body)
			.digest("hex");

		if (hash !== signature) {
			console.error("Invalid webhook signature");
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		const event = JSON.parse(body);

		// Handle successful payment
		if (event.event === "charge.success") {
			const { reference, metadata, status } = event.data;

			if (status !== "success") {
				return NextResponse.json({ received: true });
			}

			const contractId = metadata?.contractId;

			if (!contractId) {
				return NextResponse.json({ received: true });
			}

			const supabase = await createClient();

			// Double confirm contract is active (verify route may have already done this)
			const { data: contract } = await supabase
				.from("contracts")
				.select("status")
				.eq("id", contractId)
				.single();

			if (contract && contract.status === "pending") {
				// Only update if still pending (avoid duplicate updates)
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

				console.log(`Contract ${contractId} activated via webhook`);
			}
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
	}
}
