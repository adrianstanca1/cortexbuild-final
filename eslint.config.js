import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [{
    ignores: ['**/dist/**', '**/node_modules/**', '**/server/dist/**', '**/server/node_modules/**'],
},
js.configs.recommended,
{
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
        parser: typescriptParser,
        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        globals: {
            window: 'readonly',
            document: 'readonly',
            navigator: 'readonly',
            console: 'readonly',
            process: 'readonly',
            __dirname: 'readonly',
            __filename: 'readonly',
            URL: 'readonly',
            setTimeout: 'readonly',
            setInterval: 'readonly',
            clearTimeout: 'readonly',
            clearInterval: 'readonly',
            confirm: 'readonly',
            prompt: 'readonly',
            alert: 'readonly',
            Blob: 'readonly',
            File: 'readonly',
            FileReader: 'readonly',
            FormData: 'readonly',
            localStorage: 'readonly',
            sessionStorage: 'readonly',
            Image: 'readonly',
            Audio: 'readonly',
            WebSocket: 'readonly',
            EventSource: 'readonly',
            indexedDB: 'readonly',
            fetch: 'readonly',
            Request: 'readonly',
            Response: 'readonly',
            Headers: 'readonly',
            AbortController: 'readonly',
            module: 'readonly',
            require: 'readonly',
            exports: 'readonly',
        },
    },
    plugins: {
        react,
        'react-hooks': reactHooks,
        '@typescript-eslint': typescriptEslint,
    },
    rules: {
        ...react.configs.recommended.rules,
        ...typescriptEslint.configs.recommended.rules,
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'no-console': 'off',
        'no-undef': 'off', // Disable as TypeScript handles undefined globals
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
},
];