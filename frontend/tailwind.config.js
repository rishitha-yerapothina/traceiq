/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        sidebar: "#0f1117",
        panel:   "#ffffff",
        "panel-dark": "#1a1d27",
      },
      fontSize: {
        "2xs": "0.65rem",
      },
    },
  },
  plugins: [],
}

