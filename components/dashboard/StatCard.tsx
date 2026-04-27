import { ReactNode } from "react";

type StatCardProps = {
	title: string;
	value: ReactNode;
	icon: ReactNode;
	iconBgClass: string;
	iconColorClass: string;
};

export default function StatCard({
	title,
	value,
	icon,
	iconBgClass,
	iconColorClass,
}: StatCardProps) {
	return (
		<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
			<div className="flex items-center gap-3 mb-3">
				<div
					className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgClass}`}
				>
					<span className={iconColorClass}>{icon}</span>
				</div>
				<p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
			</div>
			<p className="text-3xl font-bold text-gray-900 dark:text-white">
				{value}
			</p>
		</div>
	);
}
