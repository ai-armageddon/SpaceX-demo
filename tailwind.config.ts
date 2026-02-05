import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        night: '#0b0e12',
        midnight: '#0f141b',
        steel: '#121a24',
        slate: '#1b2634',
        haze: '#9fb3c8',
        neon: '#7dd3fc'
      },
      boxShadow: {
        glow: '0 0 40px rgba(125, 211, 252, 0.2)'
      }
    }
  },
  plugins: []
};

export default config;
