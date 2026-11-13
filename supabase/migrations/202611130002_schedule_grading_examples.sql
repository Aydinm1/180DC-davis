begin;
alter table public.assignment_grading_references
 add column schedule_example jsonb,
 add column schedule_version bigint not null default 0 check(schedule_version>=0);
-- Existing admin-only SELECT policy and denied direct mutations apply to these fields.
create function public.save_schedule_grading_example(p_assignment uuid,p_example jsonb,p_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.assignment_grading_references;a public.assignments;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required';end if;
 if p_version is null or p_version<0 then raise exception using errcode='22023',message='Reload before saving';end if;
 select * into a from public.assignments where id=p_assignment for update;
 if a.id is null or a.workflow<>'schedule' then raise exception using errcode='22023',message='Save a Schedule planning activity first';end if;
 if p_example is not null and (jsonb_typeof(p_example) is distinct from 'object' or octet_length(p_example::text)>1000000
  or (p_example-array['formatVersion','original','revised','explanation'])<>'{}'::jsonb
  or p_example->'formatVersion' is distinct from '2'::jsonb
  or not private.valid_schedule_format(p_example->'original',false,2,false)
  or not private.valid_schedule_format(p_example->'revised',false,2,false)
  or jsonb_typeof(p_example->'explanation') is distinct from 'string' or length(p_example->>'explanation')>2000)
 then raise exception using errcode='22023',message='Invalid example schedule';end if;
 insert into public.assignment_grading_references(assignment_id) values(a.id) on conflict do nothing;
 select * into r from public.assignment_grading_references where assignment_id=a.id for update;
 if r.schedule_version=p_version+1 and r.schedule_example is not distinct from p_example then return jsonb_build_object('version',r.schedule_version);end if;
 if r.schedule_version<>p_version then raise exception using errcode='40001',message='Another admin changed the example schedule';end if;
 update public.assignment_grading_references set schedule_example=p_example,schedule_version=schedule_version+1,updated_at=clock_timestamp() where assignment_id=a.id returning * into r;
 return jsonb_build_object('version',r.schedule_version);
end $$;
revoke all on function public.save_schedule_grading_example(uuid,jsonb,bigint) from public,anon,authenticated,service_role;
grant execute on function public.save_schedule_grading_example(uuid,jsonb,bigint) to authenticated;
commit;
