// One-off: writes SAMPLE learning sessions to content/learning.json. Replace with your real log
// (same shape: d = YYYY-MM-DD, s = start hour 0-24, m = minutes, t = topic, title).
import { writeFileSync } from 'node:fs';
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const topics = { AI: ['Attention maths', 'Reading a paper', 'Prompt patterns', 'Embeddings'], Android: ['Compose state', 'Room database', 'Gradle setup'], Linux: ['Arch install notes', 'systemd units', 'Shell scripting'], Design: ['Neumorphism study', 'Type scale', 'Colour contrast'], Software: ['Local-first reading', 'Git internals', 'Testing habits'] };
const names = Object.keys(topics), out = [];
for (let d = new Date('2026-01-01'); d <= new Date('2026-10-14'); d.setDate(d.getDate() + 1)) {
  if (rnd() < 0.18) continue;
  const n = 1 + Math.floor(rnd() * 3); let start = 6 + rnd() * 6;
  for (let i = 0; i < n; i++) {
    const t = names[Math.floor(rnd() * names.length)], m = 25 + Math.floor(rnd() * 11) * 10;
    out.push({ d: d.toISOString().slice(0, 10), s: Math.round(start * 4) / 4, m, t, title: topics[t][Math.floor(rnd() * topics[t].length)] });
    start += m / 60 + 0.5 + rnd() * 3; if (start > 22) break;
  }
}
writeFileSync('content/learning.json', JSON.stringify(out));
console.log(out.length, 'sample sessions');
