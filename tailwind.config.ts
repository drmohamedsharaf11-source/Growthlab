import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0B0F",
        surface: "#111318",
        surface2: "#181C23",
        surface3: "#1E2330",
        border: "#252B38",
        border2: "#2E3647",
        accent: "#4F6EF7",
        accent2: "#7C3AED",
        green: "#22C55E",
        red: "#EF4444",
        amber: "#F59E0B",
        cyan: "#06B6D4",
        text: "#F1F5F9",
        text2: "#94A3B8",
        text3: "#475569",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      borderRadius: {
        card: "12px",
        element: "8px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
