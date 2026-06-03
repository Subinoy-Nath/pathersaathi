-- Core Foundation Schema

-- users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    whatsapp_number TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'operator')),
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'suspended')),
    operator_business_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- locations
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- vehicles
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'bus' CHECK (vehicle_type IN ('bus')),
    features TEXT,
    capacity_seats INTEGER NOT NULL,
    registration_number TEXT UNIQUE,
    price_per_day DECIMAL(10, 2),
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    insurance_expiry_date DATE,
    permit_expiry_date DATE,
    maintenance_status TEXT NOT NULL DEFAULT 'good' CHECK (maintenance_status IN ('good', 'needs_repair', 'in_shop')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
