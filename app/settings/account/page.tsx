"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Bank = {
	code: string;
	name: string;
};

export default function AccountSettingsPage() {
	const router = useRouter();
	const supabase = useMemo(() => createClient(), []);
	const [loading, setLoading] = useState(true);
	const [savingProfile, setSavingProfile] = useState(false);
	const [savingPreferences, setSavingPreferences] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [isProfessional, setIsProfessional] = useState(false);
	const [banks, setBanks] = useState<Bank[]>([]);

	const [profile, setProfile] = useState({
		full_name: "",
		phone: "",
		country: "",
		city: "",
		bio: "",
		bank_name: "",
		bank_account_number: "",
		bank_account_name: "",
	});

	const [preferences, setPreferences] = useState({
		notification_email: true,
		notification_messages: true,
		notification_marketing: false,
	});

	const [passwordForm, setPasswordForm] = useState({
		newPassword: "",
		confirmPassword: "",
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

			const { data: profileData, error: profileError } = await supabase
				.from("profiles")
				.select(
					"role, full_name, phone, country, city, bio, bank_name, bank_account_number, bank_account_name, notification_email, notification_messages, notification_marketing",
				)
				.eq("id", user.id)
				.single();

			if (profileError || !profileData) {
				setError("Failed to load settings");
				setLoading(false);
				return;
			}

			setIsProfessional(profileData.role === "professional");
			setProfile({
				full_name: profileData.full_name || "",
				phone: profileData.phone || "",
				country: profileData.country || "",
				city: profileData.city || "",
				bio: profileData.bio || "",
				bank_name: profileData.bank_name || "",
				bank_account_number: profileData.bank_account_number || "",
				bank_account_name: profileData.bank_account_name || "",
			});

			setPreferences({
				notification_email: profileData.notification_email ?? true,
				notification_messages: profileData.notification_messages ?? true,
				notification_marketing: profileData.notification_marketing ?? false,
			});

			if (profileData.role === "professional") {
				const bankResponse = await fetch("/api/banks", { cache: "no-store" });
				const bankData = await bankResponse.json().catch(() => ({}));
				if (Array.isArray(bankData?.banks)) {
					setBanks(bankData.banks);
				}
			}

			setLoading(false);
		};

		init();
	}, [router, supabase]);

	const saveProfile = async () => {
		setSavingProfile(true);
		setError("");
		setMessage("");

		if (!profile.full_name.trim()) {
			setSavingProfile(false);
			setError("Full name is required");
			return;
		}

		if (
			isProfessional &&
			profile.bank_account_number &&
			!/^\d{10}$/.test(profile.bank_account_number)
		) {
			setSavingProfile(false);
			setError("Bank account number must be exactly 10 digits");
			return;
		}

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			setSavingProfile(false);
			setError("Unauthorized");
			return;
		}

		const payload: any = {
			full_name: profile.full_name.trim(),
			phone: profile.phone.trim(),
			country: profile.country.trim(),
			city: profile.city.trim(),
			bio: profile.bio.trim(),
		};

		if (isProfessional) {
			payload.bank_name = profile.bank_name || null;
			payload.bank_account_number = profile.bank_account_number || null;
			payload.bank_account_name = profile.bank_account_name || null;
			payload.paystack_recipient_code = null;
		}

		const { error: updateError } = await supabase
			.from("profiles")
			.update(payload)
			.eq("id", user.id);

		if (updateError) {
			setError("Failed to update profile settings");
		} else {
			setMessage("Profile settings updated");
		}

		setSavingProfile(false);
	};

	const savePreferences = async () => {
		setSavingPreferences(true);
		setError("");
		setMessage("");

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			setSavingPreferences(false);
			setError("Unauthorized");
			return;
		}

		const { error: prefError } = await supabase
			.from("profiles")
			.update(preferences)
			.eq("id", user.id);

		if (prefError) {
			setError("Failed to save notification preferences");
		} else {
			setMessage("Notification preferences updated");
		}

		setSavingPreferences(false);
	};

	const updatePassword = async () => {
		setSavingPassword(true);
		setError("");
		setMessage("");

		if (passwordForm.newPassword.length < 8) {
			setSavingPassword(false);
			setError("Password must be at least 8 characters");
			return;
		}

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			setSavingPassword(false);
			setError("Passwords do not match");
			return;
		}

		const { error: passwordError } = await supabase.auth.updateUser({
			password: passwordForm.newPassword,
		});

		if (passwordError) {
			setError(passwordError.message || "Failed to update password");
		} else {
			setPasswordForm({ newPassword: "", confirmPassword: "" });
			setMessage("Password updated successfully");
		}

		setSavingPassword(false);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">
					Loading settings...
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
					href={
						isProfessional ? "/dashboard/professional" : "/dashboard/client"
					}
					className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
				>
					Back to Dashboard
				</Link>
			</nav>

			<div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						Account Settings
					</h2>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
						Manage your account details and preferences
					</p>
				</div>

				{message && (
					<div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
						{message}
					</div>
				)}
				{error && (
					<div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
						{error}
					</div>
				)}

				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Profile
					</h3>
					<input
						type="text"
						placeholder="Full name"
						value={profile.full_name}
						onChange={(e) =>
							setProfile((prev) => ({ ...prev, full_name: e.target.value }))
						}
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
					/>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<input
							type="text"
							placeholder="Phone"
							value={profile.phone}
							onChange={(e) =>
								setProfile((prev) => ({ ...prev, phone: e.target.value }))
							}
							className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
						/>
						<input
							type="text"
							placeholder="Country"
							value={profile.country}
							onChange={(e) =>
								setProfile((prev) => ({ ...prev, country: e.target.value }))
							}
							className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
						/>
					</div>
					<input
						type="text"
						placeholder="City"
						value={profile.city}
						onChange={(e) =>
							setProfile((prev) => ({ ...prev, city: e.target.value }))
						}
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
					/>
					<textarea
						rows={3}
						placeholder="Bio"
						value={profile.bio}
						onChange={(e) =>
							setProfile((prev) => ({ ...prev, bio: e.target.value }))
						}
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 resize-none"
					/>

					{isProfessional && (
						<div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
							<p className="font-medium text-gray-900 dark:text-white">
								Payout Details
							</p>
							<label
								htmlFor="settings-bank"
								className="sr-only"
							>
								Bank
							</label>
							<select
								id="settings-bank"
								value={profile.bank_name}
								onChange={(e) =>
									setProfile((prev) => ({ ...prev, bank_name: e.target.value }))
								}
								className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
							>
								<option value="">Select bank</option>
								{banks.map((bank) => (
									<option
										key={bank.code}
										value={bank.code}
									>
										{bank.name}
									</option>
								))}
							</select>
							<input
								type="text"
								placeholder="Bank account number"
								maxLength={10}
								value={profile.bank_account_number}
								onChange={(e) =>
									setProfile((prev) => ({
										...prev,
										bank_account_number: e.target.value.replace(/[^0-9]/g, ""),
									}))
								}
								className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
							/>
							<input
								type="text"
								placeholder="Bank account name"
								value={profile.bank_account_name}
								onChange={(e) =>
									setProfile((prev) => ({
										...prev,
										bank_account_name: e.target.value,
									}))
								}
								className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
							/>
						</div>
					)}

					<button
						type="button"
						onClick={saveProfile}
						disabled={savingProfile}
						className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
					>
						{savingProfile ? "Saving..." : "Save Profile"}
					</button>
				</div>

				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Notification Preferences
					</h3>
					<label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
						<input
							type="checkbox"
							checked={preferences.notification_email}
							onChange={(e) =>
								setPreferences((prev) => ({
									...prev,
									notification_email: e.target.checked,
								}))
							}
						/>
						Email notifications
					</label>
					<label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
						<input
							type="checkbox"
							checked={preferences.notification_messages}
							onChange={(e) =>
								setPreferences((prev) => ({
									...prev,
									notification_messages: e.target.checked,
								}))
							}
						/>
						Message notifications
					</label>
					<label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
						<input
							type="checkbox"
							checked={preferences.notification_marketing}
							onChange={(e) =>
								setPreferences((prev) => ({
									...prev,
									notification_marketing: e.target.checked,
								}))
							}
						/>
						Product and marketing updates
					</label>
					<button
						type="button"
						onClick={savePreferences}
						disabled={savingPreferences}
						className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
					>
						{savingPreferences ? "Saving..." : "Save Preferences"}
					</button>
				</div>

				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Security
					</h3>
					<input
						type="password"
						placeholder="New password"
						value={passwordForm.newPassword}
						onChange={(e) =>
							setPasswordForm((prev) => ({
								...prev,
								newPassword: e.target.value,
							}))
						}
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
					/>
					<input
						type="password"
						placeholder="Confirm password"
						value={passwordForm.confirmPassword}
						onChange={(e) =>
							setPasswordForm((prev) => ({
								...prev,
								confirmPassword: e.target.value,
							}))
						}
						className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
					/>
					<button
						type="button"
						onClick={updatePassword}
						disabled={savingPassword}
						className="px-5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
					>
						{savingPassword ? "Updating..." : "Update Password"}
					</button>
				</div>
			</div>
		</div>
	);
}
