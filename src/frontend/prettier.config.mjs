/** @type {import('prettier').Config} */
export default {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: "es5",
  bracketSpacing: true,
  jsxBracketSameLine: false,
  bracketSameLine: false,
  arrowParens: "avoid",
  proseWrap: "always",
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
};
