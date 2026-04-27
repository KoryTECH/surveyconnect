import Image from "next/image";

type AppBrandProps = {
	className?: string;
};

export default function AppBrand({ className = "" }: AppBrandProps) {
	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<Image
				src="/logo.png"
				alt="SurveyConnectHub"
				width={40}
				height={40}
				className="h-10 w-auto"
			/>
			<h1 className="text-xl font-bold text-gray-900 dark:text-white">
				Survey<span className="text-green-600">ConnectHub</span>
			</h1>
		</div>
	);
}
