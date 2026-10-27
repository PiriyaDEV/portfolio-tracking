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
        black: "#11100e",
        "black-lighter": "#1a1915",
        "black-lighter2": "#29271f",
        "text-light": "#c5c6c7",
        "surface-raised": "#211f1a",
        "surface-border": "#383328",
        "accent-yellow": "#f4c542",
      },
      backgroundImage: {
        black: "linear-gradient(145deg, #11100e 0%, #15130f 55%, #0d0c0a 100%)",
        "black-lighter":
          "linear-gradient(145deg, #211f1a 0%, #1a1915 60%, #15130f 100%)",
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
