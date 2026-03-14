/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Teal Palette - Updated Theme
        // Teal - Main interactive color
        teal: {
          50: '#e6f7f9',
          100: '#cceff3',
          200: '#99dfe7',
          300: '#66cfdb',
          400: '#33bfcf',
          500: '#1f7a8c',  // Primary - main brand color
          600: '#1a6b7a',
          700: '#155c68',
          800: '#104d56',
          900: '#0b3e44',
        },
        // Primary button color
        primary: {
          50: '#e6f7f9',
          100: '#cceff3',
          200: '#99dfe7',
          300: '#66cfdb',
          400: '#33bfcf',
          500: '#1f7a8c',  // Main button color
          600: '#1a6b7a',
          700: '#155c68',
          800: '#104d56',
          900: '#0b3e44',
        },
        // Keep existing nature colors for other elements
        // Fern - Secondary green
        fern: {
          50: '#dce7dc',
          100: '#b9cfb9',
          200: '#96b795',
          300: '#739f72',
          400: '#588157',
          500: '#588157',
          600: '#466645',
          700: '#344c34',
          800: '#233323',
          900: '#111911',
        },
        // Hunter Green - Deep, rich green for emphasis
        hunter: {
          50: '#d3e3d6',
          100: '#a7c7ac',
          200: '#7aaa83',
          300: '#56865f',
          400: '#3a5a40',
          500: '#3a5a40',
          600: '#2e4833',
          700: '#233626',
          800: '#172419',
          900: '#0c120d',
        },
        // Pine Teal - Darker accent
        pine: {
          50: '#d1e0d9',
          100: '#a3c2b3',
          200: '#75a38c',
          300: '#527a66',
          400: '#344e41',
          500: '#344e41',
          600: '#293d33',
          700: '#1f2e26',
          800: '#141f1a',
          900: '#0a0f0d',
        },
        // Dry Sage - Soft, muted green
        sage: {
          50: '#edefe8',
          100: '#dae0d0',
          200: '#c8d0b9',
          300: '#b6c1a2',
          400: '#a3b18a',
          500: '#a3b18a',
          600: '#859865',
          700: '#64724c',
          800: '#434c33',
          900: '#212619',
        },
        // Dust Grey - Neutral backgrounds
        dust: {
          50: '#f8f7f5',
          100: '#f0efeb',
          200: '#e9e7e1',
          300: '#e2dfd7',
          400: '#dad7cd',
          500: '#dad7cd',
          600: '#b6b09c',
          700: '#92896c',
          800: '#615b48',
          900: '#312e24',
        },
        // Semantic Colors (updated to use teal)
        success: '#1f7a8c',  // Teal
        warning: '#a3b18a',  // Sage
        error: '#8b4513',    // Earthy brown
        info: '#1f7a8c',     // Teal
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(31, 122, 140, 0.1), 0 10px 20px -2px rgba(31, 122, 140, 0.05)',
        'soft-lg': '0 10px 40px -10px rgba(31, 122, 140, 0.2)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(31, 122, 140, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #1f7a8c 0%, #155c68 100%)',
        'gradient-teal': 'linear-gradient(135deg, #1f7a8c 0%, #33bfcf 100%)',
        'gradient-fern': 'linear-gradient(135deg, #588157 0%, #3a5a40 100%)',
        'gradient-sage': 'linear-gradient(135deg, #a3b18a 0%, #588157 100%)',
        'gradient-earth': 'linear-gradient(135deg, #f8f7f5 0%, #e9e7e1 100%)',
        'paper-texture': "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" opacity=\"0.05\" /%3E%3C/svg%3E')",
      },
    },
  },
  plugins: [],
}