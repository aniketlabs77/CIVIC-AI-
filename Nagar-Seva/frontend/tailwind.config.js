/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f4f4f6',
        card: '#ffffff',
        accent: {
          DEFAULT: '#7c5cff',
          hover: '#6949f5',
          light: '#f0ecff',
          subtle: '#e4dcff',
          dark: '#5b38f0',
        },
        dark: {
          DEFAULT: '#111827',
          hover: '#030712',
        },
        primary: {
          DEFAULT: '#7c5cff',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c5cff',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        secondary: '#10b981',
        danger: '#ef4444',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card': '0 2px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'float': '0 10px 30px -5px rgba(124, 92, 255, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
