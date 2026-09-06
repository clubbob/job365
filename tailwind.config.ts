/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#f4f6fb',
        foreground: '#171717',
        surface: '#ffffff',
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          light: '#dbeafe',
          dark: '#1e3a8a',
        },
        muted: '#525252',
        subtle: '#737373',
        border: '#d4d4d4',
        'border-strong': '#a3a3a3',
        danger: '#dc2626',
        success: '#16a34a',
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 2px 4px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
