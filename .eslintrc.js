const fbjs = require('eslint-config-fbjs');

const prettierConfig = require('./.prettierrc.json');

module.exports = {
    parser: '@babel/eslint-parser',
    root: true,
    extends: ['fbjs', 'prettier'],
    plugins: [
        ...fbjs.plugins,
        'prettier',
        '@typescript-eslint',
        'import',
        'promise',
    ],
    rules: {
        // disable rules from eslint-config-fbjs
        'flowtype/define-flow-type': 0,
        'flowtype/use-flow-type': 0,
        'no-new': 0, // new keyword needed e.g. new Notification
        'no-catch-shadow': 0, // only relevant for IE8 and below
        'no-bitwise': 0, // bitwise operations needed in some places
        'consistent-return': 0,
        'no-var': 2,
        'prefer-const': [2, { destructuring: 'all' }],
        'prefer-spread': 1,
        'prefer-rest-params': 1,
        'no-console': 0, // we're setting window.console in App.js
        'no-multi-spaces': 2,
        'prefer-promise-reject-errors': 1,
        'no-throw-literal': 'error',
        'no-extra-boolean-cast': 2,
        'no-extra-semi': 2,
        'no-unsafe-negation': 2,
        'no-useless-computed-key': 2,
        'no-useless-rename': 2,
        'no-restricted-properties': [
            1,
            {
                object: 'electron',
                property: 'remote',
            },
        ],
        'prettier/prettier': [2, prettierConfig],
        'import/no-unresolved': [2, { commonjs: true, amd: true }],

        // promise rules, see https://github.com/xjamundx/eslint-plugin-promise for details on each of them
        'promise/catch-or-return': 'warn',
        'promise/no-nesting': 'warn',
        'promise/no-promise-in-callback': 'warn',
        'promise/no-callback-in-promise': 'warn',
        'promise/no-return-in-finally': 'warn',
        'promise/valid-params': 'error',
    },
    settings: {
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true,
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                project: '.',
            },
        },
    },
    overrides: [
        {
            files: ['*.tsx', '*.ts'],
            parser: '@typescript-eslint/parser',
            rules: {
                'prettier/prettier': [2, { ...prettierConfig, parser: 'typescript' }],
                // following rules are disabled because TS already handles it
                'no-undef': 0,
                'import/no-unresolved': 0,
                // following rules are disabled because they don't handle TS correctly,
                // while their @typescript-eslint counterpart does
                // for reference: https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/README.md#extension-rules
                'no-unused-vars': 0,
                'no-redeclare': 0,
                'no-dupe-class-members': 0,
                '@typescript-eslint/no-redeclare': 1,
                '@typescript-eslint/no-unused-vars': [
                    1,
                    {
                        ignoreRestSiblings: true,
                        varsIgnorePattern: '^_',
                        argsIgnorePattern: '^_',
                        caughtErrorsIgnorePattern: '^_',
                    },
                ],
            },
        },
    ],
};
