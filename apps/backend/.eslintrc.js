module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'plugin:node/recommended'],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        'node/no-missing-import': 'off',
        'node/no-unsupported-features/es-syntax': 'off',
    },
}
