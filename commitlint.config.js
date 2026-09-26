/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allowed types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new feature
        'fix',      // bug fix
        'chore',    // tooling, deps, config — no production code change
        'docs',     // documentation only
        'style',    // formatting, whitespace — no logic change
        'refactor', // code restructure — no feature/fix
        'perf',     // performance improvement
        'test',     // adding or updating tests
        'build',    // build system or external deps
        'ci',       // CI/CD config
        'revert',   // revert a previous commit
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
  },
}
