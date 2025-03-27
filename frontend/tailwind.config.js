/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(215 20% 65% / 0.1)",
        input: "hsl(215 20% 65% / 0.2)",
        ring: "hsl(215 20% 65% / 0.2)",
        background: "hsl(222.2 84% 4.9%)",
        foreground: "hsl(210 40% 98%)",
        primary: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        secondary: {
          DEFAULT: "hsl(217.2 32.6% 17.5%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsl(222.2 84% 4.9%)",
          foreground: "hsl(210 40% 98%)",
        },
        slate: {
          100: "hsl(210 40% 98%)",
          200: "hsl(214 32% 91%)",
          300: "hsl(213 27% 84%)",
          400: "hsl(215 20% 65%)",
          500: "hsl(215 16% 47%)",
          600: "hsl(215 19% 35%)",
          700: "hsl(215 25% 27%)",
          800: "hsl(217 33% 17%)",
          900: "hsl(222 47% 11%)",
        },
        cyan: {
          400: "hsl(189 94% 43%)",
          500: "hsl(189 94% 43%)",
          600: "hsl(190 90% 40%)",
          700: "hsl(190 90% 35%)",
        },
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "spin-slower": "spin 4s linear infinite",
        "ping-slow": "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
