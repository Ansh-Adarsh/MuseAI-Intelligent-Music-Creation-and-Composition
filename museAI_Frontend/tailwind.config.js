/** @type {import('tailwindcss').Config} */
// Light theme. The `studio` scale runs from page background (950) to primary
// text (100) so components can use semantic steps rather than raw colours.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        studio: {
          950: '#f5f6fa', // page background (soft off-white)
          900: '#ffffff', // main panels
          850: '#f2f4f8', // table header / secondary surfaces
          800: '#eef1f6',
          700: '#e6e9f0', // tracks, secondary buttons
          600: '#d9dee8',
          500: '#bcc3d2',
          400: '#7c8599', // muted text
          300: '#5a6378', // secondary text
          200: '#363d50',
          100: '#1c2030', // primary text (charcoal)
        },
        ink: '#1c2030',
        accent: {
          DEFAULT: '#5b4de0', // indigo-violet
          strong: '#4a3cc9',
          soft: '#5b4de014',
        },
        signal: {
          cyan: '#3b7ddd', // soft blue (secondary accent)
          violet: '#7c4ddb',
          rose: '#d6455d',
          green: '#1f9d58',
        },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(28, 32, 48, 0.04), 0 1px 3px rgba(28, 32, 48, 0.05)',
      },
    },
  },
  plugins: [],
};
