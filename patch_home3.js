const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/HomeClient.tsx', 'utf8');

// The main hero search form
code = code.replace(
  '<input id="travelDate" type="date" name="travelDate" required',
  '<input id="travelDate" type="date" name="travelDate" defaultValue={getTodayString()} required'
);

// The whole vehicle booking form
code = code.replace(
  'name="travelDate"\n                  required',
  'name="travelDate"\n                  defaultValue={getTodayString()}\n                  required'
);

fs.writeFileSync('frontend/src/app/HomeClient.tsx', code);
