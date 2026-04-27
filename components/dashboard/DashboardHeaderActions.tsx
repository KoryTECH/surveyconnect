"use client";

import Link from "next/link";
import { Moon, Settings, Sun } from "lucide-react";
import NotificationBellDropdown from "@/components/notifications/NotificationBellDropdown";
import UserChip from "@/components/dashboard/UserChip";

type DashboardHeaderActionsProps = {
	theme: string | undefined;
	toggleTheme: () => void;
	fullName: string;
	unreadNotifications: number;
	onUnreadNotificationsChange?: (count: number) => void;
	onLogout: () => void;
};

export default function DashboardHeaderActions({
	theme,
	toggleTheme,
	fullName,
	unreadNotifications,
	onUnreadNotificationsChange,
	onLogout,
}: DashboardHeaderActionsProps) {
	return (
		<div className="flex items-center gap-3">
			<button
				onClick={toggleTheme}
				className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
				title="Toggle theme"
			>
				{theme === "dark" ? (
					<Sun className="w-4 h-4" />
				) : (
					<Moon className="w-4 h-4" />
				)}
			</button>

			<NotificationBellDropdown
				unreadCount={unreadNotifications}
				onUnreadCountChange={onUnreadNotificationsChange}
			/>

			<Link
				href="/settings/account"
				className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
				title="Account settings"
				aria-label="Account settings"
			>
				<Settings className="w-4 h-4" />
			</Link>

			<UserChip fullName={fullName} />

			<button
				onClick={onLogout}
				className="text-sm text-red-500 hover:text-red-700 font-medium"
			>
				Log out
			</button>
		</div>
	);
}
