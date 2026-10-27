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
        "black-lighter2": "#222018",
        "text-light": "#c5c6c7",
        "surface-raised": "#222018",
        "surface-border": "#383328",
        "accent-yellow": "#f4c542",
      },
      backgroundImage: {
        black: "linear-gradient(145deg, #100f0c 0%, #14130f 55%, #0c0b09 100%)",
        "black-lighter":
          "linear-gradient(145deg, #1d1b16 0%, #1a1915 60%, #15140f 100%)",
      },
    },
  },
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "base-100": "#13120f",
          "base-200": "#1a1915",
          "base-300": "#222018",
          "base-content": "#f4f1e8",
          primary: "#f4c542",
          "primary-content": "#1b1607",
          neutral: "#222018",
          "neutral-content": "#f4f1e8",
        },
      },
    ],
  },
  plugins: [require("daisyui")],
} satisfies Config;
