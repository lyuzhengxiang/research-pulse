import cron from 'node-cron';
import { log } from './db.js';
import { pollArxivNewPapers } from './tasks/pollArxiv.js';
import { findGithubRepos } from './tasks/findGithubRepos.js';
import { pollActivePaperMetrics } from './tasks/pollMetrics.js';
import { detectStarSurgeAlerts } from './tasks/detectAlerts.js';
import { computePulseScore } from './tasks/computePulseScore.js';
import { deactivateStalePapers } from './tasks/deactivate.js';

log('boot', 'research-pulse worker starting');

// TLDR generation is on-demand from the web app (Generate Summary button) —
// no cron, to avoid burning OpenAI tokens on papers nobody reads.
cron.schedule('*/30 * * * *', () => void pollArxivNewPapers());
cron.schedule('*/30 * * * *', () => void findGithubRepos());
cron.schedule('*/15 * * * *', () => void pollActivePaperMetrics());
cron.schedule('*/15 * * * *', () => void detectStarSurgeAlerts());
cron.schedule('0 * * * *', () => void computePulseScore());
cron.schedule('0 3 * * *', () => void deactivateStalePapers());

setTimeout(() => void pollArxivNewPapers(), 2_000);
setTimeout(() => void findGithubRepos(), 10_000);
setTimeout(() => void pollActivePaperMetrics(), 20_000);

log('boot', 'all cron schedules registered');
