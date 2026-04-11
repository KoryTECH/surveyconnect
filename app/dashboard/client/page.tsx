"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

function getInitials(name: string) {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ClientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

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
      setProfile(data);
      setLoading(false);
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
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Survey<span className="text-green-600">Connect</span>
        </h1>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
            title="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {/* Avatar */}
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

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {profile?.full_name?.split(" ")[0]}! 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Find and hire the best geospatial professionals
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Active Projects</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">0</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Spent</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">$0</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Completed Projects</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/jobs/post"
              className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="font-semibold text-gray-900 dark:text-white">Post a Job</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Find the right professional for your project
              </div>
            </Link>

            <Link
              href="/dashboard/client/jobs"
              className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block"
            >
              <div className="text-2xl mb-2">📁</div>
              <div className="font-semibold text-gray-900 dark:text-white">My Jobs</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View applications for your posted jobs
              </div>
            </Link>

            <Link
              href="/professionals"
              className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block"
            >
              <div className="text-2xl mb-2">🔍</div>
              <div className="font-semibold text-gray-900 dark:text-white">Browse Professionals</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search verified geospatial experts
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}