const assert = require('assert');
const { getRating } = require('../score.js');

const cases = [
  { score: 105, expected: 'You surpassed the master!' },
  { score: 104, expected: 'Excellent!' },
  { score: 75, expected: 'Excellent!' },
  { score: 74, expected: 'Good!' },
  { score: 35, expected: 'Good!' },
  { score: 34, expected: 'Okay.' },
  { score: 5, expected: 'Okay.' },
  { score: 4, expected: 'At least you tried.' },
  { score: 0, expected: 'At least you tried.' }
];

cases.forEach(({ score, expected }) => {
  assert.strictEqual(
    getRating(score),
    expected,
    `score ${score} should be "${expected}"`
  );
});

console.log('All tests passed!');

