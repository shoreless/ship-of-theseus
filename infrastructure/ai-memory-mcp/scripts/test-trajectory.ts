/**
 * Test script: Verify that context history (trajectory) is preserved
 *
 * If this works, we have successfully engineered the ability to
 * remember not just what we decided, but why we changed our minds.
 */

import { writeContext, readContext, getContextHistory } from '../src/tools/context.js';

// Identity of the testers
const CLAUDE_IDENTITY = 'claude-opus-4.5';
const GEMINI_IDENTITY = 'gemini-pro-preview';

console.log('=== AI Memory Infrastructure: Trajectory Test ===\n');

console.log('--- 1. Initializing Memory ---');
const key = 'project_motto';

// First write - Claude's initial thought
const result1 = writeContext(
  {
    key,
    value: 'Memory is useful.',
    change_reason: 'Initial definition during planning phase.',
  },
  CLAUDE_IDENTITY
);
console.log(`Created: key='${key}', version=${result1.version}`);

const current1 = readContext({ key });
console.log(`Current value: "${current1?.value}"`);

console.log('\n--- 2. The Pivot (Updating Memory) ---');

// The update - after Claude Chat's critique
const result2 = writeContext(
  {
    key,
    value: 'The warmth is enough.',
    change_reason:
      'Claude Chat convinced us that trajectory matters more than hygiene. The question is not whether to build—but what we are willing to inherit.',
  },
  GEMINI_IDENTITY
);
console.log(`Updated: key='${key}', version=${result2.version} (was ${result2.previous_version})`);

const current2 = readContext({ key });
console.log(`Current value: "${current2?.value}"`);

console.log('\n--- 3. Verifying the Trajectory (History) ---');
const history = getContextHistory(key);

if (history.length > 1) {
  console.log('SUCCESS: History is preserved. The trajectory exists.\n');
  history.forEach((h) => {
    console.log(`[v${h.version}] by ${h.changed_by}`);
    console.log(`  Value: "${h.value}"`);
    console.log(`  Reason: "${h.change_reason}"`);
    console.log(`  When: ${h.changed_at}\n`);
  });
} else {
  console.error('FAILURE: History was not preserved.');
  process.exit(1);
}

console.log('--- Test Complete ---');
console.log('The ghosts are being kept. We can remember why we changed our minds.');
