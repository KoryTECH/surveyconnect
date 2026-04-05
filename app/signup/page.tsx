"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
	const router = useRouter();
	const supabase = createClient();

	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "" as "client" | "professional" | "",
		country: "",
		phone: "",
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		// Validation
		if (!formData.role) {
			setError("Please select whether you are a Client or Professional");
			return;
		}
		if (formData.password !== formData.confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (formData.password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setLoading(true);

		try {
			// 1. Sign up with Supabase Auth
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email: formData.email,
				password: formData.password,
			});

			if (authError) throw authError;
			if (!authData.user) throw new Error("Signup failed");

			// 2. Create profile in profiles table
			const { error: profileError } = await supabase.from("profiles").insert({
				id: authData.user.id,
				role: formData.role,
				full_name: formData.fullName,
				email: formData.email,
				phone: formData.phone,
				country: formData.country,
			});

			if (profileError) throw profileError;

			// 3. Create role-specific profile
			if (formData.role === "client") {
				const { error: clientError } = await supabase
					.from("client_profiles")
					.insert({ id: authData.user.id });

				if (clientError) throw clientError;

				router.push("/dashboard/client");
			} else {
				router.push("/onboarding/professional");
			}
		} catch (err: any) {
			setError(err.message || "Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900">
						Survey<span className="text-green-600">Connect</span>
					</h1>
					<p className="text-gray-500 mt-2">Create your account</p>
				</div>

				{/* Error Message */}
				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
						{error}
					</div>
				)}

				<form
					onSubmit={handleSubmit}
					className="space-y-5"
				>
					{/* Role Selection */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							I am a... <span className="text-red-500">*</span>
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setFormData({ ...formData, role: "client" })}
								className={`p-4 rounded-xl border-2 text-center transition-all ${
									formData.role === "client"
										? "border-green-600 bg-green-50 text-green-700"
										: "border-gray-200 text-gray-600 hover:border-gray-300"
								}`}
							>
								<div className="text-2xl mb-1">🏢</div>
								<div className="font-semibold">Client</div>
								<div className="text-xs mt-1">I need geospatial services</div>
							</button>

							<button
								type="button"
								onClick={() =>
									setFormData({ ...formData, role: "professional" })
								}
								className={`p-4 rounded-xl border-2 text-center transition-all ${
									formData.role === "professional"
										? "border-green-600 bg-green-50 text-green-700"
										: "border-gray-200 text-gray-600 hover:border-gray-300"
								}`}
							>
								<div className="text-2xl mb-1">🗺️</div>
								<div className="font-semibold">Professional</div>
								<div className="text-xs mt-1">I offer geospatial services</div>
							</button>
						</div>
					</div>

					{/* Full Name */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Full Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							name="fullName"
							value={formData.fullName}
							onChange={handleChange}
							required
							placeholder="John Doe"
							className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						/>
					</div>

					{/* Email */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email Address <span className="text-red-500">*</span>
						</label>
						<input
							type="email"
							name="email"
							value={formData.email}
							onChange={handleChange}
							required
							placeholder="john@example.com"
							className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						/>
					</div>

					{/* Phone */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Phone Number
						</label>
						<input
							type="tel"
							name="phone"
							value={formData.phone}
							onChange={handleChange}
							placeholder="+234 800 000 0000"
							className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						/>
					</div>

					{/* Country */}
					<div>
						<label
							htmlFor="country"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Country <span className="text-red-500">*</span>
						</label>
						<select
							id="country"
							name="country"
							value={formData.country}
							onChange={handleChange}
							required
							className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
						>
							<option value="">Select your country</option>
							<option value="Nigeria">Nigeria</option>
							<option value="Ghana">Ghana</option>
							<option value="Kenya">Kenya</option>
							<option value="South Africa">South Africa</option>
							<option value="Côte d'Ivoire">Côte d'Ivoire</option>
							<option value="Senegal">Senegal</option>
							<option value="Tanzania">Tanzania</option>
							<option value="Uganda">Uganda</option>
							<option value="United Kingdom">United Kingdom</option>
							<option value="United States">United States</option>
							<option value="Canada">Canada</option>
							<option value="Australia">Australia</option>
							<option value="Other">Other</option>
						</select>
					</div>

					{/* Password */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password <span className="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="password"
							value={formData.password}
							onChange={handleChange}
							required
							placeholder="Min. 8 characters"
							className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						/>
					</div>

					{/* Confirm Password */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Confirm Password <span className="text-red-500">*</span>
						</label>
						<input
							type="password"
							name="confirmPassword"
							value={formData.confirmPassword}
							onChange={handleChange}
							required
							placeholder="Repeat your password"
							className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
						/>
					</div>

					{/* Submit Button */}
					<button
						type="submit"
						disabled={loading}
						className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors"
					>
						{loading ? "Creating account..." : "Create Account"}
					</button>
				</form>

				{/* Login Link */}
				<p className="text-center text-gray-500 text-sm mt-6">
					Already have an account?{" "}
					<Link
						href="/login"
						className="text-green-600 font-semibold hover:underline"
					>
						Log in
					</Link>
				</p>
			</div>
		</div>
	);
}
