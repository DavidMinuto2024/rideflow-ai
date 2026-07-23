import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'rideflow-bg': '#0F1620',
        'rideflow-panel': '#161F2C',
        'rideflow-panel2': '#1B2532',
        'rideflow-border': '#26313F',
        'rideflow-text': '#EAF0F5',
        'rideflow-muted': '#8FA0B3',
        'rideflow-muted2': '#5E7185',
        'rideflow-amber': '#E8A33D',
        'zone-norte': '#4FB6A8',
        'zone-chico': '#E8935C',
        'zone-colina': '#C77DFF',
        'zone-suba': '#7EC8E3',
        'zone-sabana': '#9BC53D',
        'zone-calera': '#F2C94C',
        'zone-centro': '#EF6F6C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
