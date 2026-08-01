import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				ink: {
					"050": "#F6F9FB",
					"100": "#EEF3F7",
					"200": "#DCE5EC",
					"300": "#B4C6D4",
					"400": "#7E9AB0",
					"500": "#547892",
					"600": "#34526E",
					"700": "#1F3A54",
					"800": "#14293D",
					"900": "#262C55",
				},
				brand: {
					"400": "#4E96B5",
					"500": "#22759A",
					"600": "#1A5C78",
					"700": "#124559",
					accent: "#1E28FB",
				},
				geo: {
					"050": "#EEF5F0",
					"200": "#CFE0D6",
					"500": "#5C9376",
					"600": "#45785F",
					"700": "#094C00",
					accent: "#09FF39",
				},
				earth: {
					"050": "#F7F1E6",
					"200": "#E9DCC8",
					"500": "#B08A5E",
					"700": "#7A5A3A",
				},
				amber: {
					"050": "#FBF1DE",
					"500": "#D08A2E",
				},
				red: {
					"050": "#F8E5E2",
					"500": "#B8443A",
				},
				paper: "#FBFCFD",
			},
			fontFamily: {
				sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
				mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
			},
			borderRadius: {
				xs: "4px",
				sm: "6px",
				md: "8px",
				lg: "12px",
				xl: "16px",
			},
			boxShadow: {
				"design-xs": "0 1px 0 rgba(11,27,43,0.04)",
				"design-sm": "0 1px 2px rgba(11,27,43,0.06), 0 1px 1px rgba(11,27,43,0.04)",
				"design-md": "0 4px 12px rgba(11,27,43,0.06), 0 1px 2px rgba(11,27,43,0.04)",
				"design-lg": "0 12px 32px rgba(11,27,43,0.08), 0 2px 6px rgba(11,27,43,0.05)",
			},
		},
	},
	plugins: [],
};
export default config;