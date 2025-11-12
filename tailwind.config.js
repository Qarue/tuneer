/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#101218',
          light: '#f5f6f9',
        },
      },
      boxShadow: {
        focus: '0 0 0 2px rgba(92, 132, 255, 0.35)',
      },
    },
  },
  plugins: [],
}
