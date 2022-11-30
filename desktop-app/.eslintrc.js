module.exports = {
  root: true,
  "env": {
    "browser": true,
    "node": true
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
