import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          surface: "#F8FAFC",
          panel: "#FFFFFF",
          ink: "#111827"
        }
      }
    }
  },
  plugins: []
};

export default config;
