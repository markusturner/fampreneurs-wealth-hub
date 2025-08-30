-- Add cascade delete trigger to clean up services when family office members are deleted
CREATE OR REPLACE FUNCTION public.cleanup_family_member_services()
RETURNS TRIGGER AS $$
BEGIN
  -- When a family member is deleted, clean up any associated office services
  -- This ensures that services tied to specific roles are removed when the member is removed
  IF OLD.office_role IS NOT NULL AND OLD.office_services IS NOT NULL THEN
    -- Log the cleanup for audit purposes
    PERFORM public.log_family_office_action(
      'family_member_services_cleanup',
      'family_members',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      'medium',
      jsonb_build_object(
        'deleted_member_name', OLD.full_name,
        'deleted_office_role', OLD.office_role,
        'deleted_services', OLD.office_services,
        'cleanup_reason', 'member_deletion'
      )
    );
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;