/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F1",
        "paper-2": "#F2EEE5",
        ink: "#2A2521",
        "ink-2": "#6B635A",
        accent: "#4A8A95",
        "accent-soft": "#C9DEE2",
        warn: "#D88864",
        "warn-soft": "#F4D9CB",
        ok: "#6B9A6B",
        "ok-soft": "#CCDEC8",
        border: "#D0C8BE",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        component: "6px",
        card: "10px",
      },
    },
  },
  plugins: [],
};
