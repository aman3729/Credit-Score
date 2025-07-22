/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        'fade-out': {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        'zoom-in-95': {
          from: { transform: 'scale(0.95)' },
          to: { transform: 'scale(1)' },
        },
        'zoom-out-95': {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(0.95)' },
        },
        'slide-in-from-top-2': {
          from: { transform: 'translateY(-0.5rem)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom-2': {
          from: { transform: 'translateY(0.5rem)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left-2': {
          from: { transform: 'translateX(-0.5rem)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right-2': {
          from: { transform: 'translateX(0.5rem)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideInTop: {
          '0%': { opacity: 0, transform: 'translateY(-16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-in',
        'zoom-in-95': 'zoom-in-95 0.2s ease-out',
        'zoom-out-95': 'zoom-out-95 0.2s ease-in',
        'slide-in-from-top-2': 'slide-in-from-top-2 0.25s ease-out',
        'slide-in-from-bottom-2': 'slide-in-from-bottom-2 0.25s ease-out',
        'slide-in-from-left-2': 'slide-in-from-left-2 0.25s ease-out',
        'slide-in-from-right-2': 'slide-in-from-right-2 0.25s ease-out',
        'fade-in-slow': 'fadeIn 0.8s ease-in',
        'slide-in-top': 'slideInTop 0.3s ease',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
