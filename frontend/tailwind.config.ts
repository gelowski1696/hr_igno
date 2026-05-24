import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        paper: "#FFFFFF",
        field: "#ffffff",
        muted: "#F8FAFC",
        line: "#E2E8F0",
        strongline: "#CBD5E1",
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#2563EB",
          600: "#1E40AF",
          700: "#1E3A8A"
        },
        signal: {
          blue: "#2563EB",
          amber: "#D97706",
          red: "#DC2626",
          green: "#059669"
        }
      },
      boxShadow: {
        overlay: "4px 0 16px rgba(15, 23, 42, 0.10)",
        focus: "0 0 0 2px rgba(30, 64, 175, 0.30)"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        slab: ["Zilla Slab", "Georgia", "serif"],
        mono: ["Fira Code", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
