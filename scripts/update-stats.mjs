#!/usr/bin/env node
// Fetch aggregate contribution data only. Never request repository names or code.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const username = process.env.PROFILE_USERNAME || 'smahmed776';
if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new Error('Invalid GitHub username');
const query = `query ProfileActivity($login: String!) {
  user(login: $login) {
    contributionsCollection {
      startedAt endedAt
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
  }
}`;
const response = JSON.parse(execFileSync(process.env.GH_BIN || 'gh', ['api', 'graphql', '--input', '-'], {
  input: JSON.stringify({ query, variables: { login: username } }),
  encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
  stdio: ['pipe', 'pipe', 'pipe'],
}));
if (response.errors?.length || !response.data?.user) throw new Error('GitHub did not return complete activity data; previous cards were preserved.');
const data = response.data.user.contributionsCollection;
const weeks = data.contributionCalendar.weeks;
const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const days = weeks.flatMap(week => week.contributionDays);
const integer = value => { if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid contribution count'); return value; };
for (const day of days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isInteger(day.weekday) || day.weekday < 0 || day.weekday > 6 || !levels.includes(day.contributionLevel)) throw new Error('Invalid calendar data');
  integer(day.contributionCount);
}
if (!weeks.length || weeks.length > 54) throw new Error('Unexpected calendar range');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const num = value => integer(value).toLocaleString('en-GB');
const stamp = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(new Date());
const palettes = {
  dark: { bg: '#0d1117', fg: '#f0f6fc', muted: '#a6b1bf', border: '#303b36', accent: '#a7f3d0', cells: ['#1c242b', '#244c3c', '#37795a', '#5ab985', '#a7f3d0'] },
  light: { bg: '#ffffff', fg: '#172b23', muted: '#53645b', border: '#d5e3db', accent: '#176849', cells: ['#edf2ee', '#c5e5d0', '#84c69f', '#399665', '#176849'] },
};
const svg = (p, height, title, description, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(title)}</title><desc id="desc">${escape(description)}</desc><rect x=".5" y=".5" width="959" height="${height - 1}" rx="16" fill="${p.bg}" stroke="${p.border}"/><g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif">${body}</g></svg>\n`;
// Derive useful metrics from the same calendar, including anonymised activity.
// A missing private commit/PR breakdown must never look like zero experience.
const months = new Map();
let run = 0, longestRun = 0, previousDate;
for (const day of days) {
  const date = new Date(`${day.date}T00:00:00Z`).getTime();
  if (previousDate !== undefined && date - previousDate !== 86400000) run = 0;
  run = day.contributionCount > 0 ? run + 1 : 0;
  longestRun = Math.max(longestRun, run);
  previousDate = date;
  const month = day.date.slice(0, 7);
  months.set(month, (months.get(month) || 0) + day.contributionCount);
}
const stats = [
  ['Contributions', integer(data.contributionCalendar.totalContributions)],
  ['Active days', days.filter(day => day.contributionCount > 0).length],
  ['Active weeks', weeks.filter(week => week.contributionDays.some(day => day.contributionCount > 0)).length],
  ['Longest run · days', longestRun],
  ['Busiest day · contributions', Math.max(...days.map(day => day.contributionCount))],
  ['Busiest month · contributions', Math.max(...months.values())],
];
const assets = fileURLToPath(new URL('../assets/', import.meta.url));
mkdirSync(assets, { recursive: true });
const output = [];
for (const [theme, p] of Object.entries(palettes)) {
  const cells = stats.map(([label, value], index) => {
    const x = 32 + (index % 3) * 310;
    const y = 123 + Math.floor(index / 3) * 102;
    return `<text x="${x}" y="${y}" fill="${p.fg}" font-size="40" font-weight="700" letter-spacing="-1">${num(value)}</text><text x="${x}" y="${y + 28}" fill="${p.muted}" font-size="17">${escape(label)}</text>`;
  }).join('');
  const body = `<text x="32" y="37" fill="${p.accent}" font-size="16" font-weight="700" letter-spacing="1.6">GITHUB / LAST 12 MONTHS</text><text x="928" y="37" text-anchor="end" fill="${p.muted}" font-size="14">Updated ${escape(stamp)}</text><path d="M32 61h896" stroke="${p.border}"/>${cells}<text x="32" y="301" fill="${p.muted}" font-size="14">Calendar-based activity, including anonymous private counts when GitHub exposes them.</text>`;
  output.push([`github-stats-${theme}.svg`, svg(p, 326, `${username}: GitHub activity`, stats.map(([label, value]) => `${label}: ${value}`).join('. ') + '. ' + stamp, body)]);

  const pitch = 16, gridX = 65, gridY = 89;
  let previousMonth = '';
  let monthLabels = '';
  const calendar = weeks.map((week, index) => {
    const monthDay = week.contributionDays.find(day => day.date.endsWith('-01'));
    const start = week.contributionDays[0];
    const labelDay = monthDay || (index === 0 ? start : null);
    if (labelDay && index < weeks.length - 2) {
      const key = labelDay.date.slice(0, 7);
      if (key !== previousMonth) {
        const label = new Date(`${labelDay.date}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
        monthLabels += `<text x="${gridX + index * pitch}" y="76" fill="${p.muted}" font-size="12">${label}</text>`;
        previousMonth = key;
      }
    }
    return week.contributionDays.map(day => `<rect x="${gridX + index * pitch}" y="${gridY + day.weekday * pitch}" width="12" height="12" rx="3" fill="${p.cells[levels.indexOf(day.contributionLevel)]}"><title>${day.date}: ${integer(day.contributionCount)} contributions</title></rect>`).join('');
  }).join('');
  const labels = [1, 3, 5].map((weekday, i) => `<text x="24" y="${gridY + weekday * pitch + 10}" fill="${p.muted}" font-size="12">${['Mon', 'Wed', 'Fri'][i]}</text>`).join('');
  const legend = p.cells.map((fill, i) => `<rect x="${810 + i * 16}" y="220" width="12" height="12" rx="3" fill="${fill}"/>`).join('');
  const calendarBody = `<text x="32" y="37" fill="${p.accent}" font-size="16" font-weight="700" letter-spacing="1.6">A YEAR OF BUILDING</text><text x="928" y="37" text-anchor="end" fill="${p.muted}" font-size="14">${num(data.contributionCalendar.totalContributions)} contributions</text>${monthLabels}${labels}${calendar}<text x="32" y="231" fill="${p.muted}" font-size="13">${escape(data.startedAt.slice(0, 10))} — ${escape(data.endedAt.slice(0, 10))} · UTC calendar</text><text x="772" y="231" fill="${p.muted}" font-size="12">Less</text>${legend}<text x="904" y="231" fill="${p.muted}" font-size="12">More</text>`;
  output.push([`activity-${theme}.svg`, svg(p, 254, `${username}: contribution calendar`, 'One cell per day, grouped by week. Colour indicates contribution intensity. Counts follow GitHub contribution rules.', calendarBody)]);
}
// Build all cards successfully before replacing any existing asset.
for (const [filename, content] of output) writeFileSync(new URL(filename, new URL('../assets/', import.meta.url)), content);
console.log(`Updated ${output.length} aggregate activity cards for ${username}. No repository names or code were requested or saved.`);
