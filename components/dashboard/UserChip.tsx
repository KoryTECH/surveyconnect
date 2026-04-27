type UserChipProps = {
	fullName: string;
	showName?: boolean;
};

function getInitials(name: string) {
	if (!name) return "??";
	const parts = name.trim().split(" ");
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserChip({ fullName, showName = true }: UserChipProps) {
	return (
		<>
			<div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
				<span className="text-green-700 dark:text-green-300 text-sm font-bold">
					{getInitials(fullName || "")}
				</span>
			</div>
			{showName && (
				<span className="text-gray-600 dark:text-gray-300 text-sm hidden sm:block">
					{fullName}
				</span>
			)}
		</>
	);
}
