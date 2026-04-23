"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];

export default function VerificationPage() {
	const router = useRouter();
	const supabase = createClient();

	const [user, setUser] = useState<any>(null);
	const [profile, setProfile] = useState<any>(null);
	const [profProfile, setProfProfile] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [idFile, setIdFile] = useState<File | null>(null);
	const [licenseFile, setLicenseFile] = useState<File | null>(null);
	const [idFileError, setIdFileError] = useState("");
	const [licenseFileError, setLicenseFileError] = useState("");
	const [professionType, setProfessionType] = useState("");
	const [licenseNumber, setLicenseNumber] = useState("");
	const [yearsExperience, setYearsExperience] = useState("");

	useEffect(() => {
		const getData = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) { router.push("/login"); return; }

			const { data: profile } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", user.id)
				.single();

			if (profile?.role !== "professional") {
				router.push("/dashboard/client");
				return;
			}

			const { data: profProfile } = await supabase
				.from("professional_profiles")
				.select("*")
				.eq("id", user.id)
				.single();

			setUser(user);
			setProfile(profile);
			setProfProfile(profProfile);
			setLoading(false);
		};

		getData();
	}, []);

	const getProfessionLabel = (type: string) => {
		const labels: any = {
			land_surveyor: "Land Surveyor",
			gis_analyst: "GIS Analyst",
			drone_pilot: "Drone/UAV Pilot",
			cartographer: "Cartographer",
			photogrammetrist: "Photogrammetrist",
			lidar_specialist: "LiDAR Specialist",
			remote_sensing_analyst: "Remote Sensing Analyst",
			urban_planner: "Urban Planner",
			spatial_data_scientist: "Spatial Data Scientist",
			hydrographic_surveyor: "Hydrographic Surveyor",
			mining_surveyor: "Mining Surveyor",
			construction_surveyor: "Construction Surveyor",
			environmental_analyst: "Environmental Analyst",
			bim_specialist: "BIM Specialist",
			other: "Other",
		};
		return labels[type] || type;
	};

	const validateFile = (file: File): string => {
		const ext = file.name.split(".").pop()?.toLowerCase() || "";
		if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
			return "Only JPG, PNG, or PDF files are allowed.";
		}
		if (file.size > MAX_FILE_SIZE) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
			return `File is ${sizeMB}MB — maximum allowed size is 2MB. Please compress or resize your file.`;
		}
		return "";
	};

	const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setIdFileError("");
		if (!file) { setIdFile(null); return; }
		const err = validateFile(file);
		if (err) {
			setIdFileError(err);
			setIdFile(null);
			e.target.value = ""; // reset input so they can reselect
			return;
		}
		setIdFile(file);
	};

	const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null;
		setLicenseFileError("");
		if (!file) { setLicenseFile(null); return; }
		const err = validateFile(file);
		if (err) {
			setLicenseFileError(err);
			setLicenseFile(null);
			e.target.value = "";
			return;
		}
		setLicenseFile(file);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");

		if (!idFile) { setError("Please upload your government-issued ID"); return; }
		if (!licenseFile) { setError("Please upload your professional license or certificate"); return; }
		if (!professionType) { setError("Please select your profession type"); return; }
		if (idFileError || licenseFileError) { setError("Please fix the file errors before submitting."); return; }

		setUploading(true);

		try {
			const idFileName = `${user.id}/id-${Date.now()}.${idFile.name.split(".").pop()}`;
			const { error: idError } = await supabase.storage
				.from("verification-documents")
				.upload(idFileName, idFile);
			if (idError) throw idError;

			const licenseFileName = `${user.id}/license-${Date.now()}.${licenseFile.name.split(".").pop()}`;
			const { error: licenseError } = await supabase.storage
				.from("verification-documents")
				.upload(licenseFileName, licenseFile);
			if (licenseError) throw licenseError;

			const { error: updateError } = await supabase
				.from("professional_profiles")
				.upsert({
					id: user.id,
					profession_type: professionType,
					license_number: licenseNumber,
					years_experience: parseInt(yearsExperience) || 0,
					id_document_url: idFileName,
					license_url: licenseFileName,
					verification_status: "pending",
				});
			if (updateError) throw updateError;

			try {
				await fetch("/api/send-verification-email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						professionalName: profile?.full_name,
						professionType: getProfessionLabel(professionType),
						userId: user.id,
					}),
				});
			} catch (emailErr) {
				console.error("Email notification failed:", emailErr);
			}

			setSuccess("Documents uploaded successfully! Our team will review your verification within 24-48 hours.");
		} catch (err: any) {
			setError(err.message || "Upload failed. Please try again.");
		} finally {
			setUploading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">Loading...</div>
			</div>
		);
	}

	if (profProfile?.verification_status === "pending") {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors duration-300">
				<div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center border border-transparent dark:border-gray-800">
					<div className="text-5xl mb-4">⏳</div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Pending</h2>
					<p className="text-gray-500 dark:text-gray-400 mb-6">
						Your documents have been submitted and are being reviewed by our team. This usually takes 24-48 hours.
					</p>
					<Link href="/dashboard/professional" className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
						Back to Dashboard
					</Link>
				</div>
			</div>
		);
	}

	if (profProfile?.verification_status === "verified") {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors duration-300">
				<div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center border border-transparent dark:border-gray-800">
					<div className="text-5xl mb-4">✅</div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You are Verified!</h2>
					<p className="text-gray-500 dark:text-gray-400 mb-6">
						Your professional credentials have been verified. You can now apply to jobs on SurveyConnectHub.
					</p>
					<Link href="/dashboard/professional" className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors">
						Browse Jobs
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 transition-colors duration-300">
			<div className="max-w-2xl mx-auto">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Survey<span className="text-green-600">ConnectHub</span>
					</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-2">Professional Verification</p>
				</div>

				<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-transparent dark:border-gray-800">
					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-8">
						<h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Why do we verify professionals?</h3>
						<p className="text-sm text-blue-700 dark:text-blue-400">
							Verification builds trust with clients and ensures only qualified professionals work on critical geospatial projects. Verified professionals get more job opportunities.
						</p>
					</div>

					{error && (
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
							{error}
						</div>
					)}
					{success && (
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
							{success}
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Profession Type <span className="text-red-500">*</span>
							</label>
							<select
								value={professionType}
								onChange={(e) => setProfessionType(e.target.value)}
								required
								className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
							>
								<option value="">Select your profession</option>
								<option value="land_surveyor">Land Surveyor</option>
								<option value="gis_analyst">GIS Analyst</option>
								<option value="drone_pilot">Drone/UAV Pilot</option>
								<option value="cartographer">Cartographer</option>
								<option value="photogrammetrist">Photogrammetrist</option>
								<option value="lidar_specialist">LiDAR Specialist</option>
								<option value="remote_sensing_analyst">Remote Sensing Analyst</option>
								<option value="urban_planner">Urban Planner</option>
								<option value="spatial_data_scientist">Spatial Data Scientist</option>
								<option value="hydrographic_surveyor">Hydrographic Surveyor</option>
								<option value="mining_surveyor">Mining Surveyor</option>
								<option value="construction_surveyor">Construction Surveyor</option>
								<option value="environmental_analyst">Environmental Analyst</option>
								<option value="bim_specialist">BIM Specialist</option>
								<option value="other">Other</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								License / Registration Number
							</label>
							<input
								type="text"
								value={licenseNumber}
								onChange={(e) => setLicenseNumber(e.target.value)}
								placeholder="e.g. NIS/2024/12345"
								className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Years of Experience
							</label>
							<input
								type="number"
								value={yearsExperience}
								onChange={(e) => setYearsExperience(e.target.value)}
								placeholder="e.g. 5"
								min="0"
								max="50"
								className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
							/>
						</div>

						{/* Government ID Upload */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Government-Issued ID <span className="text-red-500">*</span>
							</label>
							<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
								Passport, Driver's License, or National ID Card (JPG, PNG or PDF, max 2MB)
							</p>
							<div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
								idFileError
									? "border-red-400 bg-red-50 dark:bg-red-900/20"
									: idFile
									? "border-green-400 bg-green-50 dark:bg-green-900/20"
									: "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
							}`}>
								<input
									type="file"
									accept="image/jpeg,image/png,application/pdf"
									onChange={handleIdFileChange}
									className="hidden"
									id="id-upload"
								/>
								<label htmlFor="id-upload" className="cursor-pointer">
									{idFileError ? (
										<div>
											<div className="text-2xl mb-1">❌</div>
											<p className="text-red-600 dark:text-red-400 font-medium text-sm">{idFileError}</p>
											<p className="text-xs text-red-500 dark:text-red-500 mt-1">Click to choose a different file</p>
										</div>
									) : idFile ? (
										<div>
											<div className="text-2xl mb-1">✅</div>
											<p className="text-green-700 dark:text-green-400 font-medium">{idFile.name}</p>
											<p className="text-xs text-green-600 dark:text-green-500 mt-1">
												{(idFile.size / (1024 * 1024)).toFixed(2)}MB · Click to change
											</p>
										</div>
									) : (
										<div>
											<div className="text-3xl mb-2">🪪</div>
											<p className="text-gray-600 dark:text-gray-400 font-medium">Click to upload ID</p>
											<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG or PDF · Max 2MB</p>
										</div>
									)}
								</label>
							</div>
						</div>

						{/* License Upload */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								Professional License / Certificate <span className="text-red-500">*</span>
							</label>
							<p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
								Your surveying license, GIS certification, or relevant professional certificate (JPG, PNG or PDF, max 2MB)
							</p>
							<div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
								licenseFileError
									? "border-red-400 bg-red-50 dark:bg-red-900/20"
									: licenseFile
									? "border-green-400 bg-green-50 dark:bg-green-900/20"
									: "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
							}`}>
								<input
									type="file"
									accept="image/jpeg,image/png,application/pdf"
									onChange={handleLicenseFileChange}
									className="hidden"
									id="license-upload"
								/>
								<label htmlFor="license-upload" className="cursor-pointer">
									{licenseFileError ? (
										<div>
											<div className="text-2xl mb-1">❌</div>
											<p className="text-red-600 dark:text-red-400 font-medium text-sm">{licenseFileError}</p>
											<p className="text-xs text-red-500 dark:text-red-500 mt-1">Click to choose a different file</p>
										</div>
									) : licenseFile ? (
										<div>
											<div className="text-2xl mb-1">✅</div>
											<p className="text-green-700 dark:text-green-400 font-medium">{licenseFile.name}</p>
											<p className="text-xs text-green-600 dark:text-green-500 mt-1">
												{(licenseFile.size / (1024 * 1024)).toFixed(2)}MB · Click to change
											</p>
										</div>
									) : (
										<div>
											<div className="text-3xl mb-2">📜</div>
											<p className="text-gray-600 dark:text-gray-400 font-medium">Click to upload license</p>
											<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG or PDF · Max 2MB</p>
										</div>
									)}
								</label>
							</div>
						</div>

						<button
							type="submit"
							disabled={uploading || !!idFileError || !!licenseFileError}
							className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
						>
							{uploading ? "Uploading documents..." : "Submit for Verification"}
						</button>
					</form>

					<p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
						<Link href="/dashboard/professional" className="text-green-600 hover:underline">
							← Back to Dashboard
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}