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
        "black": "#171616ff",
        'black-lighter': '#1f1e1eff',
        "text-light": "#c5c6c7",
        "accent-yellow": "#FFD700",
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
