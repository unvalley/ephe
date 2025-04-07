/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
        extend: {
          colors: {
            primary: {
              DEFAULT: '#FF3C00',
              50: '#FFECE6',
              100: '#FFD6CC',
              200: '#FFAD99',
              300: '#FF8A65',
              400: '#FF6E40',
              500: '#FF3C00',
              600: '#E83600',
              700: '#CC2F00',
              800: '#A62600',
              900: '#7F1E00',
            },
            mono: {
              DEFAULT: '#090909',
              50: '#FFFFFF',
              100: '#EEEEEE',
              200: '#CCCCCC',
              300: '#999999',
              400: '#666666',
              500: '#333333',
              600: '#1F1F1F',
              700: '#111111',
              800: '#090909',
              900: '#050505',
            },
            blue: {
              DEFAULT: '#00A3FF',
              50: '#E6F6FF',
              100: '#CCE9FF',
              200: '#99D3FF',
              300: '#66BDFF',
              400: '#33AEFF',
              500: '#00A3FF',
              600: '#0082CC',
              700: '#006199',
              800: '#004166',
              900: '#002033',
            },
            green: {
              DEFAULT: '#4CAF50',
              50: '#ECFAED',
              100: '#D0F5D2',
              200: '#A1E7A4',
              300: '#73D977',
              400: '#59C95D',
              500: '#4CAF50',
              600: '#3E8F41',
              700: '#2F6F32',
              800: '#204F22',
              900: '#102F13',
            },
            purple: {
              DEFAULT: '#9C27B0',
              50: '#F5E6F9',
              100: '#EBCCF2',
              200: '#D699E6',
              300: '#C266D9',
              400: '#AE33CC',
              500: '#9C27B0',
              600: '#7D1F8D',
              700: '#5E176A',
              800: '#3F1047',
              900: '#1F0823',
            },
          },
          backgroundColor: theme => ({
            ...theme('colors'),
          }),
          textColor: theme => ({
            ...theme('colors'),
          }),
          borderColor: theme => ({
            ...theme('colors'),
          }),
          button: {
            primary: {
              backgroundColor: '#FF3C00',
              textColor: '#FFFFFF',
              hoverBackgroundColor: '#E83600',
            },
            secondary: {
              backgroundColor: '#FF6E40',
              textColor: '#FFFFFF',
              hoverBackgroundColor: '#FF8A65',
            },
            tertiary: {
              backgroundColor: '#FFFFFF',
              textColor: '#FF3C00',
              borderColor: '#FF3C00',
              hoverBackgroundColor: '#FFECE6',
            },
          },
        },
      fontFamily: {
        "space-mono": ["var(--font-space-mono)"],
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
    ({ addComponents, theme }) => {
      const buttons = {
        '.btn-primary': {
          backgroundColor: theme('colors.primary.500'),
          color: theme('colors.neutral.50'),
          '&:hover': {
            backgroundColor: theme('colors.primary.600'),
          },
          '&:focus': {
            boxShadow: `0 0 0 3px ${theme('colors.primary.100')}`,
          },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.primary.400'),
          color: theme('colors.neutral.50'),
          '&:hover': {
            backgroundColor: theme('colors.primary.300'),
          },
          '&:focus': {
            boxShadow: `0 0 0 3px ${theme('colors.primary.100')}`,
          },
        },
        '.btn-outline': {
          backgroundColor: 'transparent',
          color: theme('colors.primary.500'),
          borderWidth: '1px',
          borderColor: theme('colors.primary.500'),
          '&:hover': {
            backgroundColor: theme('colors.primary.50'),
          },
          '&:focus': {
            boxShadow: `0 0 0 3px ${theme('colors.primary.100')}`,
          },
        },
      }
      addComponents(buttons)
    }
  ],
};
