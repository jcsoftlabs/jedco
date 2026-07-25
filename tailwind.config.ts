import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "sans-serif"] },
      colors: {
        jedco: { DEFAULT: "#1A4F8A", light: "#2C6FB8", dark: "#0F2F52" },
      },
    },
  },
  plugins: [],
};

export default config;
