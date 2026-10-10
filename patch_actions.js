const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

// Update select query to include is_ac in vehicles
code = code.replace(
  'vehicles(name, registration_number)',
  'vehicles(name, registration_number, is_ac)'
);

// Add fare lookup
const beforeReturn = `  return { success: true, schedules }`;
const replacement = `  // Lookup dynamic fares
  const { data: dynamicFares } = await supabase
    .from('fares')
    .select('is_ac, fare_amount')
    .eq('origin_id', pickupId)
    .eq('destination_id', destinationId);

  let formattedSchedules = schedules;
  if (dynamicFares && dynamicFares.length > 0) {
    formattedSchedules = schedules.map(schedule => {
      // @ts-ignore: is_ac is added dynamically
      const isAc = schedule.vehicles?.is_ac || false;
      const matchingFare = dynamicFares.find(f => f.is_ac === isAc);
      
      return {
        ...schedule,
        base_fare: matchingFare ? matchingFare.fare_amount : schedule.base_fare
      };
    });
  }

  return { success: true, schedules: formattedSchedules }`;

code = code.replace(beforeReturn, replacement);

fs.writeFileSync('frontend/src/app/actions.ts', code);
