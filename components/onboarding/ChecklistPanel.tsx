"use client";

import { CheckCircle2, Circle, X } from "lucide-react";

type ChecklistItem = {
	id: string;
	label: string;
	completed: boolean;
};

type ChecklistPanelProps = {
	title: string;
	subtitle: string;
	items: ChecklistItem[];
	onDismiss: () => void;
	dismissing?: boolean;
};

export default function ChecklistPanel({
	title,
	subtitle,
	items,
	onDismiss,
	dismissing = false,
}: ChecklistPanelProps) {
	const completedCount = items.filter((item) => item.completed).length;

	return (
		<div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						{title}
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						{subtitle}
					</p>
					<p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
						{completedCount}/{items.length} completed
					</p>
				</div>
				<button
					type="button"
					onClick={onDismiss}
					disabled={dismissing}
					className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
					title="Dismiss checklist"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			<div className="mt-4 space-y-2">
				{items.map((item) => (
					<div
						key={item.id}
						className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
					>
						{item.completed ? (
							<CheckCircle2 className="w-4 h-4 text-green-600" />
						) : (
							<Circle className="w-4 h-4 text-gray-400" />
						)}
						<span>{item.label}</span>
					</div>
				))}
			</div>
		</div>
	);
}
