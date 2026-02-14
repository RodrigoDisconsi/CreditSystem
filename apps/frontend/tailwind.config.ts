import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        status: {
          pending: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#92400e' },
          under_review: { light: '#dbeafe', DEFAULT: '#3b82f6', dark: '#1e40af' },
          approved: { light: '#d1fae5', DEFAULT: '#10b981', dark: '#065f46' },
          rejected: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#991b1b' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
