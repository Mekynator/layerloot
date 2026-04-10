module.exports = {
  // Lightweight override to reduce noise from `any` across the codebase.
  overrides: [
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        // Turn off explicit-any rule for existing codebase to focus on safe autofixes
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
