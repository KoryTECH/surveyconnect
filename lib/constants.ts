export const PROFESSION_OPTIONS = [
	"land_surveyor",
	"gis_analyst",
	"drone_pilot",
	"cartographer",
	"photogrammetrist",
	"lidar_specialist",
	"remote_sensing_analyst",
	"urban_planner",
	"spatial_data_scientist",
	"hydrographic_surveyor",
	"mining_surveyor",
	"construction_surveyor",
	"environmental_analyst",
	"bim_specialist",
	"other",
] as const;

export type ProfessionType = (typeof PROFESSION_OPTIONS)[number];

export const PROFESSION_LABELS: Record<string, string> = {
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

export function getProfessionLabel(type: string): string {
	return PROFESSION_LABELS[type] || type;
}

export const SOFTWARE_TOOL_OPTIONS = [
	"ArcGIS Pro",
	"QGIS",
	"ArcGIS Online",
	"Google Earth Engine",
	"GRASS GIS",
	"ENVI",
	"Global Mapper",
	"AutoCAD Civil 3D",
	"Pix4D",
	"Agisoft Metashape",
	"GDAL/OGR",
	"PostGIS",
	"FME",
	"Blender GIS",
	"Other",
] as const;

export const PORTFOLIO_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_PORTFOLIO_IMAGE_SIZE = 5 * 1024 * 1024;

// Tier 1 #3 — Geospatial Profile Schema option lists

export const SURVEY_EQUIPMENT_OPTIONS = [
	"Total Station",
	"GNSS Receiver (RTK)",
	"GNSS Receiver (PPK)",
	"UAV / Drone",
	"LiDAR Scanner",
	"Digital Level",
	"Handheld GNSS",
	"3D Scanner",
	"Camera",
	"Echo Sounder",
	"Other",
] as const;

export const DELIVERY_FORMAT_OPTIONS = [
	"DGN",
	"DWG",
	"DXF",
	"GeoJSON",
	"Shapefile",
	"GeoPackage",
	"GeoTIFF",
	"LAS/LAZ",
	"KML/KMZ",
	"PDF (plan)",
	"PostGIS dump",
	"FGDB",
	"CSV",
	"Other",
] as const;

export const JOB_TYPE_OPTIONS = [
	"Topographic survey",
	"Boundary survey",
	"ALTA/NSPS",
	"Cadastral",
	"Aerial mapping",
	"GIS analysis",
	"Drone mapping",
	"Volumetric calculation",
	"Route survey",
	"Hydrographic survey",
	"Control survey",
	"Construction staking",
	"Photogrammetry",
	"LiDAR scanning",
	"Other",
] as const;

export const ACCREDITATION_KEYS = [
	"SURCON",
	"NIS",
	"FIG",
	"ISPRS",
	"ASPRS",
	"NSCA",
	"FAA",
	"CAA",
	"State license",
] as const;

// Tier 1 #5 — Location-Aware Pricing Model

export const PRICING_MODEL_OPTIONS = [
	"flat",
	"hectare",
	"km",
	"point",
	"polygon",
	"acre",
] as const;

export type PricingModel = (typeof PRICING_MODEL_OPTIONS)[number];

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
	flat: "Flat rate",
	hectare: "Per hectare",
	km: "Per kilometer",
	point: "Per point (stakeout / point cloud)",
	polygon: "Per polygon (cadastral parcel)",
	acre: "Per acre",
};

export const PRICING_UNIT_BY_MODEL: Record<PricingModel, string> = {
	flat: "",
	hectare: "hectare",
	km: "km",
	point: "point",
	polygon: "polygon",
	acre: "acre",
};

export const ACCURACY_CLASS_OPTIONS = [
	"control",
	"secondary",
	"tertiary",
	"reconnaissance",
	"sub-meter",
	"cm-level",
	"mm-level",
] as const;

export function computeJobBudget(
	pricingModel: PricingModel,
	unitRate: number,
	quantity: number,
	mobilizationFee: number = 0,
): number {
	if (!Number.isFinite(unitRate) || !Number.isFinite(quantity)) return 0;
	if (pricingModel === "flat") return unitRate;
	return Number((unitRate * quantity + (Number.isFinite(mobilizationFee) ? mobilizationFee : 0)).toFixed(2));
}

// Allowed attachment types when a professional applies to a job.
// Two tiers: small docs/images (5MB) and larger geospatial datasets (100MB).
export const APPLY_ATTACHMENT_DOCUMENT_TYPES = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"image/png",
	"image/jpeg",
	"image/webp",
] as const;

export const APPLY_ATTACHMENT_DOCUMENT_EXTENSIONS = [
	"pdf",
	"docx",
	"png",
	"jpg",
	"jpeg",
	"webp",
] as const;

export const MAX_APPLY_ATTACHMENT_DOCUMENT_SIZE = 5 * 1024 * 1024;

export const APPLY_ATTACHMENT_GEODATA_TYPES = [
	"application/geo+json",
	"application/vnd.geo+json",
	"application/json",
	"application/vnd.google-earth.kml+xml",
	"application/vnd.google-earth.kmz",
	"application/zip",
	"application/x-zip-compressed",
	"image/tiff",
	"application/geotiff",
	"application/x-geotiff",
] as const;

export const APPLY_ATTACHMENT_GEODATA_EXTENSIONS = [
	"geojson",
	"json",
	"kml",
	"kmz",
	"shp",
	"shx",
	"dbf",
	"prj",
	"cpg",
	"zip",
	"tif",
	"tiff",
	"geotiff",
	"laz",
	"las",
] as const;

export const MAX_APPLY_ATTACHMENT_GEODATA_SIZE = 100 * 1024 * 1024;

export function applyAttachmentKind(file: File):
	| "document"
	| "geodata"
	| "unknown" {
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	const docTypeMatch = (APPLY_ATTACHMENT_DOCUMENT_TYPES as readonly string[]).includes(
		file.type,
	);
	const docExtMatch = (
		APPLY_ATTACHMENT_DOCUMENT_EXTENSIONS as readonly string[]
	).includes(ext);
	if (docTypeMatch || docExtMatch) return "document";

	const geoTypeMatch = (APPLY_ATTACHMENT_GEODATA_TYPES as readonly string[]).includes(
		file.type,
	);
	const geoExtMatch = (
		APPLY_ATTACHMENT_GEODATA_EXTENSIONS as readonly string[]
	).includes(ext);
	if (geoTypeMatch || geoExtMatch) return "geodata";

	return "unknown";
}

export function applyAttachmentError(file: File): string | null {
	const kind = applyAttachmentKind(file);
	if (kind === "unknown") {
		return "Unsupported file type. Allowed: PDF, DOCX, PNG, JPG, WEBP, GeoJSON, KML, KMZ, Shapefile (zip), GeoTIFF, LAS/LAZ.";
	}
	if (kind === "document" && file.size > MAX_APPLY_ATTACHMENT_DOCUMENT_SIZE) {
		return "Documents and images must be under 5MB.";
	}
	if (kind === "geodata" && file.size > MAX_APPLY_ATTACHMENT_GEODATA_SIZE) {
		return "Geospatial datasets must be under 100MB.";
	}
	return null;
}
