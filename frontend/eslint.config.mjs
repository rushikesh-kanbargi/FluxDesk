import { dirname } from "path";
import { fileURLToPath } from "url";
import coreWebVitals from "eslint-config-next/core-web-vitals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  ...coreWebVitals,
  {
    rules: {
      // Disabled: rule is overly strict — legitimate patterns like mount flags,
      // resize handlers, and rAF-driven animations require direct setState in effects.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
