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
        kim: {
          red: "#e63946",
          gold: "#f4a261",
          dark: "#1a1a2e",
          card: "#16213e",
          border: "#0f3460",
        },
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "Courier New", "monospace"],
      },
      animation: {
        "type-cursor": "blink 1s step-end infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
