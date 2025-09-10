const fs = require('fs');
const path = 'components/site-management.tsx';
let src = fs.readFileSync(path, 'utf8');

const marker = 'const getIncompatibilityWarnings = (candidate: Operative) => {';
const start = src.indexOf(marker);
if (start !== -1) {
  const braceIdx = src.indexOf('{', start);
  const retIdx = src.indexOf('return warnings', braceIdx);
  const endBrace = src.indexOf('}', retIdx);
  if (endBrace !== -1) {
    const before = src.slice(0, start);
    const after = src.slice(endBrace + 1);
    const replacement =
`const getIncompatibilityWarnings = (candidate: Operative) => {
    const warnings: string[] = []

    // Against client
    if (currentClientId != null && Array.isArray(candidate.unableToWorkWith)) {
      const clientBlocks = candidate.unableToWorkWith.filter(
        (u: any) => (u.targetType === "CLIENT" || u.targetType === "client") && Number(u.targetClientId) === Number(currentClientId),
      )
      for (const blk of clientBlocks) {
        const clientName = getClientName(String(currentClientId))
        const note = blk && typeof blk.note === "string" && blk.note.length ? " Note: " + blk.note : ""
        warnings.push((candidate.personalDetails?.fullName || candidate.id) + " is unable to work with client " + clientName + "." + note)
      }
    }

    // Against other selected operatives (both directions)
    for (const selectedId of selectedOperatives) {
      if (selectedId === candidate.id) continue
      const other = operativeById[selectedId]
      if (!other) continue

      // Candidate -> Other
      const candBlocks = (candidate.unableToWorkWith || []).filter(
        (u: any) => (u.targetType === "OPERATIVE" || u.targetType === "operative") && String(u.targetOperativeId) === String(other.id),
      )
      for (const blk of candBlocks) {
        const note = blk && typeof blk.note === "string" && blk.note.length ? " Note: " + blk.note : ""
        warnings.push((candidate.personalDetails?.fullName || candidate.id) + " is unable to work with " + (other.personalDetails?.fullName || other.id) + "." + note)
      }

      // Other -> Candidate
      const otherBlocks = (other.unableToWorkWith || []).filter(
        (u: any) => (u.targetType === "OPERATIVE" || u.targetType === "operative") && String(u.targetOperativeId) === String(candidate.id),
      )
      for (const blk of otherBlocks) {
        const note = blk && typeof blk.note === "string" && blk.note.length ? " Note: " + blk.note : ""
        warnings.push((other.personalDetails?.fullName || other.id) + " is unable to work with " + (candidate.personalDetails?.fullName || candidate.id) + "." + note)
      }
    }

    return warnings
  }
`;
    src = before + replacement + after;
  }
}

src = src.replace(/const\s+confirmMsg\s*=\s*`[\s\S]*?Assign anyway\?`/, 'const confirmMsg = "Warning:\n\n" + warnings.join("\n") + "\n\nAssign anyway?"');

fs.writeFileSync(path, src, 'utf8');
console.log('UPDATED');
