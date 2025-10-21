-- Update has_role function to use correct enum type
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.member_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if current user is owner
CREATE OR REPLACE FUNCTION public.is_current_user_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'owner'::public.member_role)
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Update RLS Policies for user_roles to include owner
DROP POLICY IF EXISTS "Admins and owners can view all roles" ON public.user_roles;
CREATE POLICY "Admins and owners can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.member_role) OR 
    public.has_role(auth.uid(), 'owner'::public.member_role)
  );

DROP POLICY IF EXISTS "Owners can manage all roles" ON public.user_roles;
CREATE POLICY "Owners can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.member_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.member_role));

DROP POLICY IF EXISTS "Admins can manage non-owner roles" ON public.user_roles;
CREATE POLICY "Admins can manage non-owner roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.member_role) AND 
    NOT public.has_role(user_id, 'owner'::public.member_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.member_role) AND 
    role != 'owner'::public.member_role
  );

-- Create zapier_webhooks table for storing owner's Zapier webhook URLs
CREATE TABLE IF NOT EXISTS public.zapier_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  webhook_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zapier_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zapier_webhooks
CREATE POLICY "Owners can manage their own webhooks"
  ON public.zapier_webhooks
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id AND 
    public.has_role(auth.uid(), 'owner'::public.member_role)
  )
  WITH CHECK (
    auth.uid() = user_id AND 
    public.has_role(auth.uid(), 'owner'::public.member_role)
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_zapier_webhooks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_zapier_webhooks_updated_at ON public.zapier_webhooks;
CREATE TRIGGER update_zapier_webhooks_updated_at
  BEFORE UPDATE ON public.zapier_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zapier_webhooks_updated_at();