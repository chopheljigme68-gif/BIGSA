-- The site has two kinds of people: guests (no account) and administrators.
-- Every admin account gets full access; the role column is kept for compatibility.
update admin_users set role = 'super_admin' where role <> 'super_admin';
alter table admin_users alter column role set default 'super_admin';
