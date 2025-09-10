const fs = require('fs');
const path = 'components/site-management.tsx';
let src = fs.readFileSync(path, 'utf8');
// 1) Ensure ToastAction import
if (!src.includes('components/ui/toast')) {
  src = src.replace(
    /import \{ toast \} from "@\/components\/ui\/use-toast"\s*/,
    (m) => m + 'import { ToastAction } from "@/components/ui/toast"\n'
  );
}
// 2) Replace the toast block for incompatibility
src = src.replace(
  /toast\(\{\s*title:\s*"Cannot assign operative"[\s\S]*?\}\)\s*\n\s*return/,
  () => {
    return `let t: any
const doOverride = () => {
  setSelectedOperatives((prev) => (prev.includes(operative.id) ? prev : [...prev, operative.id]))
  if (t && typeof t.dismiss === 'function') t.dismiss()
}
t = toast({
  title: "Incompatibility detected",
  description: (
    <div className="max-w-[420px] whitespace-pre-line">{warnings.join("\n")}</div>
  ),
  variant: "destructive",
  action: (
    <ToastAction altText="Override and assign" onClick={doOverride}>
      Override
    </ToastAction>
  ),
})
return`;
  }
);
fs.writeFileSync(path, src, 'utf8');
console.log('UPDATED');
