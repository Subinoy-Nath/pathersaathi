const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: routes } = await supabase
    .from('routes')
    .select('id, origin_id, destination_id, route_stops(location_id, stop_order)')
    .eq('is_active', true)
    .is('deleted_at', null);
  
  console.log(JSON.stringify(routes, null, 2));
}
run();
