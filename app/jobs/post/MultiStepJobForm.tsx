"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackButton from "@/components/ui/BackButton";
import {
	ChevronRight,
	ChevronLeft,
	AlertCircle,
	Pencil,
	Upload,
	FileText,
} from "lucide-react";
import {
	PRICING_MODEL_OPTIONS,
	PRICING_MODEL_LABELS,
	PRICING_UNIT_BY_MODEL,
	ACCURACY_CLASS_OPTIONS,
	JOB_TYPE_OPTIONS,
	computeJobBudget,
	type PricingModel,
} from "@/lib/constants";

const SITE_SIZE_UNITS = ["hectares", "acres", "sq_meters"] as const;
type SiteSizeUnit = (typeof SITE_SIZE_UNITS)[number];

const SITE_SIZE_UNIT_LABELS: Record<SiteSizeUnit, string> = {
	hectares: "Hectares",
	acres: "Acres",
	sq_meters: "Square meters",
};

const SITE_ACCESS_OPTIONS = [
	{ value: "easy_vehicle", label: "Easy / vehicle access" },
	{ value: "difficult_remote", label: "Difficult / remote" },
	{ value: "requires_permission", label: "Requires permission" },
] as const;

const DURATION_OPTIONS = [
	{ value: "1_day", label: "1 Day" },
	{ value: "3_days", label: "3 Days" },
	{ value: "1_week", label: "1 Week" },
	{ value: "2_weeks", label: "2 Weeks" },
	{ value: "1_month", label: "1 Month" },
	{ value: "3_months", label: "3 Months" },
	{ value: "6_months", label: "6 Months" },
] as const;

const STEPS = [
	{ label: "Job Type & Title", short: "Type" },
	{ label: "About the Job", short: "About" },
	{ label: "Timeframe", short: "Time" },
	{ label: "Payment", short: "Payment" },
	{ label: "Documents", short: "Docs" },
	{ label: "Review", short: "Review" },
];

const TITLE_PLACEHOLDER =
	"e.g. Seismic refraction survey for estate boundary assessment";

export default function MultiStepJobForm() {
	const router = useRouter();
	const supabase = useMemo(() => createClient(), []);
	const [currentStep, setCurrentStep] = useState(1);
	const [loading, setLoading] = useState(false);
	const [pageLoading, setPageLoading] = useState(true);
	const [error, setError] = useState("");
	const [user, setUser] = useState<any>(null);
	const [briefFile, setBriefFile] = useState<File | null>(null);

	const [formData, setFormData] = useState({
		// Step 1
		title: "",
		survey_types: [] as string[],
		// Step 2
		description: "",
		site_location: "",
		site_size_value: "",
		site_size_unit: "hectares" as SiteSizeUnit,
		site_access: "",
		additional_notes: "",
		// Step 3
		estimated_duration: "",
		// Step 4 — existing pricing logic reused verbatim
		budget_model: "fixed" as "fixed" | "negotiable",
		budget_fixed: "",
		budget_min: "",
		budget_max: "",
		pricing_model: "flat" as PricingModel,
		pricing_unit_rate: "",
		pricing_quantity: "",
		mobilization_fee: "",
		accuracy_class: "",
		// Persisted-to-job row but not surfaced as a step in this rebuild:
		job_type: "remote", // default; site location from Step 2 doesn't change work-location enum
		// Other persisted
		required_verification: true,
	});

	// Validate per step
	const validateStep = (step: number): boolean => {
		setError("");
		switch (step) {
			case 1: {
				if (!formData.title.trim()) {
					setError("Job title is required");
					return false;
				}
				if (formData.survey_types.length === 0) {
					setError("Please select at least one survey type");
					return false;
				}
				return true;
			}
			case 2: {
				if (!formData.description.trim()) {
					setError("Job description is required");
					return false;
				}
				if (!formData.site_location.trim()) {
					setError("Site location is required");
					return false;
				}
				if (formData.site_size_value) {
					const v = parseFloat(formData.site_size_value);
					if (!Number.isFinite(v) || v <= 0) {
						setError("Site size must be a positive number");
						return false;
					}
				}
				if (!formData.site_access) {
					setError("Please select a site access option");
					return false;
				}
				return true;
			}
			case 3: {
				if (!formData.estimated_duration) {
					setError("Please select an estimated duration");
					return false;
				}
				return true;
			}
			case 4: {
				if (formData.pricing_model !== "flat") {
					const unitRate = parseFloat(formData.pricing_unit_rate);
					const quantity = parseFloat(formData.pricing_quantity);
					const mobFee = parseFloat(formData.mobilization_fee) || 0;
					if (!Number.isFinite(unitRate) || unitRate <= 0) {
						setError("Unit rate must be greater than 0");
						return false;
					}
					if (!Number.isFinite(quantity) || quantity <= 0) {
						setError("Quantity must be greater than 0");
						return false;
					}
					if (mobFee < 0) {
						setError("Mobilization fee cannot be negative");
						return false;
					}
					const computedBudget = computeJobBudget(
						formData.pricing_model,
						unitRate,
						quantity,
						mobFee,
					);
					if (computedBudget > 100000) {
						setError(
							"Total budget for per-unit jobs cannot exceed $100,000. For larger contracts, contact support@SurveyConnectHub.com",
						);
						return false;
					}
					if (computedBudget < 1) {
						setError("Total budget must be greater than 0");
						return false;
					}
				} else if (formData.budget_model === "fixed") {
					if (!formData.budget_fixed) {
						setError("Budget amount is required");
						return false;
					}
					const fixedBudget = parseFloat(formData.budget_fixed);
					if (fixedBudget < 1) {
						setError("Budget must be greater than 0");
						return false;
					}
					if (fixedBudget > 30000) {
						setError(
							"Budget cannot exceed $30,000. For larger contracts, contact support@SurveyConnectHub.com",
						);
						return false;
					}
				} else {
					if (!formData.budget_max) {
						setError("Maximum budget is required for negotiable jobs");
						return false;
					}
					const maxBudget = parseFloat(formData.budget_max);
					if (!Number.isFinite(maxBudget) || maxBudget < 1) {
						setError("Maximum budget must be greater than 0");
						return false;
					}
					if (maxBudget > 30000) {
						setError(
							"Budget cannot exceed $30,000. For larger contracts, contact support@SurveyConnectHub.com",
						);
						return false;
					}
					if (formData.budget_min) {
						const minBudget = parseFloat(formData.budget_min);
						if (!Number.isFinite(minBudget) || minBudget < 1) {
							setError("Minimum budget must be greater than 0");
							return false;
						}
						if (minBudget >= maxBudget) {
							setError("Maximum budget must be greater than minimum");
							return false;
						}
						if (minBudget > 30000) {
							setError(
								"Budget cannot exceed $30,000. For larger contracts, contact support@SurveyConnectHub.com",
							);
							return false;
						}
					}
				}
				return true;
			}
			case 5:
				return true;
			case 6:
				return true;
			default:
				return true;
		}
	};

	useEffect(() => {
		const checkUser = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				router.push("/login");
				return;
			}

			const { data: profile } = await supabase
				.from("profiles")
				.select("role")
				.eq("id", user.id)
				.single();

			if (profile?.role !== "client") {
				router.push("/dashboard/professional");
				return;
			}

			setUser(user);
			setPageLoading(false);
		};

		checkUser();
	}, [router, supabase]);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>,
	) => {
		const { name, value } = e.target;
		const checked = (e.target as HTMLInputElement).checked;
		const type = (e.target as HTMLInputElement).type;
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const toggleSurveyType = (jt: string) => {
		setFormData((prev) => {
			const isSelected = prev.survey_types.includes(jt);
			return {
				...prev,
				survey_types: isSelected
					? prev.survey_types.filter((item) => item !== jt)
					: [...prev.survey_types, jt],
			};
		});
	};

	const handleBriefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const allowedTypes = [
			"application/pdf",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		];
		const ext = file.name.split(".").pop()?.toLowerCase();

		if (
			!allowedTypes.includes(file.type) ||
			!["pdf", "docx"].includes(ext || "")
		) {
			setError("Only PDF and DOCX files are allowed");
			return;
		}

		setBriefFile(file);
		setError("");
	};

	const goToStep = (step: number) => {
		setCurrentStep(step);
		setError("");
		window.scrollTo(0, 0);
	};

	const handleNext = () => {
		if (validateStep(currentStep)) {
			goToStep(currentStep + 1);
		}
	};

	const handlePrev = () => {
		goToStep(currentStep - 1);
	};

	const handleSubmit = async () => {
		if (!validateStep(6)) return;

		setError("");
		setLoading(true);

		try {
			let briefAttachmentUrl: string | null = null;
			if (briefFile) {
				const cleanName = briefFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
				const briefPath = `${user.id}/job-brief-${Date.now()}-${cleanName}`;
				const { error: uploadError } = await supabase.storage
					.from("job-briefs")
					.upload(briefPath, briefFile);

				if (uploadError) {
					throw uploadError;
				}
				briefAttachmentUrl = briefPath;
			}

			const isPerUnit = formData.pricing_model !== "flat";
			const unitRate = parseFloat(formData.pricing_unit_rate) || 0;
			const quantity = parseFloat(formData.pricing_quantity) || 0;
			const mobilizationFee = parseFloat(formData.mobilization_fee) || 0;

			const budgetAmount = isPerUnit
				? computeJobBudget(formData.pricing_model, unitRate, quantity, mobilizationFee)
				: formData.budget_model === "fixed"
					? parseFloat(formData.budget_fixed)
					: parseFloat(formData.budget_max) ||
						parseFloat(formData.budget_min) ||
						0;

			if (!Number.isFinite(budgetAmount) || budgetAmount <= 0) {
				setError("Please enter a valid budget greater than 0.");
				setLoading(false);
				return;
			}
			if (isPerUnit && budgetAmount > 100000) {
				setError(
					"Total budget for per-unit jobs cannot exceed $100,000. For larger contracts, contact support@SurveyConnectHub.com",
				);
				setLoading(false);
				return;
			}
			if (!isPerUnit && budgetAmount > 30000) {
				setError(
					"Budget cannot exceed $30,000. For larger contracts, contact support@SurveyConnectHub.com",
				);
				setLoading(false);
				return;
			}

			const siteSizeValue = formData.site_size_value
				? parseFloat(formData.site_size_value)
				: null;

			// profession_type column is a non-null enum (PROFESSION_OPTIONS).
			// Phase 2 jobs no longer ask for a profession role; default to "other"
			// since the new survey-types multi-select is the primary categorization.
			const professionType = "other";

			const { error: jobError } = await supabase.from("jobs").insert({
				client_id: user.id,
				title: formData.title,
				description: formData.description,
				profession_type: professionType,
				job_type: formData.job_type,
				location: formData.site_location || null,
				required_skills: [],
				estimated_duration: formData.estimated_duration || null,
				brief_attachment_url: briefAttachmentUrl,
				budget: budgetAmount,
				budget_min:
					formData.budget_model === "negotiable"
						? formData.budget_min
							? parseFloat(formData.budget_min)
							: null
						: null,
				budget_max:
					formData.budget_model === "negotiable"
						? formData.budget_max
							? parseFloat(formData.budget_max)
							: null
						: null,
				budget_model: formData.budget_model,
				budget_type: "fixed",
				pricing_model: formData.pricing_model,
				pricing_unit_rate: isPerUnit ? unitRate : null,
				pricing_quantity: isPerUnit ? quantity : null,
				pricing_unit: isPerUnit
					? PRICING_UNIT_BY_MODEL[formData.pricing_model]
					: null,
				mobilization_fee: isPerUnit ? mobilizationFee : 0,
				accuracy_class: formData.accuracy_class || null,
				screening_questions: null,
				required_verification: formData.required_verification,
				status: "open",
				// Phase 2 fields
				survey_types:
					formData.survey_types.length > 0 ? formData.survey_types : null,
				site_location: formData.site_location || null,
				site_size_value: siteSizeValue,
				site_size_unit: formData.site_size_value ? formData.site_size_unit : null,
				site_access: formData.site_access || null,
				additional_notes: formData.additional_notes || null,
			});

			if (jobError) throw jobError;

			router.push("/dashboard/client/jobs");
		} catch (err: any) {
			setError(err.message || "Failed to post job. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (pageLoading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">Loading...</div>
			</div>
		);
	}

	// Renders a section card used in the review step
	const renderReviewSection = (
		title: string,
		step: number,
		children: React.ReactNode,
	) => (
		<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-gray-900 dark:text-white">
					{title}
				</h3>
				<button
					type="button"
					onClick={() => goToStep(step)}
					className="text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400"
					aria-label={`Edit ${title}`}
				>
					<Pencil className="w-4 h-4" />
				</button>
			</div>
			<div className="space-y-2 text-sm">{children}</div>
		</div>
	);

	const renderReviewRow = (label: string, value: React.ReactNode) => (
		<div className="flex justify-between gap-4">
			<span className="text-gray-600 dark:text-gray-400 shrink-0">{label}:</span>
			<span className="text-gray-900 dark:text-white font-medium text-right">
				{value || <span className="italic text-gray-400">—</span>}
			</span>
		</div>
	);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 transition-colors duration-300">
			<div className="max-w-2xl mx-auto">
				<div className="mb-6">
					<BackButton href="/dashboard/client" label="Dashboard" />
				</div>

				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Survey<span className="text-green-600">ConnectHub</span>
					</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-2">Post a New Job</p>
				</div>

				<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-transparent dark:border-gray-800">
					{/* Progress Indicator */}
					<div className="mb-8">
						<div className="flex items-center justify-between mb-2">
							{STEPS.map((step, index) => (
								<div key={index} className="flex-1">
									<div
										className={`h-2 rounded-full transition-colors ${
											index + 1 <= currentStep
												? "bg-green-600"
												: "bg-gray-300 dark:bg-gray-700"
										}`}
									/>
									{index < STEPS.length - 1 && (
										<div
											className={`h-2 -mt-2 rounded-full transition-colors ${
												index + 1 < currentStep
													? "bg-green-600"
													: "bg-gray-300 dark:bg-gray-700"
											}`}
										/>
									)}
								</div>
							))}
						</div>
						<div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
							<span>
								Step {currentStep} of {STEPS.length}
							</span>
							<span className="font-medium text-gray-900 dark:text-white">
								{STEPS[currentStep - 1].label}
							</span>
						</div>
					</div>

					{/* Error Message */}
					{error && (
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm flex gap-2">
							<AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					{/* STEP 1 — Job Type & Title */}
					{currentStep === 1 && (
						<form className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Job Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="title"
									value={formData.title}
									onChange={handleChange}
									placeholder={TITLE_PLACEHOLDER}
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
								/>
							<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
								Be specific. Examples: &ldquo;Boundary survey for 50-hectare
								estate&rdquo;, &ldquo;Topographic survey for highway
								corridor&rdquo;.
							</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Survey Type(s) Needed <span className="text-red-500">*</span>
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
									Select all that apply. Used to match you with professionals
									who take on these job types.
								</p>
								<div className="flex flex-wrap gap-2">
									{JOB_TYPE_OPTIONS.map((jt) => {
										const isSelected = formData.survey_types.includes(jt);
										return (
											<button
												key={jt}
												type="button"
												onClick={() => toggleSurveyType(jt)}
												className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
													isSelected
														? "bg-green-600 text-white"
														: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
												}`}
											>
												{jt}
											</button>
										);
									})}
								</div>
							</div>
						</form>
					)}

					{/* STEP 2 — About the Job */}
					{currentStep === 2 && (
						<form className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Description <span className="text-red-500">*</span>
								</label>
								<textarea
									name="description"
									value={formData.description}
									onChange={handleChange}
									rows={8}
									placeholder="Describe the project in detail. Include scope, deliverables, and any special requirements..."
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Site Location <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="site_location"
									value={formData.site_location}
									onChange={handleChange}
									placeholder="e.g. Lekki Phase 2 Estate, Lagos"
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
								/>
								<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
									Address or general area. Not shown publicly to professionals
									outside the job page.
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Approximate Site Size
								</label>
								<div className="grid grid-cols-3 gap-3">
									<div className="col-span-2">
										<input
											type="number"
											name="site_size_value"
											value={formData.site_size_value}
											onChange={handleChange}
											placeholder="0"
											min="0"
											step="0.01"
											className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
										/>
									</div>
									<select
										name="site_size_unit"
										value={formData.site_size_unit}
										onChange={handleChange}
										aria-label="Site size unit"
										className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
									>
										{SITE_SIZE_UNITS.map((unit) => (
											<option key={unit} value={unit}>
												{SITE_SIZE_UNIT_LABELS[unit]}
											</option>
										))}
									</select>
								</div>
								<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
									Optional, but helps professionals estimate effort.
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Site Access <span className="text-red-500">*</span>
								</label>
								<select
									name="site_access"
									value={formData.site_access}
									onChange={handleChange}
									aria-label="Select site access"
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
								>
									<option value="">Select site access</option>
									{SITE_ACCESS_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Additional Notes
								</label>
								<textarea
									name="additional_notes"
									value={formData.additional_notes}
									onChange={handleChange}
									rows={4}
									placeholder="Terrain type, coordinate system, existing control points, specific equipment expectations, etc."
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
								/>
								<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
									Optional. Anything else the professional should know before
									quoting.
								</p>
							</div>
						</form>
					)}

					{/* STEP 3 — Timeframe */}
					{currentStep === 3 && (
						<form className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Estimated Delivery / Project Duration{" "}
									<span className="text-red-500">*</span>
								</label>
								<select
									name="estimated_duration"
									value={formData.estimated_duration}
									onChange={handleChange}
									aria-label="Select estimated duration"
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
								>
									<option value="">Select duration</option>
									{DURATION_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
								<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
									How long you expect the project to take once started.
								</p>
							</div>
						</form>
					)}

					{/* STEP 4 — Payment (existing pricing logic reused verbatim) */}
					{currentStep === 4 && (
						<form className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Pricing Model <span className="text-red-500">*</span>
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
									Geospatial work is often priced per area, distance, or point.
									Pick the model that matches the scope.
								</p>
								<select
									name="pricing_model"
									value={formData.pricing_model}
									onChange={handleChange}
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
								>
									{PRICING_MODEL_OPTIONS.map((model) => (
										<option key={model} value={model}>
											{PRICING_MODEL_LABELS[model]}
										</option>
									))}
								</select>
							</div>

							{formData.pricing_model !== "flat" && (
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
											Unit Rate (USD /{" "}
											{PRICING_UNIT_BY_MODEL[formData.pricing_model]}){" "}
											<span className="text-red-500">*</span>
										</label>
										<div className="relative">
											<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
												$
											</span>
											<input
												type="number"
												name="pricing_unit_rate"
												value={formData.pricing_unit_rate}
												onChange={handleChange}
												placeholder="e.g. 25"
												min="0.01"
												step="0.01"
												className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
											/>
										</div>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
											Quantity ({PRICING_UNIT_BY_MODEL[formData.pricing_model]}s){" "}
											<span className="text-red-500">*</span>
										</label>
										<input
											type="number"
											name="pricing_quantity"
											value={formData.pricing_quantity}
											onChange={handleChange}
											placeholder="e.g. 50"
											min="0.01"
											step="0.01"
											className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
											Mobilization Fee (USD)
										</label>
										<div className="relative">
											<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
												$
											</span>
											<input
												type="number"
												name="mobilization_fee"
												value={formData.mobilization_fee}
												onChange={handleChange}
												placeholder="0"
												min="0"
												step="0.01"
												className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
											/>
										</div>
									</div>
									<div className="md:col-span-3 text-sm text-emerald-700 dark:text-emerald-300">
										Total budget:{" "}
										<span className="font-semibold">
											$
											{computeJobBudget(
												formData.pricing_model,
												parseFloat(formData.pricing_unit_rate) || 0,
												parseFloat(formData.pricing_quantity) || 0,
												parseFloat(formData.mobilization_fee) || 0,
											).toLocaleString(undefined, { maximumFractionDigits: 2 })}
										</span>{" "}
										(max $100,000 for per-unit jobs)
									</div>
								</div>
							)}

							{formData.pricing_model === "flat" && (
								<div>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Budget Type <span className="text-red-500">*</span>
									</label>
									<div className="grid grid-cols-2 gap-3">
										<button
											type="button"
											onClick={() =>
												setFormData((prev) => ({
													...prev,
													budget_model: "fixed",
												}))
											}
											className={`p-4 rounded-xl border-2 text-left transition-all ${
												formData.budget_model === "fixed"
													? "border-green-600 bg-green-50 dark:bg-green-900/20"
													: "border-gray-200 dark:border-gray-700 hover:border-gray-300"
											}`}
										>
											<p className="font-semibold text-gray-900 dark:text-white text-sm">
												Fixed Price
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
												You set the exact price.
											</p>
										</button>
										<button
											type="button"
											onClick={() =>
												setFormData((prev) => ({
													...prev,
													budget_model: "negotiable",
												}))
											}
											className={`p-4 rounded-xl border-2 text-left transition-all ${
												formData.budget_model === "negotiable"
													? "border-green-600 bg-green-50 dark:bg-green-900/20"
													: "border-gray-200 dark:border-gray-700 hover:border-gray-300"
											}`}
										>
											<p className="font-semibold text-gray-900 dark:text-white text-sm">
												Negotiable
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
												Set a budget range.
											</p>
										</button>
									</div>
								</div>
							)}

							{formData.pricing_model === "flat" &&
								formData.budget_model === "fixed" && (
									<div>
										<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
											Fixed Amount (USD) <span className="text-red-500">*</span>
										</label>
										<div className="relative">
											<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
												$
											</span>
											<input
												type="number"
												name="budget_fixed"
												value={formData.budget_fixed}
												onChange={handleChange}
												placeholder="e.g. 500"
												min="1"
												max="30000"
												className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400"
											/>
										</div>
										<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
											Maximum $30,000.
										</p>
									</div>
								)}

							{formData.pricing_model === "flat" &&
								formData.budget_model === "negotiable" && (
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
												Minimum Budget (USD)
											</label>
											<div className="relative">
												<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
													$
												</span>
												<input
													type="number"
													name="budget_min"
													value={formData.budget_min}
													onChange={handleChange}
													placeholder="e.g. 300"
													min="1"
													className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400"
												/>
											</div>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
												Maximum Budget (USD){" "}
												<span className="text-red-500">*</span>
											</label>
											<div className="relative">
												<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
													$
												</span>
												<input
													type="number"
													name="budget_max"
													value={formData.budget_max}
													onChange={handleChange}
													placeholder="e.g. 600"
													min="1"
													className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400"
												/>
											</div>
										</div>
									</div>
								)}

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Accuracy Class (optional)
								</label>
								<select
									name="accuracy_class"
									value={formData.accuracy_class}
									onChange={handleChange}
									className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
								>
									<option value="">Not specified</option>
									{ACCURACY_CLASS_OPTIONS.map((cls) => (
										<option key={cls} value={cls}>
											{cls}
										</option>
									))}
								</select>
							</div>
						</form>
					)}

					{/* STEP 5 — Documents */}
					{currentStep === 5 && (
						<form className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Job Brief / Site Document{" "}
									<span className="text-gray-400 text-xs">(optional)</span>
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
									Upload a single PDF or DOCX with the scope of work, site
									photos, or reference materials. Professionals will be able to
									securely download this when reviewing your job.
								</p>
								<label className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center cursor-pointer hover:border-green-500 transition-colors">
									<input
										type="file"
										accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
										onChange={handleBriefFileChange}
										className="hidden"
									/>
									<div className="text-gray-600 dark:text-gray-400 text-sm">
										{briefFile ? (
											<span className="text-green-600 dark:text-green-400 inline-flex items-center gap-2">
												<FileText className="w-4 h-4" /> ✓ {briefFile.name}
											</span>
										) : (
											<>
												<span className="text-green-600 dark:text-green-400 inline-flex items-center gap-1">
													<Upload className="w-4 h-4" /> Click to upload
												</span>
												<span className="text-gray-500 dark:text-gray-500">
													{" "}
													or drag and drop
												</span>
												<p className="text-xs text-gray-400 mt-1">
													PDF or DOCX only · Max 5MB
												</p>
											</>
										)}
									</div>
								</label>
								<p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
									Once posted, this attachment is locked — additional documents
									cannot be added later in this release.
								</p>
							</div>
						</form>
					)}

					{/* STEP 6 — Review */}
					{currentStep === 6 && (
						<div className="space-y-4">
							{renderReviewSection("Job Type & Title", 1,
								<>
									{renderReviewRow("Title", formData.title)}
									<div>
										<span className="text-gray-600 dark:text-gray-400">
											Survey type(s):
										</span>
										<div className="flex flex-wrap gap-1.5 mt-2">
											{formData.survey_types.length > 0 ? (
												formData.survey_types.map((jt) => (
													<span
														key={jt}
														className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded"
													>
														{jt}
													</span>
												))
											) : (
												<span className="italic text-gray-400">—</span>
											)}
										</div>
									</div>
								</>
							)}

							{renderReviewSection("About the Job", 2,
								<>
									<div>
										<span className="text-gray-600 dark:text-gray-400 block mb-1">
											Description:
										</span>
										<p className="text-gray-900 dark:text-white line-clamp-4 whitespace-pre-wrap">
											{formData.description}
										</p>
									</div>
									{renderReviewRow(
										"Site location",
										formData.site_location,
									)}
									{renderReviewRow(
										"Site size",
										formData.site_size_value
											? `${formData.site_size_value} ${SITE_SIZE_UNIT_LABELS[formData.site_size_unit]}`
											: null,
									)}
									{renderReviewRow(
										"Site access",
										SITE_ACCESS_OPTIONS.find(
											(opt) => opt.value === formData.site_access,
										)?.label,
									)}
									{renderReviewRow(
										"Additional notes",
										formData.additional_notes || null,
									)}
								</>
							)}

							{renderReviewSection("Timeframe", 3,
								<>
									{renderReviewRow(
										"Estimated duration",
										DURATION_OPTIONS.find(
											(opt) => opt.value === formData.estimated_duration,
										)?.label,
									)}
								</>
							)}

							{renderReviewSection("Payment", 4,
								<>
									{renderReviewRow(
										"Pricing model",
										PRICING_MODEL_LABELS[formData.pricing_model],
									)}
									{renderReviewRow(
										"Budget",
										formData.pricing_model !== "flat"
											? `$${(parseFloat(formData.pricing_unit_rate) || 0).toFixed(2)} × ${formData.pricing_quantity || 0} ${PRICING_UNIT_BY_MODEL[formData.pricing_model]}${(parseFloat(formData.pricing_quantity) || 0) === 1 ? "" : "s"}${formData.mobilization_fee ? " + $" + (parseFloat(formData.mobilization_fee) || 0).toFixed(2) + " mob" : ""} = $${computeJobBudget(
												formData.pricing_model,
												parseFloat(formData.pricing_unit_rate) || 0,
												parseFloat(formData.pricing_quantity) || 0,
												parseFloat(formData.mobilization_fee) || 0,
											).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
											: formData.budget_model === "fixed"
												? `Fixed: $${formData.budget_fixed}`
												: `Negotiable: $${formData.budget_min || 0} - $${formData.budget_max || 0}`,
									)}
									{renderReviewRow(
										"Accuracy class",
										formData.accuracy_class || null,
									)}
								</>
							)}

							{renderReviewSection("Documents", 5,
								<>
									{briefFile ? (
										<span className="text-green-600 dark:text-green-400 inline-flex items-center gap-2 text-sm">
											<FileText className="w-4 h-4" /> ✓ {briefFile.name}
										</span>
									) : (
										<span className="italic text-gray-400 text-sm">
											No document attached
										</span>
									)}
								</>
							)}
						</div>
					)}

					{/* Navigation Buttons */}
					<div className="flex gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
						{currentStep > 1 && (
							<button
								onClick={handlePrev}
								className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition-colors"
							>
								<ChevronLeft className="w-4 h-4" />
								Back
							</button>
						)}

						{currentStep < STEPS.length ? (
							<button
								onClick={handleNext}
								className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
							>
								Next
								<ChevronRight className="w-4 h-4" />
							</button>
						) : (
							<button
								onClick={handleSubmit}
								disabled={loading}
								className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
							>
								{loading ? "Posting..." : "Post Job"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
