module.exports = {
  root: true,
  "env": {
    "browser": true,
    "node": true
  },
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2015,
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "ignorePatterns": [],
  "settings": {
    "react": {
      "pragma": "React",
      "version": "detect"
    }
  }
};
