/**
 * Manually run a single task, for local debugging.
 *   npm run task:run -- pollArxivNewPapers
 */
import { pollArxivNewPapers } from './tasks/pollArxiv.js';
import { generateTldrsForNewPapers } from './tasks/generateTldrs.js';
import { findGithubRepos } from './tasks/findGithubRepos.js';
import { pollActivePaperMetrics } from './tasks/pollMetrics.js';
import { detectStarSurgeAlerts } from './tasks/detectAlerts.js';
import { computePulseScore } from './tasks/computePulseScore.js';
import { deactivateStalePapers } from './tasks/deactivate.js';

const tasks = {
  pollArxivNewPapers,
  generateTldrsForNewPapers,
  findGithubRepos,
  pollActivePaperMetrics,
  detectStarSurgeAlerts,
  computePulseScore,
  deactivateStalePapers,
} as const;

const name = process.argv[2] as keyof typeof tasks | undefined;
if (!name || !(name in tasks)) {
  console.error('Usage: npm run task:run -- <taskName>');
  console.error('Tasks:', Object.keys(tasks).join(', '));
  process.exit(1);
}

await tasks[name]();
process.exit(0);
