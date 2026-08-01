"use client";

import Link from "next/link";
import Image from "next/image";
import {
	FileText,
	UserCheck,
	Shield,
	Wallet,
	ArrowRight,
} from "lucide-react";

const navLinks = [
	{ label: "Marketplace", href: "/jobs" },
	{ label: "Contracts", href: "/dashboard/client/contracts" },
	{ label: "Talent", href: "/professionals" },
];

const categoryTiles = [
	{
		label: "Land Surveying",
		sub: "Boundary, Topographic, and Construction stakeout services from licensed professionals.",
		promo: true,
		span: "md:col-span-2",
		image: "/land-surveying.jpg",
		alt: "Land surveyors measuring terrain with GNSS equipment",
	},
	{
		label: "Drone Pilots",
		sub: "Certified UAV operators for photogrammetry, LiDAR, and inspections.",
		promo: false,
		span: "",
		image: "/Drone-pilots.jpg",
		alt: "Surveying drone hovering over a construction site",
	},
	{
		label: "GIS & Mapping",
		sub: "Data visualization, spatial analysis, and custom map development.",
		promo: false,
		span: "",
		image: "/gis-mapping.jpg",
		alt: "Computer screen displaying geospatial GIS mapping data",
	},
	{
		label: "3D Laser Scanning",
		sub: "Terrestrial LiDAR and BIM integration for architectural and heritage documentation.",
		promo: false,
		span: "md:col-span-2",
		image: "/3d-laser-scanning.jpg",
		alt: "Technician using a 3D laser scanner inside an industrial facility",
	},
];

const escuroSteps = [
	{
		icon: FileText,
		title: "1. Post Survey",
		desc: "Define requirements, location, and timeline for your project.",
	},
	{
		icon: UserCheck,
		title: "2. Secure Talent",
		desc: "Receive bids from verified professionals and fund milestones.",
	},
	{
		icon: Shield,
		title: "3. Field Work",
		desc: "Funds are held in escrow while the professional executes the work.",
	},
	{
		icon: Wallet,
		title: "4. Release Funds",
		desc: "Review deliverables and release payment securely once satisfied.",
	},
];

export default function LandingPage() {
	return (
		<div className="min-h-screen flex flex-col overflow-x-hidden">
			{/* Top Nav */}
			<header className="bg-white shadow-sm border-b border-ink-200 sticky top-0 z-50">
				<div className="flex items-center justify-between px-4 sm:px-6 h-16 w-full max-w-[1280px] mx-auto">
					<div className="flex items-center gap-6 sm:gap-8 min-w-0">
						<Link
							href="/"
							className="flex items-center gap-2 font-bold text-base sm:text-lg tracking-tight text-ink-900 shrink-0"
						>
							<Image
								src="/logo.png"
								alt="SurveyConnectHub"
								width={56}
								height={56}
								className="h-14 w-auto"
							/>
							SurveyConnectHub
						</Link>
						<nav className="hidden md:flex gap-6">
							{navLinks.map((item) => (
								<Link
									key={item.label}
									href={item.href}
									className="text-ink-600 hover:text-ink-900 hover:bg-ink-050 px-2 py-1 rounded transition-colors text-sm font-medium"
								>
									{item.label}
								</Link>
							))}
						</nav>
					</div>
					<div className="flex items-center gap-2 sm:gap-4 shrink-0">
						<Link
							href="/login"
							className="text-ink-600 hover:text-ink-900 font-medium text-sm"
						>
							<span className="hidden sm:inline">Log in</span>
							<span className="sm:hidden">Log in</span>
						</Link>
						<Link
							href="/signup"
							className="bg-geo-700 hover:bg-geo-600 text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
						>
							Get Started
						</Link>
					</div>
				</div>
			</header>

			<main className="flex-1">
				{/* Hero Section */}
				<section className="relative bg-white pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden">
					<div className="max-w-[1280px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
						<div className="lg:col-span-6 z-10">
							<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink-900 mb-6 leading-tight">
								The Marketplace for{" "}
								<span className="text-geo-700">Geospatial</span>{" "}
								<br className="hidden sm:block" />
								Professionals
							</h1>
							<p className="text-base sm:text-lg text-ink-500 mb-8 sm:mb-10 max-w-lg leading-relaxed">
								Find licensed surveyors, GIS analysts, and certified drone
								pilots for your next infrastructure project. Secure, verified,
								and professional.
							</p>
							<div className="flex flex-col sm:flex-row gap-4">
								<Link
									href="/signup"
									className="bg-geo-700 hover:bg-geo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm transition-all active:scale-95 inline-flex items-center gap-2 justify-center"
								>
									Post a Project
									<ArrowRight className="w-4 h-4" />
								</Link>
								<Link
									href="/jobs"
									className="bg-white border border-ink-200 text-ink-900 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm hover:bg-ink-050 transition-all active:scale-95 inline-flex items-center justify-center"
								>
									Browse Jobs
								</Link>
							</div>
						</div>
						<div className="lg:col-span-6 relative h-[300px] sm:h-[400px] lg:h-[500px] hidden sm:block">
							<div className="absolute inset-0 bg-brand-700/5 rounded-[2rem] transform rotate-3" />
							<div className="absolute inset-0 w-full h-full rounded-[2rem] shadow-design-lg z-10 overflow-hidden">
								<Image
									src="/hero-placeholder.jpg"
									alt="Professional land surveyor operating high-precision equipment"
									fill
									className="object-cover"
									priority
									sizes="(min-width: 1024px) 50vw, 100vw"
								/>
							</div>
						</div>
					</div>
				</section>

				{/* Categories Bento Grid */}
				<section className="py-16 sm:py-24 bg-ink-050">
					<div className="max-w-[1280px] mx-auto px-4 sm:px-6">
						<div className="mb-8 sm:mb-12">
							<h2 className="text-xl sm:text-2xl font-semibold text-ink-900 mb-2">
								Browse Top Categories
							</h2>
							<p className="text-sm sm:text-base text-ink-500">
								Expertise across the entire geospatial lifecycle
							</p>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:h-[600px]">
						{categoryTiles.map((tile) => (
							<div
								key={tile.label}
								className={`${tile.span} relative group overflow-hidden rounded-2xl shadow-design-xs border border-ink-200 h-[200px] sm:h-[280px] md:h-auto`}
							>
								<Image
									src={tile.image}
									alt={tile.alt}
									fill
									sizes="(min-width: 768px) 33vw, 100vw"
									className="object-cover transition-transform duration-500 group-hover:scale-105"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 to-transparent" />
								<div className="absolute bottom-0 left-0 p-6 sm:p-8">
									{tile.promo && (
										<span className="px-3 py-1 bg-geo-700 text-white text-xs font-bold rounded-full mb-3 inline-block">
											MOST POPULAR
										</span>
									)}
									<h3 className="text-white text-lg sm:text-xl font-semibold mb-2">
										{tile.label}
									</h3>
									<p className="text-ink-200 text-xs sm:text-sm max-w-sm">
										{tile.sub}
									</p>
								</div>
							</div>
						))}
						</div>
					</div>
				</section>

				{/* Escrow Flow */}
				<section className="py-16 sm:py-24 bg-white">
					<div className="max-w-[1280px] mx-auto px-4 sm:px-6">
						<div className="text-center mb-12 sm:mb-16">
							<h2 className="text-xl sm:text-2xl font-semibold text-ink-900 mb-4">
								Professional Escrow Flow
							</h2>
							<p className="text-base sm:text-lg text-ink-500 max-w-2xl mx-auto">
								Work with confidence using our milestone-based payment system
								designed for high-stakes technical projects.
							</p>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
							{escuroSteps.map((step, i) => (
								<div
									key={step.title}
									className="flex flex-col items-center text-center relative"
								>
									{i > 0 && (
										<div className="hidden md:block absolute top-8 -left-1/2 w-full border-t-2 border-dashed border-ink-200" />
									)}
									<div
										className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-sm z-10 ${
											i === escuroSteps.length - 1
												? "bg-geo-700 text-white shadow-design-md"
												: "bg-ink-050 text-geo-700"
										}`}
									>
										<step.icon className="w-6 h-6 sm:w-7 sm:h-7" />
									</div>
									<h4 className="font-semibold text-base sm:text-lg text-ink-900 mb-2">
										{step.title}
									</h4>
									<p className="text-sm text-ink-500">{step.desc}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Final CTA */}
				<section className="py-16 sm:py-24 bg-brand-700">
					<div className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center">
						<h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6">
							Ready to scale your geospatial operations?
						</h2>
						<p className="text-base sm:text-lg text-white/80 mb-8 sm:mb-10 max-w-2xl mx-auto">
							Join professionals using the marketplace to streamline their
							workflows.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/signup"
								className="bg-white text-brand-700 px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-semibold text-sm hover:bg-ink-100 transition-all active:scale-95 inline-flex items-center gap-2 justify-center"
							>
								Post a Survey Project
								<ArrowRight className="w-4 h-4" />
							</Link>
							<Link
								href="/signup"
								className="border border-white/30 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-lg font-semibold text-sm hover:bg-white/10 transition-all active:scale-95 inline-flex items-center justify-center"
							>
								Join as a Professional
							</Link>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}