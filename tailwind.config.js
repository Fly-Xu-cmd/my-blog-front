// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", // 扫描 app 目录下的所有文件
    "./pages/**/*.{js,ts,jsx,tsx}", // 扫描 pages 目录下的所有文件
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
