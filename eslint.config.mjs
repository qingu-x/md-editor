import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import pluginVue from "eslint-plugin-vue";

export default tseslint.config(
    { ignores: ["**/dist", "**/node_modules", "**/release", "**/coverage"] },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            ...pluginVue.configs["flat/recommended"],
        ],
        files: ["**/*.{ts,tsx,js,jsx,vue}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: [".vue"],
                sourceType: "module",
            },
        },
        plugins: {
            vue: pluginVue,
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "vue/multi-word-component-names": "off",
        }
    }
);
