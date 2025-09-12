const fs = require('fs');

const paths = [
  'components/timesheets.tsx',
];

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');

  // 1) Replace mis-encoded pounds sign (U+00C2 U+00A3) with proper U+00A3
  // Remove stray U+00C2 when it appears before U+00A3 (Â£ -> £)
  src = src.replace(/\u00C2(?=\u00A3)/g, '');
  // Also fix any literal replacement char display
  src = src.replace(/A�/g, '£');
  // Normalize Pay Rate label regardless of inner symbol
  src = src.replace(/Pay Rate \([^)]*\)/g, 'Pay Rate (£/hr)');

  // 2) (optional) could remove Weekly Pay block here if desired

  fs.writeFileSync(path, src, 'utf8');
  console.log(`Fixed currency and cleaned block in ${path}`);
}
