"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";

function getInitials(name: string) {
	if (!name) return "??";
	const parts = name.trim().split(" ");
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfessionalDashboard() {
	const router = useRouter();
	const [profile, setProfile] = useState<any>(null);
	const [profProfile, setProfProfile] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [unreadCount, setUnreadCount] = useState(0);
	const { theme, toggleTheme } = useTheme();
	const supabaseRef = useRef(createClient());
	const supabase = supabaseRef.current;

	useEffect(() => {
		const getProfile = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				router.push("/login");
				return;
			}

			const { data } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.single();

			const { data: prof } = await supabase
				.from("professional_profiles")
				.select("verification_status")
				.eq("id", user.id)
				.single();

			setProfile(data);
			setProfProfile(prof);
			setLoading(false);

			// Fetch unread messages count
			const fetchUnread = async () => {
				const { data: contracts } = await supabase
					.from("contracts")
					.select("id")
					.eq("professional_id", user.id)
					.eq("status", "active");

				if (!contracts || contracts.length === 0) return;

				const contractIds = contracts.map((c) => c.id);

				const { count } = await supabase
					.from("messages")
					.select("id", { count: "exact", head: true })
					.in("contract_id", contractIds)
					.neq("sender_id", user.id)
					.is("read_at", null);

				setUnreadCount(count || 0);
			};

			fetchUnread();

			// Realtime: listen for new messages across all active contracts
			const { data: contracts } = await supabase
				.from("contracts")
				.select("id")
				.eq("professional_id", user.id)
				.eq("status", "active");

			if (contracts && contracts.length > 0) {
				const channel = supabase
					.channel("professional-unread-messages")
					.on(
						"postgres_changes",
						{
							event: "INSERT",
							schema: "public",
							table: "messages",
						},
						(payload) => {
							const msg = payload.new as any;
							const isMyContract = contracts.some(
								(c) => c.id === msg.contract_id,
							);
							const isFromOther = msg.sender_id !== user.id;
							if (isMyContract && isFromOther) {
								setUnreadCount((prev) => prev + 1);
							}
						},
					)
					.subscribe();

				return () => {
					supabase.removeChannel(channel);
				};
			}
		};

		getProfile();
	}, []);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.push("/login");
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
				<div className="flex items-center gap-2">
					<img
						src="/logo.png"
						alt="SurveyConnectHub"
						className="h-10 w-auto"
						onError={(e) => (e.currentTarget.style.display = "none")}
					/>
					<h1 className="text-xl font-bold text-gray-900 dark:text-white">
						Survey<span className="text-green-600">Connect</span>
					</h1>
				</div>

				<div className="flex items-center gap-3">
					<button
						onClick={toggleTheme}
						className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
						title="Toggle theme"
					>
						{theme === "dark" ? "☀️" : "🌙"}
					</button>

					<div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
						<span className="text-green-700 dark:text-green-300 text-sm font-bold">
							{getInitials(profile?.full_name || "")}
						</span>
					</div>

					<span className="text-gray-600 dark:text-gray-300 text-sm hidden sm:block">
						{profile?.full_name}
					</span>

					<button
						onClick={handleLogout}
						className="text-sm text-red-500 hover:text-red-700 font-medium"
					>
						Log out
					</button>
				</div>
			</nav>

			<div className="max-w-6xl mx-auto px-6 py-8">
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						Welcome back, {profile?.full_name?.split(" ")[0]}! 👋
					</h2>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
						Find jobs and grow your geospatial career
					</p>
				</div>

				{profProfile?.verification_status !== "verified" && (
					<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-4 mb-8 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="text-2xl">⚠️</span>
							<div>
								<p className="font-semibold text-yellow-800 dark:text-yellow-300">
									Complete your verification
								</p>
								<p className="text-sm text-yellow-700 dark:text-yellow-400">
									Upload your ID and license to apply for jobs
								</p>
							</div>
						</div>
						<Link
							href="/verification"
							className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
						>
							Verify Now
						</Link>
					</div>
				)}

				{profProfile?.verification_status === "verified" && (
					<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-4 mb-8 flex items-center gap-3">
						<span className="text-2xl">✅</span>
						<p className="font-semibold text-green-800 dark:text-green-300">
							Your account is verified — you can apply to jobs
						</p>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-sm">
							Jobs Completed
						</p>
						<p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
							0
						</p>
					</div>
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-sm">
							Total Earned
						</p>
						<p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
							$0
						</p>
					</div>
					<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
						<p className="text-gray-500 dark:text-gray-400 text-sm">
							Average Rating
						</p>
						<p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
							—
						</p>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Quick Actions
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<Link
							href="/jobs"
							className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block"
						>
							<div className="text-2xl mb-2">🔍</div>
							<div className="font-semibold text-gray-900 dark:text-white">
								Browse Jobs
							</div>
							<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Find geospatial projects matching your skills
							</div>
						</Link>

						<Link
							href="/dashboard/professional/applications"
							className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block"
						>
							<div className="text-2xl mb-2">📋</div>
							<div className="font-semibold text-gray-900 dark:text-white">
								My Applications
							</div>
							<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Track jobs you have applied to
							</div>
						</Link>

						<Link
							href="/dashboard/professional/contracts"
							className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block relative"
						>
							{unreadCount > 0 && (
								<span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
									{unreadCount > 9 ? "9+" : unreadCount}
								</span>
							)}
							<div className="text-2xl mb-2">📄</div>
							<div className="font-semibold text-gray-900 dark:text-white">
								My Contracts
							</div>
							<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								View active contracts and mark jobs complete
							</div>
						</Link>

						<Link
							href="/profile"
							className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block"
						>
							<div className="text-2xl mb-2">👤</div>
							<div className="font-semibold text-gray-900 dark:text-white">
								Update Profile
							</div>
							<div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								Add your skills and portfolio
							</div>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
