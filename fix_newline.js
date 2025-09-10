const fs = require('fs');
const path = 'components/site-management.tsx';
let s = fs.readFileSync(path, 'utf8');
s = s.replace(/\{warnings\.join\(\"[\r\n]+\"\)\}/m, '{warnings.join("\\n")}');
fs.writeFileSync(path, s, 'utf8');
console.log('FIXED-NEWLINE');
