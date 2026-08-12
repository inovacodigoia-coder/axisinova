-- Temporarily drop the trigger to prevent handle_new_user from running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the user in auth.users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'hostingerinovacodigoia@gmail.com',
    crypt('InoV@CoidgoIA.2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Hostinger Inova Super Admin", "role": "super_admin", "company_id": "7858af33-878e-40c4-9305-e912cc6655c3"}',
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
)
RETURNING id;
