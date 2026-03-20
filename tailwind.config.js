/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', 
        secondary: '#64748b', 
        accent: '#10b981', 
        background: '#f8fafc', 
        surface: '#ffffff', 
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        danger: '#ef4444'
      }
    },
  },
  plugins: [],
}
