const fs = require('fs');
const path = 'components/site-management.tsx';
let src = fs.readFileSync(path, 'utf8');
src = src.replace(/const\s+confirmMsg\s*=\s*[^\n]*Warning:[\s\S]*?Assign anyway\?/, 'const confirmMsg = "Warning:\n\n" + warnings.join("\n") + "\n\nAssign anyway?"');
fs.writeFileSync(path, src, 'utf8');
console.log('FIXED confirmMsg');
