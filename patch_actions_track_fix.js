const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

// Fix the double station_times
code = code.replace(/station_times,\\n      station_times,/g, 'station_times,');
code = code.replace(/route_stops \\(.*\\)\\n        route_stops \\(.*\\)/g, 'route_stops ( stop_order, custom_name, location:locations ( name ) )');

fs.writeFileSync('frontend/src/app/actions.ts', code);
