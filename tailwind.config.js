/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1a4267',
                    hover: '#15344f',
                    light: '#e8f0f7',
                    50: '#f0f6fc',
                    100: '#d9eaf5',
                    200: '#b3d4eb',
                    300: '#7db5d8',
                    400: '#4b8fc0',
                    500: '#2d6fa3',
                    600: '#1a4267',
                    700: '#15344f',
                    800: '#10253a',
                    900: '#0a1825',
                },
                danger: {
                    DEFAULT: '#ef4444',
                    hover: '#dc2626',
                    light: '#fef2f2',
                },
                success: {
                    DEFAULT: '#22c55e',
                    hover: '#16a34a',
                    light: '#f0fdf4',
                },
                warning: {
                    DEFAULT: '#f59e0b',
                    light: '#fffbeb',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                'card-hover': '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
                'modal': '0 20px 60px rgba(0,0,0,0.2)',
                'sidebar': '4px 0 15px rgba(26,66,103,0.08)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                'spin-slow': 'spin 1.5s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { transform: 'translateY(16px)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
            },
            screens: {
                'xs': '390px',
            },
        },
    },
    plugins: [],
}
