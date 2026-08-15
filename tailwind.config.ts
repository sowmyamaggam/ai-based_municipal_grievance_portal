import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1e27",
        civic: { 50: "#eef9f7", 100: "#d6f1ed", 500: "#087d73", 600: "#06665f", 700: "#07544f" },
        sun: "#f5b642",
      },
      boxShadow: { card: "0 12px 34px rgba(15, 30, 39, .08)" },
    },
  },
  plugins: [],
};

export default config;
