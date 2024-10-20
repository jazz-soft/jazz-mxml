import globals from "globals";
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        ignores: ["**/.instrumented/*"]
    },
    {
        languageOptions: {
            ecmaVersion: 2015,
            globals: {
                ...globals.node
            }
        },
        rules: {
            "no-unused-vars": ["error", { caughtErrors: "none"}]
        }
    },
    {
        files: ["test/*.js"],
        languageOptions: {
            globals: {
                describe: "readonly",
                it: "readonly",
                before: "readonly",
                after: "readonly"
            }
        }
    }
];