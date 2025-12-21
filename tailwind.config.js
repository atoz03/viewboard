/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "status-not-started": "#A0522D",
        "status-in-progress": "#3B82F6",
        "status-completed": "#10B981",
        "status-archived": "#6B7280",
      },
    },
  },
  plugins: [],
};
