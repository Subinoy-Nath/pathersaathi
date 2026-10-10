DO $$
DECLARE
    silchar_id UUID;
    sribhumi_id UUID;
BEGIN
    SELECT id INTO silchar_id FROM public.locations WHERE name = 'Silchar' LIMIT 1;
    SELECT id INTO sribhumi_id FROM public.locations WHERE name = 'Sribhumi' LIMIT 1;
    
    IF silchar_id IS NOT NULL AND sribhumi_id IS NOT NULL THEN
        INSERT INTO public.fares (origin_id, destination_id, is_ac, fare_amount) VALUES
            (silchar_id, sribhumi_id, false, 100.00),
            (silchar_id, sribhumi_id, true, 150.00),
            (sribhumi_id, silchar_id, false, 100.00),
            (sribhumi_id, silchar_id, true, 150.00)
        ON CONFLICT (origin_id, destination_id, is_ac) DO UPDATE SET fare_amount = EXCLUDED.fare_amount;
    END IF;
END $$;
