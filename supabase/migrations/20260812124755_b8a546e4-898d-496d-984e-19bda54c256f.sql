-- Granting EXECUTE permission on private.is_super_admin() to authenticated users
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;
