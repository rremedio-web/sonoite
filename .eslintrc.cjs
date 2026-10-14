module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'plugin:@wordpress/recommended',
        'plugin:security/recommended',
        'plugin:jsx-a11y/recommended'
    ],
    plugins: [
        '@wordpress',
        'security',
        'jsx-a11y'
    ],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: false
        }
    },
    globals: {
        wp: 'readonly',
        jQuery: 'readonly',
        THREE: 'readonly',
        sonoiteData: 'readonly',
        sonoiteSecurityConfig: 'readonly'
    },
    rules: {
        // Security Rules (Non-negotiable)
        'security/detect-eval-with-expression': 'error',
        'security/detect-non-literal-fs-filename': 'error',
        'security/detect-unsafe-regex': 'error',
        'security/detect-buffer-noassert': 'error',
        'security/detect-child-process': 'error',
        'security/detect-disable-mustache-escape': 'error',
        'security/detect-object-injection': 'error',
        'security/detect-new-buffer': 'error',
        'security/detect-no-csrf-before-method-override': 'error',

        // WordPress Specific
        '@wordpress/no-unused-vars-before-return': 'error',
        '@wordpress/valid-sprintf': 'error',
        '@wordpress/no-base-control-with-label-without-id': 'error',
        '@wordpress/i18n-text-domain': ['error', {
            allowedTextDomain: 'sonoite-theme'
        }],
        '@wordpress/i18n-translator-comments': 'warn',

        // Accessibility Rules
        'jsx-a11y/alt-text': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-proptypes': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/click-events-have-key-events': 'error',
        'jsx-a11y/heading-has-content': 'error',
        'jsx-a11y/lang': 'error',
        'jsx-a11y/no-access-key': 'error',

        // Code Quality
        'no-console': ['warn', {
            allow: ['warn', 'error', 'info']
        }],
        'prettier/prettier': 'off',
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        'no-self-compare': 'error',
        'no-sequences': 'error',
        'no-throw-literal': 'error',
        'no-void': 'error',
        'no-with': 'error',

        // Three.js Specific Rules
        'no-unused-vars': ['error', {
            varsIgnorePattern: '^(THREE|scene|camera|renderer)'
        }],

        // Modern JavaScript
        'prefer-const': 'error',
        'prefer-arrow-callback': 'error',
        'prefer-template': 'error',
        'no-var': 'error',

        // Error Prevention
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'brace-style': ['error', '1tbs'],
        'comma-dangle': ['error', 'never'],
        'indent': ['error', 4, {
            SwitchCase: 1,
            MemberExpression: 1
        }],
        'quotes': ['error', 'single', {
            avoidEscape: true,
            allowTemplateLiterals: true
        }],
        'semi': ['error', 'always']
    },
    overrides: [
        {
            files: ['**/*.test.js', '**/*.spec.js'],
            env: {
                jest: true
            },
            rules: {
                'no-console': 'off'
            }
        },
        {
            files: ['src/js/modules/consciousness/**/*.js'],
            rules: {
                'max-lines': ['warn', 300]
            }
        }
    ],
    settings: {
        'jsx-a11y': {
            components: {
                Button: 'button',
                Link: 'a'
            }
        }
    }
};
