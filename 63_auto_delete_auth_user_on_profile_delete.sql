-- Create a function to delete auth.users when profile is deleted
CREATE OR REPLACE FUNCTION delete_auth_user_on_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the corresponding auth.users record
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- If deletion fails, log but don't block the profile deletion
    RAISE WARNING 'Failed to delete auth.users for profile %: %', OLD.id, SQLERRM;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically delete auth.users when profile is deleted
DROP TRIGGER IF EXISTS trigger_delete_auth_user_on_profile_delete ON profiles;
CREATE TRIGGER trigger_delete_auth_user_on_profile_delete
AFTER DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION delete_auth_user_on_profile_delete();
