begin;
create table private.assignment_team_briefs (
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 team_id uuid not null references public.cohort_teams(id) on delete cascade,
 instructions text not null check(length(instructions)<=50000),
 version bigint not null default 1, updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null references public.people(id), request_id uuid not null,
 primary key(assignment_id,team_id)
);
alter table private.assignment_team_briefs enable row level security;
revoke all on private.assignment_team_briefs from public,anon,authenticated,service_role;

create function public.read_assignment_team_briefs(p_assignment uuid,p_team uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.assignments; w public.program_weeks;
begin
 select * into a from public.assignments where id=p_assignment;
 select * into w from public.program_weeks where id=a.week_id;
 if a.id is null then raise exception using errcode='42501',message='Assignment unavailable'; end if;
 if not private.is_admin() then
  if p_team is not null or private.is_viewer() or not w.published or not private.can_learn(w.cohort_id)
  then raise exception using errcode='42501',message='Team instructions unavailable'; end if;
 end if;
 if a.submission_mode<>'team' or a.workflow<>'standard' then return '[]'::jsonb; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('teamId',t.id,'teamName',t.name,'isTest',t.is_test,
 'instructions',coalesce(b.instructions,''),'version',coalesce(b.version,0),'updatedAt',b.updated_at)
 order by t.is_test,t.name,t.id),'[]'::jsonb)
 from public.cohort_teams t left join private.assignment_team_briefs b on b.assignment_id=a.id and b.team_id=t.id
 where t.cohort_id=w.cohort_id and (p_team is null or t.id=p_team)
 and (private.is_admin() or exists(select 1 from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id
 where m.team_id=t.id and e.cohort_id=w.cohort_id and e.person_id=private.my_person_id()
 and e.participation_status='enrolled' and e.is_test=t.is_test)));
end $$;
revoke all on function public.read_assignment_team_briefs(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_assignment_team_briefs(uuid,uuid) to authenticated;

create function public.save_assignment_team_brief(p_assignment uuid,p_team uuid,p_instructions text,p_version bigint,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.assignments; t public.cohort_teams; w public.program_weeks; b private.assignment_team_briefs;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 perform private.submission_gate();
 select * into a from public.assignments where id=p_assignment for update;
 select * into w from public.program_weeks where id=a.week_id;
 select * into t from public.cohort_teams where id=p_team for update;
 if a.id is null or t.id is null or t.cohort_id<>w.cohort_id or a.submission_mode<>'team' or a.workflow<>'standard'
 then raise exception using errcode='22023',message='Save this assignment as Standard and Team, then choose a team in its cohort'; end if;
 if p_instructions is null or length(p_instructions)>50000 or p_version is null or p_version<0 or p_request is null
 then raise exception using errcode='22023',message='Use up to 50,000 characters and reload before saving'; end if;
 select * into b from private.assignment_team_briefs where assignment_id=a.id and team_id=t.id for update;
 if b.request_id=p_request then
  if b.instructions<>p_instructions or b.updated_by<>private.my_person_id() or b.version<>p_version+1
  then raise exception using errcode='22023',message='Retry request changed'; end if;
 elsif p_version<>coalesce(b.version,0) then
  raise exception using errcode='40001',message='This team brief changed. Copy your edits before reloading';
 else
  insert into private.assignment_team_briefs(assignment_id,team_id,instructions,updated_by,request_id)
  values(a.id,t.id,p_instructions,private.my_person_id(),p_request)
  on conflict(assignment_id,team_id) do update set instructions=excluded.instructions,version=assignment_team_briefs.version+1,
  updated_at=clock_timestamp(),updated_by=excluded.updated_by,request_id=excluded.request_id;
 end if;
 return public.read_assignment_team_briefs(a.id,t.id)->0;
end $$;
revoke all on function public.save_assignment_team_brief(uuid,uuid,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.save_assignment_team_brief(uuid,uuid,text,bigint,uuid) to authenticated;

create function private.guard_assignment_team_brief_mode() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if (new.submission_mode<>'team' or new.workflow<>'standard') and exists(select 1 from private.assignment_team_briefs where assignment_id=old.id and instructions ~ '[^[:space:]]')
 then raise exception using errcode='22023',message='Clear the saved team briefs before changing submission type or workflow'; end if;
 return new;
end $$;
revoke all on function private.guard_assignment_team_brief_mode() from public,anon,authenticated,service_role;
create trigger assignment_team_brief_mode before update of workflow,submission_mode on public.assignments
for each row execute function private.guard_assignment_team_brief_mode();
commit;
