const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/actions.ts', 'utf8');

const target1 = `  // Find Route
  const { data: routes, error: routeError } = await supabase
    .from('routes')
    .select('id')
    .eq('origin_id', pickupId)
    .eq('destination_id', destinationId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (routeError || !routes || routes.length === 0) {
    return { success: false, error: 'No active route found for these locations.' }
  }

  const routeId = routes[0].id`;

const repl1 = `  // Find Valid Routes (including intermediate stops)
  const { data: routes, error: routeError } = await supabase
    .from('routes')
    .select(\`
      id,
      origin_id,
      destination_id,
      route_stops ( location_id, stop_order )
    \`)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (routeError || !routes || routes.length === 0) {
    return { success: false, error: 'No active routes found.' }
  }

  const validRouteIds = routes.filter(route => {
    let pickupOrder = -1;
    let destOrder = -1;

    if (route.origin_id === pickupId) pickupOrder = 0;
    if (route.destination_id === pickupId) pickupOrder = 999999;
    
    if (route.origin_id === destinationId) destOrder = 0;
    if (route.destination_id === destinationId) destOrder = 999999;

    if (route.route_stops && route.route_stops.length > 0) {
      route.route_stops.forEach(stop => {
        if (stop.location_id === pickupId) pickupOrder = stop.stop_order;
        if (stop.location_id === destinationId) destOrder = stop.stop_order;
      });
    }

    return pickupOrder !== -1 && destOrder !== -1 && pickupOrder < destOrder;
  }).map(r => r.id);

  if (validRouteIds.length === 0) {
    return { success: false, error: 'No active route found for these locations.' }
  }`;

code = code.replace(target1, repl1);

code = code.replace(".eq('route_id', routeId)", ".in('route_id', validRouteIds)");
code = code.replace(".eq('route_id', routeId)", ".in('route_id', validRouteIds)");
code = code.replace(".eq('route_id', routeId)", ".in('route_id', validRouteIds)");

fs.writeFileSync('frontend/src/app/actions.ts', code);
