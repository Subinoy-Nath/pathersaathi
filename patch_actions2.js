const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

code = code.replace(
  'vehicles(name, registration_number, is_ac)',
  'vehicles(name, registration_number, features)'
);

code = code.replace(
  'const isAc = schedule.vehicles?.is_ac || false;',
  'const features = schedule.vehicles?.features || "";\n      const isAc = features.includes("AC") && !features.includes("Non-AC");\n      if (schedule.vehicles) { schedule.vehicles.is_ac = isAc; }'
);

fs.writeFileSync('frontend/src/app/actions.ts', code);
