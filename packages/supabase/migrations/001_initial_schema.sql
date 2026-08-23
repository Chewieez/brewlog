-- BrewLog Initial PostgreSQL Schema (Supabase)

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_temp_unit TEXT NOT NULL DEFAULT celsius CHECK (preferred_temp_unit IN (celsius, fahrenheit)),
  preferred_weight_unit TEXT NOT NULL DEFAULT grams CHECK (preferred_weight_unit IN (grams, oz)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Equipment Table (Grinders, Brewers, Scales, Kettles)
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  sub_type TEXT,
  setting_scale_type TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Coffee Beans Stash Table
CREATE TABLE IF NOT EXISTS public.beans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roaster TEXT NOT NULL,
  name TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  region TEXT,
  farm TEXT,
  variety TEXT[],
  altitude_meters INTEGER,
  process TEXT NOT NULL,
  roast_level TEXT NOT NULL,
  roast_date DATE NOT NULL,
  flavor_notes TEXT[] DEFAULT {},
  rating NUMERIC(3,2),
  bag_weight_grams NUMERIC,
  remaining_grams NUMERIC,
  price NUMERIC,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Brew Recipes Table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brew_method TEXT NOT NULL,
  recommended_brewer_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  recommended_grinder_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT ,
  author TEXT,
  coffee_dose_grams NUMERIC NOT NULL,
  water_amount_grams NUMERIC NOT NULL,
  ratio NUMERIC NOT NULL,
  grind_size TEXT NOT NULL,
  water_temp_celsius INTEGER NOT NULL DEFAULT 93,
  total_time_seconds INTEGER NOT NULL,
  is_preset BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Recipe Stages Table
CREATE TABLE IF NOT EXISTS public.recipe_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_second INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  target_water_weight_grams NUMERIC NOT NULL,
  instruction TEXT NOT NULL,
  stage_type TEXT NOT NULL DEFAULT pour
);

-- 6. Tasting & Cupping Logs Table
CREATE TABLE IF NOT EXISTS public.tasting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bean_id UUID REFERENCES public.beans(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  grinder_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  brewer_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  grinder_snapshot TEXT,
  brewer_snapshot TEXT,
  bean_name_snapshot TEXT NOT NULL,
  roaster_snapshot TEXT NOT NULL,
  recipe_name_snapshot TEXT NOT NULL,
  brew_method TEXT NOT NULL,
  brew_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coffee_dose_grams NUMERIC NOT NULL,
  water_amount_grams NUMERIC NOT NULL,
  actual_time_seconds INTEGER NOT NULL,
  grind_setting TEXT NOT NULL,
  water_temp_celsius INTEGER NOT NULL,
  fragrance_aroma NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  acidity NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  sweetness NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  body NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  clarity NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  aftertaste NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  balance NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  overall NUMERIC(3,1) NOT NULL DEFAULT 7.5,
  calculated_sca_score NUMERIC(4,1) NOT NULL,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.0,
  flavor_tags TEXT[] DEFAULT {},
  notes TEXT NOT NULL DEFAULT ,
  would_brew_again BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasting_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Equipment Policies
CREATE POLICY "Users can manage own equipment" ON public.equipment FOR ALL USING (auth.uid() = user_id);

-- Beans Policies
CREATE POLICY "Users can manage own beans" ON public.beans FOR ALL USING (auth.uid() = user_id);

-- Recipes Policies
CREATE POLICY "Users can read presets and own recipes" ON public.recipes FOR SELECT USING (is_preset = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users can manage own recipes" ON public.recipes FOR ALL USING (auth.uid() = user_id);

-- Recipe Stages Policies
CREATE POLICY "Users can read recipe stages" ON public.recipe_stages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_stages.recipe_id AND (r.is_preset = TRUE OR r.user_id = auth.uid()))
);
CREATE POLICY "Users can manage stages for own recipes" ON public.recipe_stages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_stages.recipe_id AND r.user_id = auth.uid())
);

-- Tasting Logs Policies
CREATE POLICY "Users can manage own tasting logs" ON public.tasting_logs FOR ALL USING (auth.uid() = user_id);

-- Automatic Profile Creation Trigger on Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->> 'display_name', split_part(new.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
