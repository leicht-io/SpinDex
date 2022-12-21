'use strict';

module.exports = {
  root: true,
  "env": {
    "browser": true,
    "node": true
  },
  "extends": [
    "plugin:react/recommended",
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:security/recommended"
  ],
  "ignorePatterns": [],
  parser: '@typescript-eslint/parser',
  "parserOptions": {
    "project": "tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint",
    "prefer-arrow",
    "jsdoc",
    "react-hooks",
    "security",
    "strict-nullable-numbers"
  ],
  "rules": {
    "strict-nullable-numbers/strict-nullable-numbers": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "off", // TODO: Should be enabled
    "@typescript-eslint/array-type": [
      "error",
      {
        "default": "array"
      }
    ],
    "@typescript-eslint/ban-types": [
      "error",
      {
        "types": {
          "Object": {
            "message": "Avoid using the `Object` type. Did you mean `object`?"
          },
          "Function": {
            "message": "Avoid using the `Function` type. Prefer a specific function type, like `() => void`, or use `ts.AnyFunction`."
          },
          "Boolean": {
            "message": "Avoid using the `Boolean` type. Did you mean `boolean`?"
          },
          "Number": {
            "message": "Avoid using the `Number` type. Did you mean `number`?"
          },
          "String": {
            "message": "Avoid using the `String` type. Did you mean `string`?"
          }
        }
      }
    ],
    "@typescript-eslint/consistent-type-definitions": "error",
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        "multiline": {
          "delimiter": "semi",
          "requireLast": true
        },
        "singleline": {
          "delimiter": "semi",
          "requireLast": false
        }
      }
    ],
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/member-ordering": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "no-extra-boolean-cast": "warn",
    "@typescript-eslint/no-parameter-properties": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/prefer-for-of": "off",
    "@typescript-eslint/prefer-function-type": "error",
    "react/display-name": "off",
    'react/jsx-boolean-value': ['error', 'always'],
    "react/jsx-max-props-per-line": [1, { "maximum": 1, "when": "always" }], // Added by CLE, 08-07-2020
    "react/jsx-curly-spacing": ["error", "always"], // Added by CLE, 08-07-2020
    "react/jsx-indent": ["error", 2], // Added by CLE, 08-07-2020
    "object-curly-spacing": ["error", "always"], // Added by CLE, 08-07-2020
    "template-curly-spacing": ["error", "always"], // Added by CLE, 08-07-2020

    "react/prop-types": "off",
    "react/no-unescaped-entities": "warn",
    "@typescript-eslint/quotes": [
      "error",
      "single"
    ],
    "@typescript-eslint/semi": [
      "error",
      "always"
    ],
    "@typescript-eslint/triple-slash-reference": [
      "error",
      {
        "path": "always",
        "types": "prefer-import",
        "lib": "always"
      }
    ],
    "@typescript-eslint/unified-signatures": "error",
    "brace-style": [
      "error",
      "1tbs"
    ],
    "camelcase": "warn",
    "comma-dangle": "off",
    "complexity": "off",
    "constructor-super": "error",
    "curly": [
      "error",
      "multi-line"
    ],
    "dot-notation": "error",
    "eqeqeq": [
      "error",
      "always"
    ],
    "guard-for-in": "off",
    "id-blacklist": [
      "error",
      "any",
      "Number",
      "number",
      "String",
      "string",
      "Boolean",
      "boolean",
      //"Undefined",
      //"undefined"
    ],
    "id-match": "error",
    "jsdoc/check-alignment": "error",
    "jsdoc/check-indentation": "error",
    "jsdoc/newline-after-description": "error",
    "linebreak-style": [
      "off",
      "windows"
    ],
    "max-classes-per-file": [
      "error",
      1
    ],
    "max-len": "off",
    "new-parens": "error",
    "no-bitwise": "off",
    "no-caller": "error",
    "no-cond-assign": "error",
    "no-console": "error",
    "no-debugger": "error",
    "no-empty": "error",
    "no-eval": "error",
    "no-fallthrough": "error",
    "no-invalid-this": "off",
    "no-new-wrappers": "error",
    "no-null/no-null": "off",
    "no-shadow": [
      "off",
      {
        "hoist": "all"
      }
    ],
    "no-throw-literal": "error",
    "no-trailing-spaces": "error",
    "no-undef-init": "error",
    "no-underscore-dangle": "error",
    "no-unsafe-finally": "error",
    "no-unused-expressions": "error",
    "no-unused-labels": "error",
    "object-shorthand": "off",
    "no-multi-spaces": "error",
    "no-multiple-empty-lines": ["error", {
      "max": 1
    }],
    "one-var": [
      "error",
      "never"
    ],
    "prefer-arrow/prefer-arrow-functions": "error",
    "radix": "off",
    "space-in-parens": [
      "error",
      "never"
    ],
    "spaced-comment": [
      "error",
      "always",
      {
        "markers": [
          "/"
        ]
      }
    ],
    "use-isnan": "error",
    "valid-typeof": "off",
    "@typescript-eslint/no-unsafe-member-access": [
      "warn" // TODO: Should be error in the future
    ],
    "@typescript-eslint/no-unsafe-argument": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
    "@typescript-eslint/await-thenable": [
      "error"
    ],
    "@typescript-eslint/no-for-in-array": [
      "error"
    ],
    "@typescript-eslint/no-unnecessary-type-assertion": [
      "error"
    ],
    "@typescript-eslint/prefer-includes": [
      "error"
    ],
    "@typescript-eslint/prefer-regexp-exec": [
      "error"
    ],
    "@typescript-eslint/prefer-string-starts-ends-with": [
      "error"
    ],
    "require-await": [
      "warn"
    ],
    "@typescript-eslint/require-await": [
      "warn"
    ],
    "@typescript-eslint/unbound-method": [
      "off"
    ],
    "no-var": [
      "error"
    ],
    "prefer-const": [
      "error"
    ],
    "prefer-rest-params": [
      "error"
    ],
    "prefer-spread": [
      "error"
    ],
    "@typescript-eslint/no-floating-promises": [
      "warn" // TODO: should be error
    ],
    "@typescript-eslint/no-unsafe-assignment": [
      "warn" // TODO: Should be error
    ],
    "@typescript-eslint/restrict-template-expressions": [
      "warn" // TODO: Should be error
    ],
    "@typescript-eslint/adjacent-overload-signatures": [
      "error"
    ],
    "@typescript-eslint/consistent-type-assertions": [
      "error"
    ],
    "@typescript-eslint/no-unsafe-return": [
      "warn" // TODO: should be error
    ],
    "@typescript-eslint/restrict-plus-operands": [
      "warn" // TODO: should be error
    ],
    "@typescript-eslint/no-unsafe-call": [
      "warn" //TODO: should be error
    ],
    "@typescript-eslint/explicit-function-return-type": [
      "off"
    ],
    "no-array-constructor": [
      "off"
    ],
    "@typescript-eslint/no-array-constructor": [
      "error"
    ],
    "no-empty-function": [
      "off"
    ],
    "@typescript-eslint/no-empty-function": [
      "error"
    ],
    "@typescript-eslint/no-empty-interface": [
      "error"
    ],
    "@typescript-eslint/no-misused-new": [
      "error"
    ],
    "@typescript-eslint/no-namespace": [
      "error"
    ],
    "@typescript-eslint/no-non-null-assertion": [
      "warn"
    ],
    "@typescript-eslint/no-this-alias": [
      "error"
    ],
    "no-unused-vars": [
      "off"
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn"
    ],
    "no-use-before-define": [
      "off"
    ],
    "@typescript-eslint/no-var-requires": [
      "error"
    ],
    "@typescript-eslint/prefer-namespace-keyword": [
      "error"
    ],
    "@typescript-eslint/type-annotation-spacing": [
      "error"
    ],
    "react/jsx-tag-spacing": ["error", {
      "closingSlash": "never",
      "beforeSelfClosing": "always",
      "afterOpening": "never",
      "beforeClosing": "never"
    }],
  },
  "settings": {
    "react": {
      "pragma": "React",  // Pragma to use, default to "React"
      "version": "detect", // React version. "detect" automatically picks the version you have installed.
    },
  }
};
