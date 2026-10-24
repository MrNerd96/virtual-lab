/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    // dark: classes apply inside an element with the "dark" class (used by the quiz, which follows the
    // device setting and has its own light/dark switch)
    darkMode: 'selector',
    theme: {
        extend: {},
    },
    plugins: [],
}
