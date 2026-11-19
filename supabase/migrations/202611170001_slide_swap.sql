begin;
alter table public.assignments drop constraint assignments_workflow_check;
alter table public.assignments add constraint assignments_workflow_check check(workflow in ('standard','guided','cases','investigation','schedule','slide_swap'));
alter table public.assignments add constraint slide_swap_individual check(workflow<>'slide_swap' or submission_mode='individual');
create table private.swap_configs(assignment_id uuid primary key references public.assignments on delete cascade, overview text not null check(length(overview) between 1 and 50000), stories jsonb not null, version bigint not null default 1);
create table public.slide_swap_groups(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.assignments on delete restrict,name text not null check(length(name) between 1 and 100),is_test boolean not null,version bigint not null default 0,unlocked_at timestamptz,unique(assignment_id,name));
create table public.slide_swap_members(assignment_id uuid not null references public.assignments on delete restrict,enrollment_id uuid not null references public.cohort_enrollments on delete restrict,group_id uuid not null references public.slide_swap_groups on delete restrict,position integer not null check(position between 1 and 3),story_id uuid not null,primary key(assignment_id,enrollment_id),unique(group_id,position));
create table private.swap_assets(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.assignments on delete restrict,enrollment_id uuid not null references public.cohort_enrollments on delete restrict,group_id uuid not null references public.slide_swap_groups on delete restrict,owner_id uuid not null references auth.users on delete restrict,story_id uuid,kind text not null check(kind in ('deck','proof')),path text not null unique,name text not null,mime text not null,size bigint not null check(size between 1 and 20971520),state text not null default 'pending' check(state in ('pending','ready','abandoned','cleaned')),current boolean not null default false,expected_id uuid,expected_version timestamptz,group_version bigint not null,expires_at timestamptz not null default clock_timestamp()+interval '1 hour',created_at timestamptz not null default clock_timestamp(),submission_id uuid);
create unique index swap_current_deck on private.swap_assets(assignment_id,enrollment_id) where kind='deck' and current and state='ready';
create table private.swap_decks(group_id uuid not null references public.slide_swap_groups on delete restrict,enrollment_id uuid not null references public.cohort_enrollments on delete restrict,position integer not null,asset_id uuid not null references private.swap_assets on delete restrict,story jsonb not null,primary key(group_id,enrollment_id));
create table private.swap_attempts(submission_id uuid primary key,group_id uuid not null references public.slide_swap_groups on delete restrict,asset_id uuid not null references private.swap_assets on delete restrict,enrollment_ids uuid[] not null,created_at timestamptz not null default clock_timestamp());
create table private.swap_receipts(actor_id uuid not null,request_id uuid not null,payload jsonb not null,result jsonb not null,primary key(actor_id,request_id));
alter table public.submission_targets add column swap_group_id uuid references public.slide_swap_groups on delete restrict;
alter table public.submission_targets drop constraint submission_targets_check;
alter table public.submission_targets add constraint submission_targets_check check(num_nonnulls(enrollment_id,team_id,swap_group_id)=1),add unique(assignment_id,swap_group_id);
alter table public.submissions add column swap_group_id uuid references public.slide_swap_groups on delete restrict;

create function private.can_read_swap(gid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from public.slide_swap_groups g join public.slide_swap_members m on m.group_id=g.id join public.cohort_enrollments e on e.id=m.enrollment_id join public.assignments a on a.id=g.assignment_id join public.program_weeks w on w.id=a.week_id where g.id=gid and a.workflow='slide_swap' and w.published and e.person_id=private.my_person_id() and e.participation_status='enrolled' and e.is_test=g.is_test and private.can_learn(w.cohort_id))
$$;
alter table public.slide_swap_groups enable row level security;
alter table public.slide_swap_members enable row level security;
revoke all on public.slide_swap_groups,public.slide_swap_members from public,anon,authenticated;
grant select on public.slide_swap_groups,public.slide_swap_members to authenticated;
create policy swap_groups_read on public.slide_swap_groups for select to authenticated using(private.is_admin() or private.can_read_swap(id));
create policy swap_members_read on public.slide_swap_members for select to authenticated using(private.is_admin() or private.can_read_swap(group_id));
alter function private.can_read_target(uuid) rename to can_read_target_before_swap;
create function private.can_read_target(p_target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or private.can_read_target_before_swap(p_target) or exists(select 1 from public.submission_targets t where t.id=p_target and private.can_read_swap(t.swap_group_id))
$$;
-- Policies retain the original function OID; extend it too, instead of silently leaving old policies behind.
create or replace function private.can_read_target_before_swap(p_target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists(select 1 from public.submission_targets t where t.id=p_target and (private.can_read_swap(t.swap_group_id) or t.team_id is not null and private.can_read_team(t.team_id) or t.enrollment_id is not null and not private.is_viewer() and exists(select 1 from public.cohort_enrollments e where e.id=t.enrollment_id and e.person_id=private.my_person_id())))
$$;
alter function private.resolve_submission_target(uuid) rename to resolve_submission_target_before_swap;
create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assignments where id=p_assignment and workflow='slide_swap') then raise exception using errcode='42501',message='Use the Slide Swap workspace';end if;
 return private.resolve_submission_target_before_swap(p_assignment);
end $$;
create or replace function private.validate_submission_scope() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.submission_targets;
begin
 if new.target_id is null then
  insert into public.submission_targets(assignment_id,enrollment_id,team_id) values(new.assignment_id,new.enrollment_id,new.team_id) on conflict do nothing;
  select * into t from public.submission_targets where assignment_id=new.assignment_id and enrollment_id is not distinct from new.enrollment_id and team_id is not distinct from new.team_id and swap_group_id is null;new.target_id=t.id;
 end if;
 select * into t from public.submission_targets where id=new.target_id;
 if t.assignment_id is distinct from new.assignment_id or t.enrollment_id is distinct from new.enrollment_id or t.team_id is distinct from new.team_id or t.swap_group_id is distinct from new.swap_group_id or not exists(select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id where a.id=new.assignment_id and
 (t.enrollment_id is not null and a.submission_mode='individual' and a.workflow<>'slide_swap' and exists(select 1 from public.cohort_enrollments e where e.id=t.enrollment_id and e.cohort_id=w.cohort_id)
 or t.team_id is not null and a.submission_mode='team' and exists(select 1 from public.cohort_teams g where g.id=t.team_id and g.cohort_id=w.cohort_id)
 or t.swap_group_id is not null and a.workflow='slide_swap' and a.submission_mode='individual' and exists(select 1 from public.slide_swap_groups g join private.swap_attempts snap on snap.group_id=g.id join private.swap_assets f on f.id=snap.asset_id where g.id=t.swap_group_id and g.assignment_id=a.id and snap.submission_id=new.id and new.submission_type='file' and f.kind='proof' and f.path=new.file_path and f.mime=new.mime_type and f.size=new.file_size))) then raise exception 'Invalid submission owner';end if;
 if new.supersedes_submission_id is not null and not exists(select 1 from public.submissions s where s.id=new.supersedes_submission_id and s.target_id=new.target_id and not s.is_current) then raise exception 'Invalid submission history';end if;
 if new.team_id is not null then update public.cohort_teams set locked=true where id=new.team_id;end if;return new;
end $$;

create function private.swap_ready(aid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.swap_configs where assignment_id=aid) and not exists(select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id join public.cohort_enrollments e on e.cohort_id=w.cohort_id where a.id=aid and e.participation_status='enrolled' and not e.is_test and not exists(select 1 from public.slide_swap_members m join public.slide_swap_groups g on g.id=m.group_id join private.swap_configs c on c.assignment_id=m.assignment_id where m.assignment_id=aid and m.enrollment_id=e.id and not g.is_test and exists(select 1 from jsonb_array_elements(c.stories) story where story->>'id'=m.story_id::text) and (select count(*) from public.slide_swap_members mm join public.cohort_enrollments ee on ee.id=mm.enrollment_id where mm.group_id=g.id and ee.participation_status='enrolled') between 2 and 3))
$$;
create function private.guard_swap() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if tg_table_name='program_weeks' then
  if new.published and exists(select 1 from public.assignments a where a.week_id=new.id and a.workflow='slide_swap' and not private.swap_ready(a.id)) then raise exception using errcode='22023',message='Assign a story and presentation group to every official participant before publishing';end if;
 elsif tg_table_name='assignments' then
  if new.workflow is distinct from old.workflow and (exists(select 1 from private.swap_assets where assignment_id=old.id) or exists(select 1 from private.swap_decks d join public.slide_swap_groups g on g.id=d.group_id where g.assignment_id=old.id) or new.workflow='slide_swap' and (exists(select 1 from public.submissions where assignment_id=old.id) or exists(select 1 from private.upload_intents where assignment_id=old.id) or exists(select 1 from private.schedule_runs where assignment_id=old.id) or exists(select 1 from private.case_runs where assignment_id=old.id) or exists(select 1 from private.guided_states where assignment_id=old.id) or exists(select 1 from private.investigation_runs where assignment_id=old.id) or exists(select 1 from public.assignment_completions where assignment_id=old.id))) then raise exception using errcode='22023',message='Existing work prevents changing this activity';end if;
 elsif tg_table_name='cohort_enrollments' then
  if new.is_test is distinct from old.is_test and exists(select 1 from public.slide_swap_members where enrollment_id=old.id) then raise exception using errcode='22023',message='Resolve the presentation group before changing test scope';end if;
 end if;return new;
end $$;
create trigger swap_publish before update of published on public.program_weeks for each row execute function private.guard_swap();
create trigger swap_workflow before update of workflow on public.assignments for each row execute function private.guard_swap();
create trigger swap_test_scope before update of is_test on public.cohort_enrollments for each row execute function private.guard_swap();

create function public.configure_slide_swap(p_assignment uuid,p_data jsonb,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.assignments;c private.swap_configs;g jsonb;m jsonb;story jsonb;gid uuid;eid uuid;sid uuid;scope boolean;seen uuid[]='{}';payload jsonb;receipt private.swap_receipts;idx integer;oldg public.slide_swap_groups;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required';end if;
 perform private.submission_gate();
 if p_request is null or octet_length(p_data::text)>1000000 then raise exception using errcode='22023',message='Invalid configuration';end if;
 payload=jsonb_build_object('assignment',p_assignment,'data',p_data);
 select * into receipt from private.swap_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then if receipt.payload<>payload then raise exception 'Request reused';end if;return;end if;
 select * into a from public.assignments where id=p_assignment for update;
 if a.id is null or a.submission_mode<>'individual' then raise exception using errcode='22023',message='Save Individual mode first';end if;
 select * into c from private.swap_configs where assignment_id=a.id for update;
 if coalesce(c.version,0) is distinct from (p_data->>'version')::bigint then raise exception using errcode='40001',message='Settings changed. Refresh before saving; your input is retained';end if;
 if jsonb_typeof(p_data->'stories') is distinct from 'array' or jsonb_typeof(p_data->'groups') is distinct from 'array' or p_data->>'overview' is null or length(btrim(p_data->>'overview')) not between 1 and 50000 then raise exception using errcode='22023',message='Add instructions, stories and presentation groups';end if;
 for story in select value from jsonb_array_elements(p_data->'stories') loop
  sid=(story->>'id')::uuid;if sid is null or sid=any(seen) or story->>'title' is null or story->>'body' is null or length(btrim(story->>'title')) not between 1 and 300 or length(btrim(story->>'body')) not between 1 and 50000 then raise exception using errcode='22023',message='Each story needs a unique ID, title and text';end if;seen=array_append(seen,sid);
 end loop;
 if exists(select 1 from private.swap_assets where assignment_id=a.id) and (c.stories is distinct from p_data->'stories' or c.overview is distinct from p_data->>'overview') then raise exception using errcode='22023',message='Stories and instructions are locked because deck work has begun';end if;
 if exists(select 1 from public.program_weeks where id=a.week_id and published) and (c.stories is distinct from p_data->'stories' or c.overview is distinct from p_data->>'overview') then raise exception using errcode='22023',message='Return the week to draft before changing stories';end if;
 update public.assignments set workflow='slide_swap' where id=a.id;
 insert into private.swap_configs values(a.id,p_data->>'overview',p_data->'stories',1) on conflict(assignment_id) do update set overview=excluded.overview,stories=excluded.stories,version=private.swap_configs.version+1;
 seen='{}';
 for g in select value from jsonb_array_elements(p_data->'groups') loop
  gid=(g->>'id')::uuid;scope=(g->>'isTest')::boolean;
  if gid is null or scope is null or g->>'name' is null or length(btrim(g->>'name')) not between 1 and 100 or jsonb_typeof(g->'members') is distinct from 'array' or jsonb_array_length(g->'members') not between 2 and 3 then raise exception using errcode='22023',message='Groups require two or three participants';end if;
  select * into oldg from public.slide_swap_groups where id=gid;
  if oldg.id is not null and oldg.assignment_id<>a.id then raise exception using errcode='42501',message='Invalid group';end if;
  if oldg.unlocked_at is not null then
   if oldg.name is distinct from g->>'name' or oldg.is_test<>scope or (select jsonb_agg(jsonb_build_object('enrollmentId',enrollment_id,'storyId',story_id) order by position) from public.slide_swap_members where group_id=gid) is distinct from g->'members' then raise exception using errcode='22023',message='An unlocked group cannot be changed';end if;
   continue;
  end if;
  insert into public.slide_swap_groups(id,assignment_id,name,is_test) values(gid,a.id,g->>'name',scope) on conflict(id) do update set name=excluded.name,is_test=excluded.is_test,version=public.slide_swap_groups.version+1;
  -- Only the groups in this save may exchange participants; frozen groups never change.
 end loop;
 if exists(select 1 from public.slide_swap_groups where assignment_id=a.id and unlocked_at is not null and not exists(select 1 from jsonb_array_elements(p_data->'groups') x where x->>'id'=id::text)) then raise exception using errcode='22023',message='Unlocked groups cannot be removed';end if;
 delete from public.slide_swap_members where assignment_id=a.id and group_id in(select id from public.slide_swap_groups where assignment_id=a.id and unlocked_at is null);
 for g in select value from jsonb_array_elements(p_data->'groups') loop
  gid=(g->>'id')::uuid;idx=0;
  for m in select value from jsonb_array_elements(g->'members') loop
   eid=(m->>'enrollmentId')::uuid;sid=(m->>'storyId')::uuid;idx=idx+1;
   if eid is null or eid=any(seen) or not exists(select 1 from public.cohort_enrollments e join public.program_weeks w on w.cohort_id=e.cohort_id where e.id=eid and w.id=a.week_id and e.is_test=(g->>'isTest')::boolean and (e.participation_status='enrolled' or exists(select 1 from private.swap_decks d where d.group_id=gid and d.enrollment_id=e.id))) or not exists(select 1 from jsonb_array_elements(p_data->'stories') x where x->>'id'=sid::text) then raise exception using errcode='22023',message='Choose enrolled participants and valid stories in the same cohort/scope';end if;
   if exists(select 1 from jsonb_array_elements(g->'members') x where x<>m and x->>'storyId'=sid::text) then raise exception using errcode='22023',message='Partners need different stories';end if;
   if exists(select 1 from private.swap_assets f join private.swap_configs cc on cc.assignment_id=f.assignment_id where f.assignment_id=a.id and f.enrollment_id=eid and not exists(select 1 from jsonb_array_elements(cc.stories) st where st->>'id'=sid::text)) then raise exception 'Story unavailable';end if;
   seen=array_append(seen,eid);
   if not exists(select 1 from public.slide_swap_groups where id=gid and unlocked_at is not null) then
    -- Decks may follow their author to a different not-yet-unlocked group, but never a different story.
    if exists(select 1 from private.swap_assets f where f.assignment_id=a.id and f.enrollment_id=eid) and exists(select 1 from private.swap_decks d where d.enrollment_id=eid and d.group_id<>gid) then raise exception 'Frozen participant cannot move';end if;
    if exists(select 1 from private.swap_assets f where f.assignment_id=a.id and f.enrollment_id=eid and f.story_id is distinct from sid) then raise exception using errcode='22023',message='A participant story is locked after deck work starts';end if;
    insert into public.slide_swap_members values(a.id,eid,gid,idx,sid);
    update private.swap_assets set group_id=gid where assignment_id=a.id and enrollment_id=eid and kind='deck' and state='ready';
   end if;
  end loop;
 end loop;
 delete from public.slide_swap_groups gg where gg.assignment_id=a.id and gg.unlocked_at is null and not exists(select 1 from jsonb_array_elements(p_data->'groups') x where x->>'id'=gg.id::text) and not exists(select 1 from private.swap_assets where group_id=gg.id);
 if exists(select 1 from public.program_weeks where id=a.week_id and published) and not private.swap_ready(a.id) then raise exception using errcode='22023',message='Every official participant needs a story and group';end if;
 insert into private.swap_receipts values(auth.uid(),p_request,payload,'{}');
end $$;

create function public.read_slide_swap(p_assignment uuid,p_admin boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assignments;c private.swap_configs;eid uuid;g public.slide_swap_groups;story jsonb;deck jsonb;assigned uuid;result jsonb;
begin
 select * into a from public.assignments where id=p_assignment;select * into c from private.swap_configs where assignment_id=p_assignment;
 if private.is_admin() and p_admin then
  return jsonb_build_object('workflow',a.workflow,'version',coalesce(c.version,0),'overview',c.overview,'stories',coalesce(c.stories,'[]'),'locked',exists(select 1 from private.swap_assets where assignment_id=a.id),'published',(select published from public.program_weeks where id=a.week_id),'groups',coalesce((select jsonb_agg(to_jsonb(g1)||jsonb_build_object('isTest',g1.is_test,'members',(select jsonb_agg(jsonb_build_object('enrollmentId',m.enrollment_id,'storyId',m.story_id,'name',p.full_name,'active',e.participation_status='enrolled','ready',exists(select 1 from private.swap_assets f where f.assignment_id=a.id and f.enrollment_id=e.id and f.kind='deck' and f.current and f.state='ready')) order by m.position) from public.slide_swap_members m join public.cohort_enrollments e on e.id=m.enrollment_id join public.people p on p.id=e.person_id where m.group_id=g1.id))) from public.slide_swap_groups g1 where g1.assignment_id=a.id),'[]'));
 end if;
 select e.id into eid from public.cohort_enrollments e join public.program_weeks w on w.cohort_id=e.cohort_id where w.id=a.week_id and w.published and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(w.cohort_id);
 if eid is null or private.is_viewer() then raise exception using errcode='42501',message='Access denied';end if;
 select gg.* into g from public.slide_swap_groups gg join public.slide_swap_members m on m.group_id=gg.id where m.assignment_id=a.id and m.enrollment_id=eid;
 if g.id is not null then
  select st into story from private.swap_configs cc cross join jsonb_array_elements(cc.stories) st join public.slide_swap_members m on m.story_id::text=st->>'id' where cc.assignment_id=a.id and m.assignment_id=a.id and m.enrollment_id=eid;
  select jsonb_build_object('id',id,'name',name) into deck from private.swap_assets where assignment_id=a.id and enrollment_id=eid and kind='deck' and current and state='ready';
  select d.asset_id into assigned from private.swap_decks d where d.group_id=g.id order by mod(d.position-(select position from public.slide_swap_members where assignment_id=a.id and enrollment_id=eid)-1+(select count(*)::integer from private.swap_decks where group_id=g.id),(select count(*)::integer from private.swap_decks where group_id=g.id)) limit 1;
 end if;
 result=jsonb_build_object('workflow',a.workflow,'overview',c.overview,'enrollmentId',eid,'story',story,'ownDeck',deck,'group',case when g.id is null then null else jsonb_build_object('id',g.id,'name',g.name,'unlockedAt',g.unlocked_at,'members',(select jsonb_agg(jsonb_build_object('id',e.id,'name',p.full_name,'active',e.participation_status='enrolled','ready',exists(select 1 from private.swap_assets f where f.assignment_id=a.id and f.enrollment_id=e.id and f.kind='deck' and f.current and f.state='ready')) order by m.position) from public.slide_swap_members m join public.cohort_enrollments e on e.id=m.enrollment_id join public.people p on p.id=e.person_id where m.group_id=g.id)) end,'assignedDeck',case when g.unlocked_at is null then null else (select jsonb_build_object('id',f.id,'name',f.name,'author',p.full_name) from private.swap_assets f join public.cohort_enrollments e on e.id=f.enrollment_id join public.people p on p.id=e.person_id where f.id=assigned) end,'attempts',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'assetId',snap.asset_id,'status',s.status,'feedback',s.feedback,'submittedAt',s.submitted_at,'updatedAt',s.updated_at,'current',s.is_current) order by s.submitted_at desc) from public.submissions s join private.swap_attempts snap on snap.submission_id=s.id where s.swap_group_id=g.id),'[]'));
 return result;
end $$;

create function private.swap_asset_allowed(fid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists(select 1 from private.swap_assets f where f.id=fid and f.state='ready' and private.can_read_swap(f.group_id) and (f.kind='proof' or f.enrollment_id in(select e.id from public.cohort_enrollments e where e.person_id=private.my_person_id()) or exists(select 1 from private.swap_decks d join public.slide_swap_members m on m.group_id=d.group_id where d.asset_id=f.id and m.enrollment_id in(select e.id from public.cohort_enrollments e where e.person_id=private.my_person_id()) and d.position=mod(m.position,(select count(*)::integer from private.swap_decks where group_id=d.group_id))+1)))
$$;
create function public.slide_swap_asset(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.swap_asset_allowed(p_id) then raise exception using errcode='42501',message='File unavailable';end if;
 return (select jsonb_build_object('id',id,'path',path,'name',name,'mime',mime,'size',size,'kind',kind) from private.swap_assets where id=p_id and state='ready');
end $$;

create function public.prepare_slide_swap(p_assignment uuid,p_kind text,p_file jsonb,p_expected uuid,p_expected_version timestamptz,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare eid uuid;g public.slide_swap_groups;f private.swap_assets;current_id uuid;v timestamptz;payload jsonb;receipt private.swap_receipts;mime text;
begin
 perform private.submission_gate();
 payload=jsonb_build_object('assignment',p_assignment,'kind',p_kind,'file',p_file,'expected',p_expected,'version',p_expected_version);
 select * into receipt from private.swap_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then if receipt.payload<>payload then raise exception 'Request reused';end if;return receipt.result;end if;
 select e.id into eid from public.cohort_enrollments e join public.program_weeks w on w.cohort_id=e.cohort_id join public.assignments a on a.week_id=w.id where a.id=p_assignment and a.workflow='slide_swap' and w.published and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(w.cohort_id);
 select gg.* into g from public.slide_swap_groups gg join public.slide_swap_members m on m.group_id=gg.id where m.assignment_id=p_assignment and m.enrollment_id=eid for update of gg;
 if eid is null or g.id is null or private.is_viewer() then raise exception using errcode='42501',message='Ask your GAP lead to configure your presentation group';end if;
 if p_kind='deck' then
  if g.unlocked_at is not null then raise exception using errcode='22023',message='Decks are frozen after the swap unlocks';end if;
  select id into current_id from private.swap_assets where assignment_id=p_assignment and enrollment_id=eid and kind='deck' and current and state='ready';
 elsif p_kind='proof' then
  if g.unlocked_at is null then raise exception using errcode='22023',message='Upload all decks before submitting meeting proof';end if;
  select id,updated_at into current_id,v from public.submissions where swap_group_id=g.id and is_current;
  if exists(select 1 from public.submissions where id=current_id and status='completed') then raise exception using errcode='22023',message='Completed proof cannot be replaced';end if;
 else raise exception 'Invalid upload kind';end if;
 if current_id is distinct from p_expected or v is distinct from p_expected_version then raise exception using errcode='40001',message='Work changed. Refresh before uploading again';end if;
 mime=p_file->>'mime';
 if p_request is null or (p_file->>'size')::bigint not between 1 and 20971520 or length(p_file->>'name') not between 1 and 250 or p_file->>'name' ~ '[[:cntrl:]/\\]' or p_kind='deck' and mime<>'application/pdf' or p_kind='proof' and mime not in ('image/png','image/jpeg','image/webp') then raise exception using errcode='22023',message='Choose a five-page PDF or a still PNG, JPEG or WebP proof, up to 20 MB';end if;
 if (select count(*) from private.swap_assets where owner_id=auth.uid() and state='pending' and expires_at>clock_timestamp())>=10 then raise exception using errcode='22023',message='Cancel an unfinished upload before starting another';end if;
 insert into private.swap_assets(assignment_id,enrollment_id,group_id,owner_id,story_id,kind,path,name,mime,size,expected_id,expected_version,group_version) values(p_assignment,eid,g.id,auth.uid(),(select story_id from public.slide_swap_members where assignment_id=p_assignment and enrollment_id=eid),p_kind,auth.uid()::text||'/'||gen_random_uuid()::text,p_file->>'name',mime,(p_file->>'size')::bigint,p_expected,p_expected_version,g.version) returning * into f;
 insert into private.swap_receipts values(auth.uid(),p_request,payload,jsonb_build_object('id',f.id,'path',f.path,'mime',f.mime));return jsonb_build_object('id',f.id,'path',f.path,'mime',f.mime);
end $$;

create function public.cancel_slide_swap(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.swap_assets set state='abandoned' where id=p_id and owner_id=auth.uid() and state='pending';
end $$;
create function public.finalize_slide_swap(p_actor uuid,p_id uuid,p_pages integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare f private.swap_assets;g public.slide_swap_groups;eid uuid;s public.submissions;t public.submission_targets;newid uuid;current_id uuid;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 perform private.submission_gate();
 select * into f from private.swap_assets where id=p_id and owner_id=p_actor for update;
 if f.id is null or not private.can_read_swap(f.group_id) then raise exception using errcode='42501',message='Upload unavailable';end if;
 if f.state='ready' then return jsonb_build_object('saved',true,'submissionId',f.submission_id);end if;
 select * into g from public.slide_swap_groups where id=f.group_id for update;
 if f.state<>'pending' or f.expires_at<=clock_timestamp() or g.version<>f.group_version or not exists(select 1 from public.slide_swap_members where group_id=g.id and enrollment_id=f.enrollment_id) then raise exception using errcode='40001',message='Upload expired or group changed. Refresh and upload again';end if;
 if not exists(select 1 from storage.objects where bucket_id='slide-swap' and name=f.path and (metadata->>'size')::bigint=f.size and metadata->>'mimetype'=f.mime) then raise exception using errcode='22023',message='Uploaded file does not match its metadata';end if;
 if f.kind='deck' then
  if p_pages is distinct from 5 or g.unlocked_at is not null then raise exception using errcode='22023',message='Upload exactly five PDF pages before the swap unlocks';end if;
  select id into current_id from private.swap_assets where assignment_id=f.assignment_id and enrollment_id=f.enrollment_id and kind='deck' and current and state='ready';
  if current_id is distinct from f.expected_id then raise exception using errcode='40001',message='Your deck changed in another tab. Refresh';end if;
  update private.swap_assets set current=false where id=current_id;
  update private.swap_assets set current=true,state='ready' where id=f.id;
  if not exists(select 1 from public.slide_swap_members m join public.cohort_enrollments e on e.id=m.enrollment_id where m.group_id=g.id and (e.participation_status<>'enrolled' or not exists(select 1 from private.swap_assets deck where deck.assignment_id=f.assignment_id and deck.enrollment_id=m.enrollment_id and deck.kind='deck' and deck.current and deck.state='ready'))) then
   insert into private.swap_decks select g.id,m.enrollment_id,m.position,deck.id,story from public.slide_swap_members m join private.swap_assets deck on deck.assignment_id=m.assignment_id and deck.enrollment_id=m.enrollment_id and deck.kind='deck' and deck.current and deck.state='ready' join private.swap_configs c on c.assignment_id=m.assignment_id cross join jsonb_array_elements(c.stories) story where m.group_id=g.id and story->>'id'=m.story_id::text;
   update public.slide_swap_groups set unlocked_at=clock_timestamp() where id=g.id;
  end if;
 else
  if g.unlocked_at is null then raise exception 'Swap not unlocked';end if;
  select * into s from public.submissions where swap_group_id=g.id and is_current for update;
  if s.id is distinct from f.expected_id or s.updated_at is distinct from f.expected_version or s.status='completed' then raise exception using errcode='40001',message='A partner changed the proof. Refresh before uploading again';end if;
  insert into public.submission_targets(assignment_id,swap_group_id) values(f.assignment_id,g.id) on conflict do nothing;select * into t from public.submission_targets where assignment_id=f.assignment_id and swap_group_id=g.id;
  newid=gen_random_uuid();
  insert into private.swap_attempts values(newid,g.id,f.id,array(select enrollment_id from private.swap_decks where group_id=g.id),clock_timestamp());
  update public.submissions set is_current=false where id=s.id;
  insert into public.submissions(id,assignment_id,target_id,swap_group_id,submitted_by,submission_type,original_filename,file_path,file_size,mime_type,supersedes_submission_id) values(newid,f.assignment_id,t.id,g.id,private.my_person_id(),'file',f.name,f.path,f.size,f.mime,s.id);
  update private.swap_assets set state='ready',submission_id=newid where id=f.id;
 end if;return jsonb_build_object('saved',true,'submissionId',newid);
end $$;

create function public.slide_swap_upload(p_actor uuid,p_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 if not exists(select 1 from private.swap_assets where id=p_id and owner_id=p_actor and private.can_read_swap(group_id)) then raise exception using errcode='42501',message='Upload unavailable';end if;
 return (select to_jsonb(f) from private.swap_assets f where id=p_id);
end $$;
create function private.can_upload_swap(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.swap_assets f where f.path=$1 and f.owner_id=auth.uid() and f.state='pending' and f.expires_at>clock_timestamp() and private.can_read_swap(f.group_id))
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('slide-swap','slide-swap',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp']);
create policy swap_insert on storage.objects for insert to authenticated with check(bucket_id='slide-swap' and private.can_upload_swap(name));
create function private.can_download_swap(path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.swap_assets f where f.path=$1 and private.swap_asset_allowed(f.id)) $$;
create policy swap_storage_read on storage.objects for select to authenticated using(bucket_id='slide-swap' and private.can_download_swap(name));
-- Private tables stay entirely RPC-only, including for admins.
revoke all on private.swap_configs,private.swap_assets,private.swap_decks,private.swap_attempts,private.swap_receipts from public,anon,authenticated;
do $$ declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and (p.proname like '%slide_swap%' or p.proname in ('can_read_swap','swap_ready','swap_asset_allowed','guard_swap','can_upload_swap','can_download_swap')) loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);end loop;end $$;
grant execute on function private.can_read_swap(uuid),private.can_upload_swap(text),private.can_download_swap(text),private.swap_asset_allowed(uuid),private.can_read_target(uuid) to authenticated;
grant execute on function public.read_slide_swap(uuid,boolean),public.configure_slide_swap(uuid,jsonb,uuid),public.slide_swap_asset(uuid),public.prepare_slide_swap(uuid,text,jsonb,uuid,timestamptz,uuid),public.cancel_slide_swap(uuid) to authenticated;
grant execute on function public.finalize_slide_swap(uuid,uuid,integer),public.slide_swap_upload(uuid,uuid) to service_role;
create function public.slide_swap_proof(p_submission uuid) returns uuid language sql stable security definer set search_path='' as $$ select snap.asset_id from private.swap_attempts snap join public.submissions s on s.id=snap.submission_id where s.id=p_submission and private.can_read_target(s.target_id) $$;
create function public.slide_swap_review(p_submission uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required';end if;
 return (select jsonb_build_object('members', (select jsonb_agg(jsonb_build_object('name',p.full_name,'assetId',d.asset_id,'story',d.story) order by d.position) from private.swap_decks d join public.cohort_enrollments e on e.id=d.enrollment_id join public.people p on p.id=e.person_id where d.group_id=snap.group_id),'photoId',snap.asset_id) from private.swap_attempts snap where snap.submission_id=p_submission);
end $$;
create function public.cleanup_slide_swap(p_done uuid[] default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 update private.swap_assets set state='cleaned' where id=any(p_done) and state='abandoned';
 update private.swap_assets set state='abandoned' where state='pending' and expires_at<clock_timestamp();
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'path',path)) from (select id,path from private.swap_assets where state='abandoned' order by expires_at limit 100) f),'[]');
end $$;
revoke all on function public.slide_swap_proof(uuid),public.slide_swap_review(uuid),public.cleanup_slide_swap(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.slide_swap_proof(uuid),public.slide_swap_review(uuid) to authenticated;
grant execute on function public.cleanup_slide_swap(uuid[]) to service_role;
create function private.unlock_swap(gid uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.slide_swap_groups;
begin
 select * into g from public.slide_swap_groups where id=gid for update;
 if g.unlocked_at is not null or (select count(*) from public.slide_swap_members where group_id=gid) not between 2 and 3 then return;end if;
 if exists(select 1 from public.slide_swap_members m join public.cohort_enrollments e on e.id=m.enrollment_id where m.group_id=gid and (e.participation_status<>'enrolled' or not exists(select 1 from private.swap_assets f where f.assignment_id=m.assignment_id and f.enrollment_id=m.enrollment_id and f.kind='deck' and f.current and f.state='ready'))) then return;end if;
 insert into private.swap_decks select gid,m.enrollment_id,m.position,f.id,st from public.slide_swap_members m join private.swap_assets f on f.assignment_id=m.assignment_id and f.enrollment_id=m.enrollment_id and f.kind='deck' and f.current and f.state='ready' join private.swap_configs c on c.assignment_id=m.assignment_id cross join jsonb_array_elements(c.stories) st where m.group_id=gid and st->>'id'=m.story_id::text;
 update public.slide_swap_groups set unlocked_at=clock_timestamp() where id=gid;
end $$;
revoke all on function private.unlock_swap(uuid) from public,anon,authenticated,service_role;
do $$ declare body text;begin
 body=pg_get_functiondef('public.configure_slide_swap(uuid,jsonb,uuid)'::regprocedure);
 body=replace(body,'insert into private.swap_receipts values(auth.uid(),p_request,payload,''{}'');','perform private.unlock_swap(id) from public.slide_swap_groups where assignment_id=a.id; insert into private.swap_receipts values(auth.uid(),p_request,payload,''{}'');');
 execute body;
 body=pg_get_functiondef('public.read_slide_swap(uuid,boolean)'::regprocedure);
 body=replace(body,'where g1.assignment_id=a.id)', 'where g1.assignment_id=a.id and exists(select 1 from public.slide_swap_members m where m.group_id=g1.id))');execute body;
end $$;
alter function public.file_upload(uuid,text,uuid,jsonb) set schema private;
alter function private.file_upload(uuid,text,uuid,jsonb) rename to file_upload_before_swap;
revoke all on function private.file_upload_before_swap(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.file_upload(p_actor uuid,p_action text,p_intent uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare aid uuid;
begin
 aid=case when p_action='prepare' then (p_data->>'assignmentId')::uuid else (select assignment_id from private.upload_intents where id=p_intent) end;
 if exists(select 1 from public.assignments where id=aid and workflow='slide_swap') then raise exception using errcode='42501',message='Use the Slide Swap workspace';end if;
 return private.file_upload_before_swap(p_actor,p_action,p_intent,p_data);
end $$;
revoke all on function public.file_upload(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.file_upload(uuid,text,uuid,jsonb) to service_role;
revoke all on function private.resolve_submission_target(uuid) from public,anon,authenticated,service_role;
alter table public.slide_swap_groups drop constraint slide_swap_groups_assignment_id_fkey;
alter table public.slide_swap_groups add foreign key(assignment_id) references public.assignments(id) on delete cascade;
alter table public.slide_swap_members drop constraint slide_swap_members_assignment_id_fkey,drop constraint slide_swap_members_group_id_fkey;
alter table public.slide_swap_members add foreign key(assignment_id) references public.assignments(id) on delete cascade,add foreign key(group_id) references public.slide_swap_groups(id) on delete cascade;
do $$ declare body text;begin
 body=pg_get_functiondef('public.read_slide_swap(uuid,boolean)'::regprocedure);
 body=replace(body,'if eid is null or private.is_viewer() then', 'if a.workflow<>''slide_swap'' or eid is null or private.is_viewer() then');execute body;
end $$;
revoke all on function private.can_read_target(uuid) from public,anon;
alter table private.swap_configs enable row level security;
alter table private.swap_assets enable row level security;
alter table private.swap_decks enable row level security;
alter table private.swap_attempts enable row level security;
alter table private.swap_receipts enable row level security;
create or replace function public.cancel_slide_swap(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.swap_assets where id=p_id and owner_id=auth.uid() and private.can_read_swap(group_id)) then raise exception using errcode='42501',message='Upload unavailable';end if;
 update private.swap_assets set state='abandoned' where id=p_id and owner_id=auth.uid() and state='pending';
end $$;
commit;
