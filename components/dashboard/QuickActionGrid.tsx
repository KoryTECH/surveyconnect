import Link from "next/link";
import { ReactNode } from "react";

export type QuickActionItem = {
	href: string;
	icon: ReactNode;
	iconBg: string;
	label: string;
	desc: string;
	badge?: number;
};

type QuickActionGridProps = {
	actions: QuickActionItem[];
};

export default function QuickActionGrid({ actions }: QuickActionGridProps) {
	return (
		<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
			<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
				Quick Actions
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{actions.slice(0, 4).map((action) => (
					<Link
						key={action.href}
						href={action.href}
						className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all block relative"
					>
						{action.badge && action.badge > 0 && (
							<span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
								{action.badge > 9 ? "9+" : action.badge}
							</span>
						)}
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.iconBg}`}
						>
							{action.icon}
						</div>
						<div className="font-semibold text-gray-900 dark:text-white text-sm">
							{action.label}
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							{action.desc}
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
