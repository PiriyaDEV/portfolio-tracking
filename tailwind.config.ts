import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        black: "#171616ff",
        "black-lighter": "#1f1e1eff",
        "black-lighter2": "#353434",
        "text-light": "#c5c6c7",
        "accent-yellow": "#FFD700",
      },
      backgroundImage: {
        black: "linear-gradient(160deg, #0f0f0f 0%, #1a1a1a 60%, #0a0a0a 100%)",
        "black-lighter":
          "linear-gradient(160deg, #1a1a1a 0%, #262626 60%, #161616 100%)",
      },
    },
  },
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "base-content": "#fff",
          "neutral-content": "#fff",
        },
      },
    ],
  },
  plugins: [require("daisyui")],
} satisfies Config;
