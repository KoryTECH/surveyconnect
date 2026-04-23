"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminDashboard() {
	const router = useRouter();
	const supabase = createClient();

	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState({
		totalUsers: 0,
		totalClients: 0,
		totalProfessionals: 0,
		totalJobs: 0,
		totalContracts: 0,
		platformRevenue: 0,
		pendingVerifications: 0,
	});
	const [pendingProfessionals, setPendingProfessionals] = useState<any[]>([]);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [message, setMessage] = useState("");

	useEffect(() => {
		const init = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) { router.push("/login"); return; }

			const { data: profile } = await supabase
				.from("profiles")
				.select("is_admin")
				.eq("id", user.id)
				.single();

			if (!profile?.is_admin) {
				router.push("/dashboard/client");
				return;
			}

			const [
				{ count: totalUsers },
				{ count: totalClients },
				{ count: totalProfessionals },
				{ count: totalJobs },
				{ data: contracts },
				{ count: pendingCount },
			] = await Promise.all([
				supabase.from("profiles").select("id", { count: "exact", head: true }),
				supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
				supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professional"),
				supabase.from("jobs").select("id", { count: "exact", head: true }),
				supabase.from("contracts").select("platform_fee, payment_released_at"),
				supabase.from("professional_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
			]);

			const revenue = (contracts || [])
				.filter((c: any) => c.payment_released_at !== null)
				.reduce((sum: number, c: any) => sum + Number(c.platform_fee || 0), 0);

			setStats({
				totalUsers: totalUsers || 0,
				totalClients: totalClients || 0,
				totalProfessionals: totalProfessionals || 0,
				totalJobs: totalJobs || 0,
				totalContracts: (contracts || []).length,
				platformRevenue: revenue,
				pendingVerifications: pendingCount || 0,
			});

			// Explicit column selection to avoid RLS silently nulling fields
			const { data: pending, error: pendingError } = await supabase
				.from("professional_profiles")
				.select(`
					id,
					profession_type,
					license_number,
					years_experience,
					id_document_url,
					license_url,
					verification_status,
					created_at,
					profiles(full_name, email, country)
				`)
				.eq("verification_status", "pending")
				.order("created_at", { ascending: false });

			if (pendingError) console.error("Pending fetch error:", pendingError);
			console.log("Pending professionals:", pending); // 👈 remove after confirming docs show

			setPendingProfessionals(pending || []);
			setLoading(false);
		};

		init();
	}, []);

	const getProfessionLabel = (type: string) => {
		const labels: any = {
			land_surveyor: "Land Surveyor",
			gis_analyst: "GIS Analyst",
			drone_pilot: "Drone/UAV Pilot",
			cartographer: "Cartographer",
			photogrammetrist: "Photogrammetrist",
			lidar_specialist: "LiDAR Specialist",
			remote_sensing_analyst: "Remote Sensing Analyst",
			urban_planner: "Urban Planner",
			spatial_data_scientist: "Spatial Data Scientist",
			hydrographic_surveyor: "Hydrographic Surveyor",
			mining_surveyor: "Mining Surveyor",
			construction_surveyor: "Construction Surveyor",
			environmental_analyst: "Environmental Analyst",
			bim_specialist: "BIM Specialist",
			other: "Other",
		};
		return labels[type] || type;
	};

	const handleViewDocument = async (pathOrUrl: string) => {
		// Defensive: strip full URL if accidentally stored (shouldn't happen but just in case)
		let path = pathOrUrl;
		if (pathOrUrl.includes("/storage/v1/object/")) {
			const parts = pathOrUrl.split("/verification-documents/");
			path = parts[1] || pathOrUrl;
		}

		const { data, error } = await supabase.storage
			.from("verification-documents")
			.createSignedUrl(path, 60 * 60);

		if (data?.signedUrl) {
			window.open(data.signedUrl, "_blank");
		} else {
			console.error("Signed URL error:", error);
			alert("Could not load document. Check console for details.");
		}
	};

	const handleVerify = async (professionalId: string, action: "verified" | "rejected") => {
		setActionLoading(professionalId);
		setMessage("");

		const { error } = await supabase
			.from("professional_profiles")
			.update({ verification_status: action })
			.eq("id", professionalId);

		if (!error) {
			setPendingProfessionals(prev => prev.filter(p => p.id !== professionalId));
			setStats(prev => ({
				...prev,
				pendingVerifications: prev.pendingVerifications - 1,
			}));
			setMessage(action === "verified" ? "Professional verified successfully!" : "Professional rejected.");
			setTimeout(() => setMessage(""), 3000);
		} else {
			console.error("Verify error:", error);
			setMessage("Something went wrong. Check console.");
		}

		setActionLoading(null);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
			<nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img
						src="/logo.png"
						alt="SurveyConnectHub"
						className="h-10 w-auto"
						onError={(e) => (e.currentTarget.style.display = "none")}
					/>
					<h1 className="text-xl font-bold text-gray-900 dark:text-white">
						Survey<span className="text-green-600">ConnectHub</span>
					</h1>
					<span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">
						ADMIN
					</span>
				</div>
				<Link
					href="/dashboard/client"
					className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
				>
					← Back to Dashboard
				</Link>
			</nav>

			<div className="max-w-6xl mx-auto px-6 py-8">
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
					<p className="text-gray-500 dark:text-gray-400 mt-1">Platform overview and verification management</p>
				</div>

				{message && (
					<div className={`rounded-xl p-4 mb-6 text-sm font-medium ${
						message.includes("verified")
							? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
							: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
					}`}>
						{message}
					</div>
				)}

				{/* Stats Grid */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Total Users</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
						<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
							{stats.totalClients} clients · {stats.totalProfessionals} professionals
						</p>
					</div>
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Total Jobs</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalJobs}</p>
					</div>
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Total Contracts</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalContracts}</p>
					</div>
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Platform Revenue</p>
						<p className="text-2xl font-bold text-green-600 dark:text-green-400">
							${stats.platformRevenue.toLocaleString()}
						</p>
					</div>
				</div>

				{/* Pending Verifications */}
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
					<div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
						<div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
								Pending Verifications
							</h3>
							<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
								{stats.pendingVerifications} professional{stats.pendingVerifications !== 1 ? "s" : ""} awaiting review
							</p>
						</div>
						{stats.pendingVerifications > 0 && (
							<span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-bold px-3 py-1 rounded-full">
								{stats.pendingVerifications} pending
							</span>
						)}
					</div>

					{pendingProfessionals.length === 0 ? (
						<div className="p-12 text-center">
							<div className="text-4xl mb-3">✅</div>
							<p className="text-gray-500 dark:text-gray-400">No pending verifications</p>
						</div>
					) : (
						<div className="divide-y divide-gray-100 dark:divide-gray-800">
							{pendingProfessionals.map((prof) => (
								<div key={prof.id} className="p-6">
									<div className="flex items-start justify-between gap-4 flex-wrap">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-3">
												<div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
													<span className="text-green-700 dark:text-green-300 text-sm font-bold">
														{prof.profiles?.full_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "??"}
													</span>
												</div>
												<div>
													<p className="font-semibold text-gray-900 dark:text-white">
														{prof.profiles?.full_name}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{prof.profiles?.email} · {prof.profiles?.country}
													</p>
												</div>
											</div>

											<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
												<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
													<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Profession</p>
													<p className="text-sm font-medium text-gray-900 dark:text-white">
														{getProfessionLabel(prof.profession_type)}
													</p>
												</div>
												{prof.license_number && (
													<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
														<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">License</p>
														<p className="text-sm font-medium text-gray-900 dark:text-white">
															{prof.license_number}
														</p>
													</div>
												)}
												{prof.years_experience > 0 && (
													<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
														<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Experience</p>
														<p className="text-sm font-medium text-gray-900 dark:text-white">
															{prof.years_experience} year{prof.years_experience !== 1 ? "s" : ""}
														</p>
													</div>
												)}
											</div>

											{/* Document Buttons */}
											<div className="flex gap-3 flex-wrap">
												{prof.id_document_url ? (
													<button
														onClick={() => handleViewDocument(prof.id_document_url)}
														className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-medium px-4 py-2 rounded-xl transition-colors border border-blue-200 dark:border-blue-800"
													>
														🪪 View ID Document
													</button>
												) : (
													<span className="text-xs text-gray-400 dark:text-gray-600 italic">No ID document uploaded</span>
												)}
												{prof.license_url ? (
													<button
														onClick={() => handleViewDocument(prof.license_url)}
														className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-sm font-medium px-4 py-2 rounded-xl transition-colors border border-purple-200 dark:border-purple-800"
													>
														📜 View License
													</button>
												) : (
													<span className="text-xs text-gray-400 dark:text-gray-600 italic">No license uploaded</span>
												)}
											</div>
										</div>

										{/* Approve / Reject */}
										<div className="flex flex-col gap-2 shrink-0">
											<button
												onClick={() => handleVerify(prof.id, "verified")}
												disabled={actionLoading === prof.id}
												className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-6 py-2 rounded-xl transition-colors"
											>
												{actionLoading === prof.id ? "Processing..." : "✓ Approve"}
											</button>
											<button
												onClick={() => handleVerify(prof.id, "rejected")}
												disabled={actionLoading === prof.id}
												className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-semibold px-6 py-2 rounded-xl transition-colors"
											>
												✕ Reject
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}