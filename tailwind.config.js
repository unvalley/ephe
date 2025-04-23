/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#333333",
          50: "#FFFFFF",
          100: "#F5F5F5",
          200: "#E0E0E0",
          300: "#CCCCCC",
          400: "#999999",
          500: "#666666",
          600: "#333333",
          700: "#1F1F1F",
          800: "#111111",
          900: "#000000",
        },
        blue: {
          DEFAULT: "#00A3FF",
          50: "#E6F6FF",
          100: "#CCE9FF",
          200: "#99D3FF",
          300: "#66BDFF",
          400: "#33AEFF",
          500: "#00A3FF",
          600: "#0082CC",
          700: "#006199",
          800: "#004166",
          900: "#002033",
        },
        green: {
          DEFAULT: "#4CAF50",
          50: "#ECFAED",
          100: "#D0F5D2",
          200: "#A1E7A4",
          300: "#73D977",
          400: "#59C95D",
          500: "#4CAF50",
          600: "#3E8F41",
          700: "#2F6F32",
          800: "#204F22",
          900: "#102F13",
        },
        purple: {
          DEFAULT: "#9C27B0",
          50: "#F5E6F9",
          100: "#EBCCF2",
          200: "#D699E6",
          300: "#C266D9",
          400: "#AE33CC",
          500: "#9C27B0",
          600: "#7D1F8D",
          700: "#5E176A",
          800: "#3F1047",
          900: "#1F0823",
        },
      },
      backgroundColor: (theme) => ({
        ...theme("colors"),
      }),
      textColor: (theme) => ({
        ...theme("colors"),
      }),
      borderColor: (theme) => ({
        ...theme("colors"),
      }),
      button: {
        primary: {
          backgroundColor: "#333333",
          textColor: "#FFFFFF",
          hoverBackgroundColor: "#111111",
        },
        secondary: {
          backgroundColor: "#666666",
          textColor: "#FFFFFF",
          hoverBackgroundColor: "#999999",
        },
        tertiary: {
          backgroundColor: "#FFFFFF",
          textColor: "#333333",
          borderColor: "#333333",
          hoverBackgroundColor: "#F5F5F5",
        },
      },
    },
    fontFamily: {
      //   "space-mono": ["var(--font-space-mono)"],
    },
    gridTemplateColumns: {
      24: "repeat(24, minmax(0, 1fr))",
    },
    animation: {
      "fade-in": "fadeIn 0.3s ease-out",
    },
    keyframes: {
      fadeIn: {
        "0%": { opacity: "0", transform: "translate(-50%, 10px) scale(0.95)" },
        "100%": { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
      },
    },
  },
  plugins: [
    // should remove this in v4
    require("@tailwindcss/typography"),
    ({ addComponents, theme }) => {
      const buttons = {
        ".btn-primary": {
          backgroundColor: theme("colors.primary.600"),
          color: theme("colors.neutral.50"),
          "&:hover": {
            backgroundColor: theme("colors.primary.700"),
          },
          "&:focus": {
            boxShadow: `0 0 0 3px ${theme("colors.primary.100")}`,
          },
        },
        ".btn-secondary": {
          backgroundColor: theme("colors.primary.500"),
          color: theme("colors.neutral.50"),
          "&:hover": {
            backgroundColor: theme("colors.primary.400"),
          },
          "&:focus": {
            boxShadow: `0 0 0 3px ${theme("colors.primary.100")}`,
          },
        },
        ".btn-outline": {
          backgroundColor: "transparent",
          color: theme("colors.primary.600"),
          borderWidth: "1px",
          borderColor: theme("colors.primary.600"),
          "&:hover": {
            backgroundColor: theme("colors.primary.50"),
          },
          "&:focus": {
            boxShadow: `0 0 0 3px ${theme("colors.primary.100")}`,
          },
        },
      };
      addComponents(buttons);
    },
  ],
};
