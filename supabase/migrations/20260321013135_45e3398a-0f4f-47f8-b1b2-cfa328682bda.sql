CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    display_name,
    occupation,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name')
    ),
    NEW.raw_user_meta_data ->> 'occupation',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;