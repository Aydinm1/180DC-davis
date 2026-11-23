begin;
-- Canva's Share menu can return an official canva.link short URL instead of a design URL.
-- Keep links as private references; do not resolve redirects or fetch remote content.
create or replace function private.valid_swap_link(value text) returns boolean
language sql immutable set search_path='' as $$
 select value is not null and length(value)<=2048 and value !~ '[[:space:][:cntrl:]]'
 and value ~ '^https://((docs[.]google[.]com/presentation/(u/[0-9]+/)?d/[A-Za-z0-9_-]+|((www[.])?canva[.]com)/design/[A-Za-z0-9_-]+)(/[A-Za-z0-9_./-]*)?|canva[.]link/[A-Za-z0-9_-]+/?)([?][^#]*)?(#.*)?$'
$$;
revoke all on function private.valid_swap_link(text) from public,anon,authenticated,service_role;
commit;
