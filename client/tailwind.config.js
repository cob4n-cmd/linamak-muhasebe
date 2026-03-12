/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FFF8F0',
          100: '#FFF0DB',
          200: '#FFE0B2',
          300: '#FFCC80',
          400: '#FBB040',
          500: '#F7941D',
          600: '#E8850A',
          700: '#CC7000',
          800: '#A65900',
          900: '#804500',
        },
        accent: {
          50:  '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#333333',
        },
      },
    },
  },
  plugins: [],
};
