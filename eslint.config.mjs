import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".netlify/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "coverage/**",
      "build/**",
      "work/**",
      "next-env.d.ts"
    ]
  },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  }
];

export default eslintConfig;
