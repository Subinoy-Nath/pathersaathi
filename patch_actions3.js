const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

// Add features to TodayScheduleItem
code = code.replace(
  'registration_number: string | null\n    image_url: string | null\n  } | null',
  'registration_number: string | null\n    image_url: string | null\n    features?: string | null\n    is_ac?: boolean\n  } | null'
);

// Add features to the first query in getTodaySchedules
code = code.replace(
  'vehicles (\n        id,\n        name,\n        registration_number,\n        image_url\n      )',
  'vehicles (\n        id,\n        name,\n        registration_number,\n        image_url,\n        features\n      )'
);

// Add features to the second query in getTodaySchedules
code = code.replace(
  'vehicles (\n        id,\n        name,\n        registration_number,\n        image_url\n      )',
  'vehicles (\n        id,\n        name,\n        registration_number,\n        image_url,\n        features\n      )'
);

// Calculate is_ac before returning in getTodaySchedules
const beforeReturn = `  return {
    success: true,
    schedules: sortedSchedules as TodayScheduleItem[]
  }`;

const replacement = `  sortedSchedules.forEach(schedule => {
    if (schedule.vehicles) {
      const features = schedule.vehicles.features || "";
      schedule.vehicles.is_ac = features.includes("AC") && !features.includes("Non-AC");
    }
  });

  return {
    success: true,
    schedules: sortedSchedules as TodayScheduleItem[]
  }`;

code = code.replace(beforeReturn, replacement);

fs.writeFileSync('frontend/src/app/actions.ts', code);
