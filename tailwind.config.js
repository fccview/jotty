/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: 'rgb(var(--background) / <alpha-value>)',
                'background-secondary': 'rgb(var(--background-secondary) / <alpha-value>)',
                foreground: 'rgb(var(--foreground) / <alpha-value>)',
                card: 'rgb(var(--card) / <alpha-value>)',
                'card-foreground': 'rgb(var(--card-foreground) / <alpha-value>)',
                popover: 'rgb(var(--popover) / <alpha-value>)',
                'popover-foreground': 'rgb(var(--popover-foreground) / <alpha-value>)',
                primary: 'rgb(var(--primary) / <alpha-value>)',
                'primary-foreground': 'rgb(var(--primary-foreground) / <alpha-value>)',
                secondary: 'rgb(var(--secondary) / <alpha-value>)',
                'secondary-foreground': 'rgb(var(--secondary-foreground) / <alpha-value>)',
                muted: 'rgb(var(--muted) / <alpha-value>)',
                'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
                accent: 'rgb(var(--accent) / <alpha-value>)',
                'accent-foreground': 'rgb(var(--accent-foreground) / <alpha-value>)',
                destructive: 'rgb(var(--destructive) / <alpha-value>)',
                'destructive-foreground': 'rgb(var(--destructive-foreground) / <alpha-value>)',
                border: 'rgb(var(--border) / <alpha-value>)',
                input: 'rgb(var(--input) / <alpha-value>)',
                ring: 'rgb(var(--ring) / <alpha-value>)',
            },
        },
    },
    plugins: [require('tailwind-scrollbar')],
} 