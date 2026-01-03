/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./index.tsx",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // High-contrast gray scale
                gray: {
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF', // Minimum for placeholders - readable
                    500: '#6B7280', // Medium gray - very readable
                    600: '#4B5563', // Dark gray - primary text
                    700: '#374151', // Darker
                    800: '#1F2937', // Almost black
                    900: '#111827', // Black
                },
                primary: {
                    50: '#EFF6FF',
                    100: '#DBEAFE',
                    200: '#BFDBFE',
                    300: '#93C5FD',
                    400: '#60A5FA',
                    500: '#0F5C82', // Main brand color - deep blue
                    600: '#0A3D56', // Darker variant
                    700: '#082F43',
                    800: '#062330',
                    900: '#04171D',
                    950: '#082f49',
                },
                brand: {
                    dark: '#0f172a',
                    accent: '#0f5c82',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                'fade-in': {
                    '0%': {
                        opacity: '0'
                    },
                    '100%': {
                        opacity: '1'
                    },
                },
                'slide-up': {
                    '0%': {
                        transform: 'translateY(10px)',
                        opacity: '0'
                    },
                    '100%': {
                        transform: 'translateY(0)',
                        opacity: '1'
                    },
                },
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}