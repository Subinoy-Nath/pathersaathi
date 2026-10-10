const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/HomeClient.tsx', 'utf8');

code = code.replace(/<React\.Fragment key=\{idx\}>/g, '<div key={idx} className="flex items-center gap-1.5">');
code = code.replace(/<\/React\.Fragment>/g, '</div>');

fs.writeFileSync('frontend/src/app/HomeClient.tsx', code);
