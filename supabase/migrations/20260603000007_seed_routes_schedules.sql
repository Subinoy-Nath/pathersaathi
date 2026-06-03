-- Phase 2: Seed Routes and Schedules

DO $$
DECLARE
    silchar_id UUID;
    sribhumi_id UUID;
    patherkandi_id UUID;
    lowairpoa_id UUID;
    bazarichera_id UUID;
    
    route_silchar_sribhumi UUID := gen_random_uuid();
    route_sribhumi_silchar UUID := gen_random_uuid();
    route_silchar_patherkandi UUID := gen_random_uuid();
    
    vehicle_1 UUID;
    vehicle_2 UUID;
    vehicle_3 UUID;
    vehicle_4 UUID;
BEGIN
    -- Get location IDs
    SELECT id INTO silchar_id FROM public.locations WHERE name = 'Silchar' LIMIT 1;
    SELECT id INTO sribhumi_id FROM public.locations WHERE name = 'Sribhumi' LIMIT 1;
    SELECT id INTO patherkandi_id FROM public.locations WHERE name = 'Patherkandi' LIMIT 1;
    SELECT id INTO lowairpoa_id FROM public.locations WHERE name = 'Lowairpoa' LIMIT 1;
    SELECT id INTO bazarichera_id FROM public.locations WHERE name = 'Bazarichera' LIMIT 1;

    -- Get vehicle IDs
    SELECT id INTO vehicle_1 FROM public.vehicles WHERE registration_number = 'AS10D5047-01' LIMIT 1;
    SELECT id INTO vehicle_2 FROM public.vehicles WHERE registration_number = 'AS10D5047-02' LIMIT 1;
    SELECT id INTO vehicle_3 FROM public.vehicles WHERE registration_number = 'AS10D5047-03' LIMIT 1;
    SELECT id INTO vehicle_4 FROM public.vehicles WHERE registration_number = 'AS10D5047-06' LIMIT 1;

    -- Insert seed routes
    INSERT INTO public.routes (id, origin_id, destination_id, distance_km, estimated_duration_mins)
    VALUES 
        (route_silchar_sribhumi, silchar_id, sribhumi_id, 55.0, 90),
        (route_sribhumi_silchar, sribhumi_id, silchar_id, 55.0, 90),
        (route_silchar_patherkandi, silchar_id, patherkandi_id, 75.0, 120)
    ON CONFLICT (origin_id, destination_id) DO NOTHING;

    -- Update UUIDs in case DO NOTHING bypassed the insert (if we ran this script multiple times)
    SELECT id INTO route_silchar_sribhumi FROM public.routes WHERE origin_id = silchar_id AND destination_id = sribhumi_id;
    SELECT id INTO route_sribhumi_silchar FROM public.routes WHERE origin_id = sribhumi_id AND destination_id = silchar_id;
    SELECT id INTO route_silchar_patherkandi FROM public.routes WHERE origin_id = silchar_id AND destination_id = patherkandi_id;

    -- Insert seed schedules
    -- We use relative times (now() + interval) to make sure they are somewhat valid for the present day
    INSERT INTO public.schedules (route_id, vehicle_id, departure_time, arrival_time, base_fare, total_seats, available_seats, status)
    VALUES
        (route_silchar_sribhumi, vehicle_1, date_trunc('day', now()) + interval '8 hours', date_trunc('day', now()) + interval '9 hours 30 minutes', 150.00, 40, 40, 'scheduled'),
        (route_silchar_sribhumi, vehicle_2, date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '11 hours 30 minutes', 150.00, 38, 38, 'scheduled'),
        (route_sribhumi_silchar, vehicle_3, date_trunc('day', now()) + interval '14 hours', date_trunc('day', now()) + interval '15 hours 30 minutes', 150.00, 38, 38, 'scheduled'),
        (route_silchar_patherkandi, vehicle_4, date_trunc('day', now()) + interval '7 hours', date_trunc('day', now()) + interval '9 hours', 200.00, 30, 30, 'scheduled'),
        -- Tomorrow's schedules
        (route_silchar_sribhumi, vehicle_1, date_trunc('day', now()) + interval '1 day 8 hours', date_trunc('day', now()) + interval '1 day 9 hours 30 minutes', 150.00, 40, 40, 'scheduled'),
        (route_sribhumi_silchar, vehicle_3, date_trunc('day', now()) + interval '1 day 14 hours', date_trunc('day', now()) + interval '1 day 15 hours 30 minutes', 150.00, 38, 38, 'scheduled');

END $$;
