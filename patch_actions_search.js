const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

const target = `  let formattedSchedules = schedules;
  if (dynamicFares && dynamicFares.length > 0) {
    formattedSchedules = schedules.map(schedule => {
      // @ts-ignore: is_ac is added dynamically
      const features = schedule.vehicles?.features || "";
      const isAc = features.includes("AC") && !features.includes("Non-AC");
      if (schedule.vehicles) { schedule.vehicles.is_ac = isAc; }
      const matchingFare = dynamicFares.find(f => f.is_ac === isAc);
      
      return {
        ...schedule,
        base_fare: matchingFare ? matchingFare.fare_amount : schedule.base_fare
      };
    });
  }`;

const replacement = `  let formattedSchedules = schedules.map(schedule => {
    const features = schedule.vehicles?.features || "";
    const isAc = features.includes("AC") && !features.includes("Non-AC");
    if (schedule.vehicles) { schedule.vehicles.is_ac = isAc; }
    
    let base_fare = schedule.base_fare;
    if (dynamicFares && dynamicFares.length > 0) {
      const matchingFare = dynamicFares.find(f => f.is_ac === isAc);
      if (matchingFare) {
        base_fare = matchingFare.fare_amount;
      }
    }
    
    return {
      ...schedule,
      base_fare
    };
  });`;

code = code.replace(target, replacement);
fs.writeFileSync('frontend/src/app/actions.ts', code);
