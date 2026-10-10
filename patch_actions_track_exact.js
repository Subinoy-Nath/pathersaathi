const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

const queryBody = `      id,
      departure_time,
      arrival_time,
      available_seats,
      total_seats,
      base_fare,
      status,
      pause_reason,
      station_times,
      vehicles (
        id,
        name,
        registration_number,
        image_url,
        features
      ),
      routes (
        id,
        distance_km,
        estimated_duration_mins,
        origin:locations!routes_origin_id_fkey ( id, name ),
        destination:locations!routes_destination_id_fkey ( id, name ),
        route_stops ( stop_order, custom_name, location:locations ( name ) )
      )`;

code = code.replace(/const \{ data: todayRuns, error: todayError \} = await supabase[\s\S]*?\.select\([\s\S]*?`\)/, 
`const { data: todayRuns, error: todayError } = await supabase\n    .from('schedules')\n    .select(\`\n${queryBody}\n    \`)`);

code = code.replace(/const \{ data: activeRuns, error: activeError \} = await supabase[\s\S]*?\.select\([\s\S]*?`\)/, 
`const { data: activeRuns, error: activeError } = await supabase\n    .from('schedules')\n    .select(\`\n${queryBody}\n    \`)`);

fs.writeFileSync('frontend/src/app/actions.ts', code);
