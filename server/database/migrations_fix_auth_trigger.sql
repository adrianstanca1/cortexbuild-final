-- 1. Make password nullable (as Auth handles it)
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- 2. Drop potential problematic triggers/columns if they block us
-- We assume rbac_role doesn't exist based on database.ts. 
-- If it exists, we can ignore it, but the trigger was trying to insert into it.

-- 3. Redefine handle_new_user to match current schema
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, createdat, updatedat, isactive)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''), 
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NOW(),
    NOW(),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updatedat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop the other trigger if it exists, to avoid side effects for now
-- user linking should be handled by app logic or a correct trigger.
DROP TRIGGER IF EXISTS link_user_to_company_trigger ON auth.users;
