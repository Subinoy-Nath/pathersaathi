const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

// 1. Update TodayScheduleItem interface
code = code.replace(
  'is_ac?: boolean\n  } | null\n  routes: {',
  'is_ac?: boolean\n  } | null\n  station_times?: any[] | null\n  routes: {'
);

code = code.replace(
  'destination: { id?: string; name: string } | null\n  } | null\n}',
  'destination: { id?: string; name: string } | null\n    route_stops?: { stop_order: number; custom_name?: string; location?: { name: string } }[] | null\n  } | null\n}'
);

// 2. Add fields to first query
const target1 = `      vehicles (
        id,
        name,
        registration_number,
        image_url,
        features
      ),
      routes (`;

const replace1 = `      station_times,
      vehicles (
        id,
        name,
        registration_number,
        image_url,
        features
      ),
      routes (`;

code = code.replace(target1, replace1);

const target2 = `        distance_km,
        estimated_duration_mins,
        origin:locations!routes_origin_id_fkey ( id, name ),
        destination:locations!routes_destination_id_fkey ( id, name )
      )`;

const replace2 = `        distance_km,
        estimated_duration_mins,
        origin:locations!routes_origin_id_fkey ( id, name ),
        destination:locations!routes_destination_id_fkey ( id, name ),
        route_stops ( stop_order, custom_name, location:locations ( name ) )
      )`;

code = code.replace(target2, replace2);

// 3. Add fields to second query
code = code.replace(target1, replace1); // will do second query too if not found
code = code.replace(target2, replace2);

fs.writeFileSync('frontend/src/app/actions.ts', code);
