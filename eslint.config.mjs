import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
            globals: {
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                require: "readonly",
                module: "readonly",
                exports: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": typescript,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...typescript.configs.recommended.rules,
            "no-console": "off",
            // TypeScript handles undefined checks; no-undef produces false positives for TS types
            "no-undef": "off",
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        ignores: ["built/", "node_modules/", "*.js"],
    },
];
