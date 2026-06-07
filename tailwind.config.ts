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
        surface: "#f8faf9",
        ink: "#17201c",
        muted: "#66736d",
        line: "#d8e0dc",
        accent: "#0f766e",
        warn: "#b45309",
        danger: "#b91c1c"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(23, 32, 28, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
