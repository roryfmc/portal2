const fs = require('fs');
const s = fs.readFileSync('components/timesheets.tsx','utf8');
console.log('Occurrences of mis-encoded sequence "Â£":', (s.match(/Â£/g)||[]).length);
const lines = s.split(/\r?\n/);
console.log('Lines 428-434:\n', lines.slice(428,435).join('\n'));
console.log('Lines 468-476:\n', lines.slice(468,477).join('\n'));
