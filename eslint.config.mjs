import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([{
    extends: [...nextCoreWebVitals],

    rules: {
        "@next/next/no-img-element": "off",
        "react-hooks/exhaustive-deps": "off",
        "react-hooks/set-state-in-effect": "off",
        "react-hooks/purity": "off",
        "react-hooks/refs": "off",
        "react-hooks/preserve-manual-memoization": "off",
        "react-hooks/immutability": "off",
        "react-hooks/set-state-in-render": "off",
        "react-hooks/use-memo": "off",
        "@next/next/no-html-link-for-pages": "off",
    },
}]);