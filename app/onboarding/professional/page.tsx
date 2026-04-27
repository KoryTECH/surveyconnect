"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const professionOptions = [
	"land_surveyor",
	"gis_analyst",
	"drone_pilot",
	"cartographer",
	"photogrammetrist",
	"lidar_specialist",
	"remote_sensing_analyst",
	"urban_planner",
	"spatial_data_scientist",
	"hydrographic_surveyor",
	"mining_surveyor",
	"construction_surveyor",
	"environmental_analyst",
	"bim_specialist",
	"other",
];

export default function ProfessionalOnboardingPage() {
	const router = useRouter();
	const supabase = useMemo(() => createClient(), []);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [step, setStep] = useState(1);
	const [userId, setUserId] = useState("");

	const [formData, setFormData] = useState({
		full_name: "",
		phone: "",
		country: "",
		city: "",
		bio: "",
		profession_type: "",
		years_experience: "",
		license_number: "",
	});

	useEffect(() => {
		const init = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				router.push("/login");
				return;
			}

			setUserId(user.id);

			const { data: profile } = await supabase
				.from("profiles")
				.select("role, full_name, phone, country, city, bio")
				.eq("id", user.id)
				.single();

			if (!profile || profile.role !== "professional") {
				router.push("/dashboard/client");
				return;
			}

			const { data: professional } = await supabase
				.from("professional_profiles")
				.select(
					"onboarding_completed, onboarding_step, profession_type, years_experience, license_number",
				)
				.eq("id", user.id)
				.maybeSingle();

			if (professional?.onboarding_completed) {
				router.push("/dashboard/professional");
				return;
			}

			const stepMap: Record<string, number> = {
				profile: 1,
				professional: 2,
				complete: 3,
			};

			setStep(stepMap[professional?.onboarding_step || "profile"] || 1);

			setFormData({
				full_name: profile.full_name || "",
				phone: profile.phone || "",
				country: profile.country || "",
				city: profile.city || "",
				bio: profile.bio || "",
				profession_type: professional?.profession_type || "",
				years_experience: professional?.years_experience
					? String(professional.years_experience)
					: "",
				license_number: professional?.license_number || "",
			});

			setLoading(false);
		};

		init();
	}, [router, supabase]);

	const saveStep = async (
		nextStep: "profile" | "professional" | "complete",
	) => {
		setSaving(true);
		setError("");

		if (!formData.full_name.trim()) {
			setSaving(false);
			setError("Full name is required");
			return false;
		}

		if (!formData.profession_type) {
			setSaving(false);
			setError("Profession is required");
			return false;
		}

		const years = Number(formData.years_experience || 0);
		if (!Number.isFinite(years) || years < 0 || years > 70) {
			setSaving(false);
			setError("Years of experience must be between 0 and 70");
			return false;
		}

		const { error: profileError } = await supabase
			.from("profiles")
			.update({
				full_name: formData.full_name.trim(),
				phone: formData.phone.trim(),
				country: formData.country.trim(),
				city: formData.city.trim(),
				bio: formData.bio.trim(),
			})
			.eq("id", userId);

		if (profileError) {
			setSaving(false);
			setError("Could not save profile details");
			return false;
		}

		const { error: professionalError } = await supabase
			.from("professional_profiles")
			.upsert(
				{
					id: userId,
					profession_type: formData.profession_type,
					years_experience: years,
					license_number: formData.license_number.trim() || null,
					onboarding_step: nextStep,
				},
				{ onConflict: "id" },
			);

		if (professionalError) {
			setSaving(false);
			setError("Could not save professional details");
			return false;
		}

		setSaving(false);
		return true;
	};

	const handleContinue = async () => {
		const next = step === 1 ? "professional" : "complete";
		const ok = await saveStep(next);
		if (!ok) return;
		setStep((prev) => Math.min(3, prev + 1));
	};

	const handleFinish = async () => {
		const ok = await saveStep("complete");
		if (!ok) return;

		setSaving(true);

		const { error: completionError } = await supabase
			.from("professional_profiles")
			.update({
				onboarding_completed: true,
				onboarding_completed_at: new Date().toISOString(),
				onboarding_step: "complete",
			})
			.eq("id", userId);

		if (completionError) {
			setSaving(false);
			setError("Failed to complete onboarding");
			return;
		}

		await supabase.from("notifications").insert({
			user_id: userId,
			title: "Onboarding complete",
			message: "Your onboarding is complete. Proceed to verification.",
			type: "onboarding",
			link: "/verification",
			is_read: false,
		});

		router.push("/verification");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">
					Preparing onboarding...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
			<nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
				<h1 className="text-xl font-bold text-gray-900 dark:text-white">
					Survey<span className="text-green-600">ConnectHub</span>
				</h1>
				<Link
					href="/dashboard/professional"
					className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
				>
					Skip for now
				</Link>
			</nav>

			<div className="max-w-3xl mx-auto px-6 py-8">
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						Professional Onboarding
					</h2>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
						Step {step} of 3
					</p>
				</div>

				{error && (
					<div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
						{error}
					</div>
				)}

				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-6">
					{step === 1 && (
						<>
							<div>
								<label
									htmlFor="onboarding-full-name"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Full Name
								</label>
								<input
									id="onboarding-full-name"
									type="text"
									value={formData.full_name}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											full_name: e.target.value,
										}))
									}
									placeholder="Enter your full name"
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
								/>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<input
									type="text"
									placeholder="Phone"
									value={formData.phone}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, phone: e.target.value }))
									}
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
								/>
								<input
									type="text"
									placeholder="Country"
									value={formData.country}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											country: e.target.value,
										}))
									}
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
								/>
							</div>
							<input
								type="text"
								placeholder="City"
								value={formData.city}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, city: e.target.value }))
								}
								className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
							/>
							<textarea
								rows={4}
								placeholder="Short bio"
								value={formData.bio}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, bio: e.target.value }))
								}
								className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 resize-none"
							/>
						</>
					)}

					{step === 2 && (
						<>
							<div>
								<label
									htmlFor="onboarding-profession-type"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Profession Type
								</label>
								<select
									id="onboarding-profession-type"
									value={formData.profession_type}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											profession_type: e.target.value,
										}))
									}
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
								>
									<option value="">Select profession</option>
									{professionOptions.map((option) => (
										<option
											key={option}
											value={option}
										>
											{option}
										</option>
									))}
								</select>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<input
									type="number"
									min="0"
									max="70"
									placeholder="Years experience"
									value={formData.years_experience}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											years_experience: e.target.value,
										}))
									}
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
								/>
								<input
									type="text"
									placeholder="License number"
									value={formData.license_number}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											license_number: e.target.value,
										}))
									}
									className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
								/>
							</div>
						</>
					)}

					{step === 3 && (
						<div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
							<p className="font-semibold text-green-700 dark:text-green-400">
								Ready to finish
							</p>
							<p className="text-sm text-green-700 dark:text-green-400 mt-1">
								Complete onboarding now to continue to verification and unlock
								all professional actions.
							</p>
						</div>
					)}

					<div className="flex items-center justify-between">
						<button
							type="button"
							onClick={() => setStep((prev) => Math.max(1, prev - 1))}
							disabled={step === 1 || saving}
							className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 disabled:opacity-50"
						>
							Back
						</button>
						{step < 3 ? (
							<button
								type="button"
								onClick={handleContinue}
								disabled={saving}
								className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
							>
								{saving ? "Saving..." : "Continue"}
							</button>
						) : (
							<button
								type="button"
								onClick={handleFinish}
								disabled={saving}
								className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
							>
								{saving ? "Finishing..." : "Complete Onboarding"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
