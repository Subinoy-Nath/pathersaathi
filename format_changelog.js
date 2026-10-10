const fs = require('fs');
let code = fs.readFileSync('CHANGELOG.md', 'utf8');

// Strip out the misplaced top section
const incorrectTop = `## 2. Bus Tracking, Search, & Dynamic UI Fixes

### Issues Resolved
- **AC / Non-AC Display Bug**: Fixed an issue where the new \`is_ac\` flag was causing vehicles with AC features to render as "Non-AC". The UI now dynamically infers AC status stringently from the vehicle's \`features\` text payload.
- **Intermediate Station Searching**: Refactored the \`searchSchedules\` API to properly allow searching for trips starting and ending at intermediate \`route_stops\`. Previously, the API mistakenly restricted searches strictly to absolute route origins and destinations.
- **Dynamic Fare Display**: Searching for multi-seat bookings now automatically multiplies and displays the aggregate base fare per the number of requested passengers instead of displaying the single-seat base fare.
- **Date Defaults**: The initial load date across all booking inputs has been explicitly defaulted to today's date in local time instead of rendering blank.
- **Track Bus Timeline UI Refinements**: 
  - Completely removed the redundant footer text ("Departs time", "seats free") from live bus tracking cards.
  - Substituted the standard \`Origin -> Destination\` block with an inclusive chronological timeline of the full bus route path.
  - The new timeline fetches and accurately renders per-station arrival times directly beneath every mapped station using the new \`station_times\` structure.

---
`;

code = code.replace(incorrectTop, '');

const targetLocation = `- In \`frontend/src/app/HomeClient.tsx\`: Updated vehicle cards to visibly display an **AC** or **Non-AC** badge next to the bus name.`;

const correctInsertion = `- In \`frontend/src/app/HomeClient.tsx\`: Updated vehicle cards to visibly display an **AC** or **Non-AC** badge next to the bus name.

---

## 2. Bus Tracking, Search, & Dynamic UI Fixes

### Issues Resolved
- **AC / Non-AC Display Bug**: Fixed an issue where the new \`is_ac\` flag was causing vehicles with AC features to render as "Non-AC". The UI now dynamically infers AC status stringently from the vehicle's \`features\` text payload.
- **Intermediate Station Searching**: Refactored the \`searchSchedules\` API to properly allow searching for trips starting and ending at intermediate \`route_stops\`. Previously, the API mistakenly restricted searches strictly to absolute route origins and destinations.
- **Dynamic Fare Display**: Searching for multi-seat bookings now automatically multiplies and displays the aggregate base fare per the number of requested passengers instead of displaying the single-seat base fare.
- **Date Defaults**: The initial load date across all booking inputs has been explicitly defaulted to today's date in local time instead of rendering blank.
- **Track Bus Timeline UI Refinements**: 
  - Completely removed the redundant footer text ("Departs time", "seats free") from live bus tracking cards.
  - Substituted the standard \`Origin -> Destination\` block with an inclusive chronological timeline of the full bus route path.
  - The new timeline fetches and accurately renders per-station arrival times directly beneath every mapped station using the new \`station_times\` structure.`;

// Just to be safe if the target is duplicated or something, we only replace once.
if (code.includes(targetLocation)) {
  // It's possible I already appended it earlier. Let's check if the correct insertion is already there.
  if (!code.includes("## 2. Bus Tracking, Search, & Dynamic UI Fixes")) {
    code = code.replace(targetLocation, correctInsertion);
  } else {
    // If it's already there (because I patched it in the previous step), just leave it alone since I removed the top copy.
  }
}

fs.writeFileSync('CHANGELOG.md', code);
