/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#0d7ff2",
        "background-light": "#f5f7f8",
        "background-dark": "#101922",
        success: "#22c55e",
        warning: "#f97316",
        alert: "#ef4444",
        "foreground-light": "#1f2937",
        "foreground-dark": "#f9fafb",
        "foreground-muted-light": "#6b7280",
        "foreground-muted-dark": "#9ca3af",
        "subtle-light": "#6b7280",
        "subtle-dark": "#9ca3af",
        "card-light": "#ffffff",
        "card-dark": "#1f2937",
        "surface-light": "#ffffff",
        "surface-dark": "#1c2a38",
        "text-light": "#101922",
        "text-dark": "#f5f7f8",
        "subtle-text-light": "#6b7280",
        "subtle-text-dark": "#9ca3af",
        "border-light": "#e5e7eb",
        "border-dark": "#374151",
        // Mantendo cores originais para compatibilidade
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        sans: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
}
