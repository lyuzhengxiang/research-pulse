import cron from 'node-cron';
import { log } from './db.js';
import { pollArxivNewPapers } from './tasks/pollArxiv.js';
import { generateTldrsForNewPapers } from './tasks/generateTldrs.js';
import { findGithubRepos } from './tasks/findGithubRepos.js';
import { pollActivePaperMetrics } from './tasks/pollMetrics.js';
import { detectStarSurgeAlerts } from './tasks/detectAlerts.js';
import { computePulseScore } from './tasks/computePulseScore.js';
import { deactivateStalePapers } from './tasks/deactivate.js';

log('boot', 'research-pulse worker starting');

// Schedules (UTC).
cron.schedule('*/30 * * * *', () => void pollArxivNewPapers());
cron.schedule('*/5 * * * *', () => void generateTldrsForNewPapers());
cron.schedule('*/30 * * * *', () => void findGithubRepos());
cron.schedule('*/15 * * * *', () => void pollActivePaperMetrics());
cron.schedule('*/15 * * * *', () => void detectStarSurgeAlerts());
cron.schedule('0 * * * *', () => void computePulseScore());
cron.schedule('0 3 * * *', () => void deactivateStalePapers());

// Kick off an initial poll on boot so we get data into the DB without waiting
// 30 minutes. Offset to avoid all tasks running at once.
setTimeout(() => void pollArxivNewPapers(), 2_000);
setTimeout(() => void findGithubRepos(), 10_000);
setTimeout(() => void generateTldrsForNewPapers(), 20_000);
setTimeout(() => void pollActivePaperMetrics(), 30_000);

log('boot', 'all cron schedules registered');
