/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("tailwindcss-animate")],
  theme: {
    extend: {
      fontFamily: {
        "space-mono": ["var(--font-space-mono)"],
        "fira-code": ["var(--font-fira-code)"],
        "courier-prime": ["var(--font-courier-prime)"],
      },
    },
  },
};
