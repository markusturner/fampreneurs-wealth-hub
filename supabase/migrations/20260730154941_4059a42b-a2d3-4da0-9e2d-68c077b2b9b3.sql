DROP POLICY IF EXISTS "Public can read active invite links" ON public.invite_links;
DROP POLICY IF EXISTS "Authenticated only realtime" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;