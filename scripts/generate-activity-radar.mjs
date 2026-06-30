#!/usr/bin/env node

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const username = process.env.GITHUB_USERNAME || "mastervondoom";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

const query = `
  query ($login: String!) {
    user(login: $login) {
      name
      contributionsCollection {
        contributionActivityOverview {
          commitCount
          issueCount
          pullRequestCount
          pullRequestReviewCount
        }
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query, variables: { login: username } }),
});

if (!response.ok) {
  throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(payload.errors.map((e) => e.message).join("; "));
}

const overview =
  payload.data?.user?.contributionsCollection?.contributionActivityOverview;

if (!overview) {
  throw new Error("No contribution activity overview returned");
}

const metrics = [
  { label: "Commits", count: overview.commitCount ?? 0, angle: 180 },
  { label: "Pull requests", count: overview.pullRequestCount ?? 0, angle: 90 },
  { label: "Issues", count: overview.issueCount ?? 0, angle: 0 },
  { label: "Code review", count: overview.pullRequestReviewCount ?? 0, angle: 270 },
];

const total = metrics.reduce((sum, m) => sum + m.count, 0) || 1;
const withPct = metrics.map((m) => ({
  ...m,
  pct: Math.round((m.count / total) * 100),
}));

const cx = 200;
const cy = 200;
const maxR = 118;
const gridLevels = [0.25, 0.5, 0.75, 1];

function polar(angle, radius) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

const dataPoints = withPct.map((m) => polar(m.angle, Math.max(8, (m.pct / 100) * maxR)));
const polygon = dataPoints.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

const gridLines = gridLevels
  .map((level) => {
    const r = maxR * level;
    const pts = [180, 90, 0, 270].map((a) => polar(a, r));
    return `<polygon points="${pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}" fill="none" stroke="#FFE135" stroke-width="1.2" opacity="0.35"/>`;
  })
  .join("\n    ");

const axes = withPct
  .map((m) => {
    const end = polar(m.angle, maxR);
    return `<line x1="${cx}" y1="${cy}" x2="${end.x.toFixed(2)}" y2="${end.y.toFixed(2)}" stroke="#FFE135" stroke-width="1.5" opacity="0.7"/>`;
  })
  .join("\n    ");

const labels = withPct
  .map((m) => {
    const pos = polar(m.angle, maxR + 34);
    const anchor = m.angle === 0 ? "start" : m.angle === 180 ? "end" : "middle";
    const dy = m.angle === 90 ? 12 : m.angle === 270 ? -4 : 4;
    return `<text x="${pos.x.toFixed(2)}" y="${(pos.y + dy).toFixed(2)}" text-anchor="${anchor}" fill="#000000" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700">${m.pct}% ${m.label}</text>`;
  })
  .join("\n    ");

const dots = dataPoints
  .map(
    (p) =>
      `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5.5" fill="#FFE135" stroke="#000000" stroke-width="2"/>`
  )
  .join("\n    ");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" role="img" aria-label="GitHub contribution activity overview">
  <defs>
    <linearGradient id="comicFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ED1D24" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0476F2" stop-opacity="0.45"/>
    </linearGradient>
    <filter id="ink">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="1" y="1" width="398" height="398" rx="14" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>
  <rect x="10" y="10" width="380" height="380" rx="10" fill="#FFFDF5" stroke="#ED1D24" stroke-width="1.5" opacity="0.9"/>
  <text x="200" y="34" text-anchor="middle" fill="#000000" font-family="Impact, Arial Black, sans-serif" font-size="18" letter-spacing="1">ACTIVITY OVERVIEW</text>
  <text x="200" y="54" text-anchor="middle" fill="#666666" font-family="Segoe UI, Arial, sans-serif" font-size="11">Contribution mix · last 12 months</text>
  <g transform="translate(0, 18)">
    ${gridLines}
    ${axes}
    <polygon points="${polygon}" fill="url(#comicFill)" stroke="#FFE135" stroke-width="2.5" filter="url(#ink)"/>
    ${dots}
    ${labels}
  </g>
</svg>
`;

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "..", "assets");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "activity-radar.svg");
writeFileSync(outPath, svg, "utf8");

console.log(`Wrote ${outPath}`);
console.log(withPct.map((m) => `${m.label}: ${m.pct}% (${m.count})`).join(", "));
