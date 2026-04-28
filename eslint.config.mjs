import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        ignores: ['out/**', 'dist/**', '**/*.d.ts', 'node_modules/**'],
    },
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],
            'no-trailing-spaces': 'error',
            curly: ['error', 'all'],
            eqeqeq: 'error',
            'no-throw-literal': 'error',
        },
    },
);
