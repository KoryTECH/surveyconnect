import Link from "next/link";

export default function Footer() {
	return (
		<footer className="border-t border-ink-200 bg-white">
			<div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-6 py-6 text-sm text-ink-500">
				<div>
					<p className="font-semibold text-ink-900 mb-1">SurveyConnectHub</p>
					<p>&copy; {new Date().getFullYear()} SurveyConnectHub Geospatial Marketplace</p>
				</div>
				<div className="flex items-center gap-6">
					<Link
						href="/terms"
						className="hover:text-ink-900 transition-colors"
					>
						Terms of Service
					</Link>
					<Link
						href="/privacy"
						className="hover:text-ink-900 transition-colors"
					>
						Privacy Policy
					</Link>
				</div>
			</div>
		</footer>
	);
}