begin;
alter table public.assignments drop constraint assignments_workflow_check;
alter table public.assignments add constraint assignments_workflow_check check(workflow in ('standard','guided','cases','investigation','schedule'));
alter table public.assignments add constraint schedule_individual_only check(workflow<>'schedule' or submission_mode='individual');
create table private.schedule_configs(assignment_id uuid primary key references public.assignments(id),content jsonb not null,version bigint not null default 1);
create table private.schedule_runs(
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references private.schedule_configs(assignment_id),
 enrollment_id uuid not null references public.cohort_enrollments(id),working jsonb not null,original jsonb,revised jsonb,
 explanation text not null default '' check(length(explanation)<=2000),version bigint not null default 0,
 saved_at timestamptz,revealed_at timestamptz,unique(assignment_id,enrollment_id));
create table private.schedule_attempts(
 submission_id uuid primary key references public.submissions(id) deferrable initially deferred,
 assignment_id uuid not null references private.schedule_configs(assignment_id),enrollment_id uuid not null references public.cohort_enrollments(id),
 original jsonb not null,revised jsonb not null,explanation text not null,created_at timestamptz not null default clock_timestamp());
create table private.schedule_receipts(actor_id uuid not null references auth.users(id),request_id uuid not null,payload jsonb not null,result jsonb not null,primary key(actor_id,request_id));
alter table private.schedule_configs enable row level security;
alter table private.schedule_runs enable row level security;
alter table private.schedule_attempts enable row level security;
alter table private.schedule_receipts enable row level security;
revoke all on private.schedule_configs,private.schedule_runs,private.schedule_attempts,private.schedule_receipts from public,anon,authenticated,service_role;

create function private.valid_schedule(rows jsonb,complete boolean) returns boolean language plpgsql immutable set search_path='' as $$
declare r jsonb; cell jsonb; ids text[]='{}'; rid uuid;
begin
 if jsonb_typeof(rows) is distinct from 'array' or jsonb_array_length(rows)>30 or (complete and jsonb_array_length(rows)=0) then return false;end if;
 for r in select value from jsonb_array_elements(rows) loop
  if jsonb_typeof(r) is distinct from 'object' or (r-array['id','name','weeks'])<>'{}'::jsonb or jsonb_typeof(r->'id') is distinct from 'string' or jsonb_typeof(r->'name') is distinct from 'string'
   or length(r->>'name')>200 or (complete and (r->>'name') ~ '^[[:space:]]*$') or jsonb_typeof(r->'weeks') is distinct from 'array' then return false;end if;
  begin rid=(r->>'id')::uuid;exception when invalid_text_representation then return false;end;
  if rid is null or rid::text=any(ids) or jsonb_array_length(r->'weeks')>10 or (complete and jsonb_array_length(r->'weeks')=0) then return false;end if;
  ids=array_append(ids,rid::text);
  if (select count(*) from jsonb_array_elements(r->'weeks'))<>(select count(distinct value) from jsonb_array_elements(r->'weeks')) then return false;end if;
  for cell in select value from jsonb_array_elements(r->'weeks') loop
   if jsonb_typeof(cell)<>'number' or cell::text !~ '^(10|[1-9])$' then return false;end if;
  end loop;
 end loop;return true;
end $$;
create function private.schedule_enrollment(p_assignment uuid) returns uuid language plpgsql stable security definer set search_path='' as $$
declare eid uuid;
begin
 if private.is_viewer() then raise exception using errcode='42501',message='Participant access required';end if;
 select e.id into eid from public.assignments a join public.program_weeks w on w.id=a.week_id join public.cohort_enrollments e on e.cohort_id=w.cohort_id
 where a.id=p_assignment and a.workflow='schedule' and w.published and private.can_learn(w.cohort_id) and e.person_id=private.my_person_id() and e.participation_status='enrolled';
 if eid is null then raise exception using errcode='42501',message='Schedule unavailable';end if;return eid;
end $$;
revoke all on function private.valid_schedule(jsonb,boolean),private.schedule_enrollment(uuid) from public,anon,authenticated,service_role;

create function public.read_schedule(p_assignment uuid,p_preview boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assignments;w public.program_weeks;c private.schedule_configs;r private.schedule_runs;eid uuid;preview boolean;attempts jsonb;
begin
 select * into a from public.assignments where id=p_assignment;select * into w from public.program_weeks where id=a.week_id;
 if a.id is null or (not private.is_admin() and not(w.published and private.can_read_content(w.cohort_id))) then raise exception using errcode='42501',message='Schedule unavailable';end if;
 preview=private.is_admin() and p_preview;
 if p_preview and not private.is_admin() and not private.is_viewer() then raise exception using errcode='42501',message='Preview unavailable';end if;
 select * into c from private.schedule_configs where assignment_id=a.id;
 if a.workflow='schedule' and not preview and not private.is_viewer() then
  eid=private.schedule_enrollment(a.id);select * into r from private.schedule_runs where assignment_id=a.id and enrollment_id=eid;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'status',s.status,'feedback',s.feedback,'updatedAt',s.updated_at,'submittedAt',s.submitted_at,'isCurrent',s.is_current,
   'original',i.original,'revised',i.revised,'explanation',i.explanation) order by s.submitted_at desc),'[]'::jsonb) into attempts
   from public.submissions s join private.schedule_attempts i on i.submission_id=s.id where s.assignment_id=a.id and s.enrollment_id=eid;
 end if;
 return jsonb_build_object('workflow',a.workflow,'configVersion',coalesce(c.version,0),'overview',c.content->>'overview',
 'locked',case when preview then exists(select 1 from private.schedule_runs where assignment_id=a.id) or exists(select 1 from public.submissions where assignment_id=a.id)
  or exists(select 1 from private.upload_intents where assignment_id=a.id) or exists(select 1 from public.assignment_completions where assignment_id=a.id)
  or exists(select 1 from private.case_runs where assignment_id=a.id) or exists(select 1 from private.guided_states where assignment_id=a.id)
  or exists(select 1 from private.investigation_runs where assignment_id=a.id) else null end,
 'scenario',case when not private.is_viewer() then c.content->>'scenario' end,
 'disruption',case when preview or r.revealed_at is not null then c.content->>'disruption' end,
 'starter',case when not private.is_viewer() then c.content->'starter' end,'config',case when preview then c.content end,
 'run',case when r.id is not null then jsonb_build_object('version',r.version,'working',r.working,'original',r.original,'revised',r.revised,'explanation',r.explanation,'savedAt',r.saved_at,'revealedAt',r.revealed_at) end,
 'attempts',coalesce(attempts,'[]'::jsonb));
end $$;
revoke all on function public.read_schedule(uuid,boolean) from public,anon,authenticated;
grant execute on function public.read_schedule(uuid,boolean) to authenticated;

create function public.mutate_schedule(p_action text,p_assignment uuid,p_data jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.assignments;c private.schedule_configs;r private.schedule_runs;receipt private.schedule_receipts;eid uuid;expected bigint;
 payload jsonb;result jsonb;content jsonb;rows jsonb;reason text;target public.submission_targets;s public.submissions;sid uuid;
begin
 perform private.submission_gate();
 if private.my_person_id() is null or private.is_viewer() or p_request is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception using errcode='42501',message='Access denied';end if;
 if octet_length(p_data::text)>(case when p_action='configure' then 1000000 else 100000 end) then raise exception using errcode='22023',message='Schedule data is too large';end if;
 select * into a from public.assignments where id=p_assignment for update;
 if a.id is null then raise exception using errcode='22023',message='Save the assignment first';end if;
 if p_action='configure' then
  if not private.is_admin() then raise exception using errcode='42501',message='Admin required';end if;
 else eid=private.schedule_enrollment(a.id);end if;
 payload=jsonb_build_object('action',p_action,'assignment',a.id,'enrollment',eid,'data',p_data);
 select * into receipt from private.schedule_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then if receipt.payload<>payload then raise exception using errcode='22023',message='Retry request changed';end if;return receipt.result;end if;
 if jsonb_typeof(p_data->'version') is distinct from 'number' or (p_data->>'version') !~ '^[0-9]+$' then raise exception using errcode='22023',message='Reload before saving';end if;
 expected=(p_data->>'version')::bigint;
 select * into c from private.schedule_configs where assignment_id=a.id for update;
 if p_action='configure' then
  if a.submission_mode<>'individual' or exists(select 1 from public.program_weeks where id=a.week_id and published) then raise exception using errcode='22023',message='Use Individual mode and a draft week';end if;
  if exists(select 1 from private.schedule_runs where assignment_id=a.id) or exists(select 1 from public.submissions where assignment_id=a.id)
   or exists(select 1 from private.upload_intents where assignment_id=a.id) or exists(select 1 from public.assignment_completions where assignment_id=a.id)
   or exists(select 1 from private.case_runs where assignment_id=a.id) or exists(select 1 from private.guided_states where assignment_id=a.id)
   or exists(select 1 from private.investigation_runs where assignment_id=a.id) then raise exception using errcode='22023',message='Activity configuration is locked because work exists';end if;
  if expected<>coalesce(c.version,0) then raise exception using errcode='40001',message='Configuration changed. Copy your edits before reloading';end if;
  content=p_data->'content';
  if jsonb_typeof(content) is distinct from 'object' or exists(select 1 from unnest(array['overview','scenario','disruption']) k where jsonb_typeof(content->k) is distinct from 'string' or (content->>k) ~ '^[[:space:]]*$' or length(content->>k)>50000)
   or not private.valid_schedule(content->'starter',true) then raise exception using errcode='22023',message='Complete all instructions and a valid starting schedule';end if;
  insert into private.schedule_configs(assignment_id,content) values(a.id,content) on conflict(assignment_id) do update set content=excluded.content,version=schedule_configs.version+1;
  update public.assignments set workflow='schedule' where id=a.id;result=jsonb_build_object('saved',true);
 elsif p_action in ('draft','reveal','submit') then
  if a.workflow<>'schedule' or c.assignment_id is null then raise exception using errcode='22023',message='Your schedule activity is being prepared';end if;
  if jsonb_typeof(p_data->'configVersion') is distinct from 'number' or (p_data->>'configVersion')::bigint is distinct from c.version then raise exception using errcode='40001',message='The activity instructions changed. Copy your work before reloading';end if;
  insert into private.schedule_runs(assignment_id,enrollment_id,working) values(a.id,eid,c.content->'starter') on conflict do nothing;
  select * into r from private.schedule_runs where assignment_id=a.id and enrollment_id=eid for update;
  if expected<>r.version then raise exception using errcode='40001',message='Your schedule changed in another tab. Copy your input before reloading';end if;
  rows=p_data->'rows';reason=p_data->>'explanation';
  if not private.valid_schedule(rows,p_action<>'draft') or jsonb_typeof(p_data->'explanation') is distinct from 'string' or length(reason)>2000 then raise exception using errcode='22023',message='Use up to 30 tasks, 200 characters per name, weeks 1–10 and 2,000 explanation characters. Name and schedule every task before proceeding';end if;
  target=private.resolve_submission_target_before_cases(a.id);
  select * into s from public.submissions where target_id=target.id and is_current for update;
  if s.status='completed' then raise exception using errcode='22023',message='Completed schedules are read-only';end if;
  if p_action='reveal' then
   if r.revealed_at is not null then raise exception using errcode='22023',message='The original plan is already locked';end if;
   update private.schedule_runs set working=rows,original=rows,revised=rows,explanation='',revealed_at=clock_timestamp(),saved_at=clock_timestamp(),version=version+1 where id=r.id;
  elsif p_action='submit' then
   if r.revealed_at is null or reason ~ '^[[:space:]]*$' then raise exception using errcode='22023',message='Reveal the disruption and explain your changes before submitting';end if;
   if s.id is distinct from (p_data->>'expectedId')::uuid or s.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz then raise exception using errcode='40001',message='Your submission changed. Refresh before submitting again';end if;
   sid=gen_random_uuid();
   insert into private.schedule_attempts(submission_id,assignment_id,enrollment_id,original,revised,explanation) values(sid,a.id,eid,r.original,rows,reason);
   update public.submissions set is_current=false where id=s.id;
   insert into public.submissions(id,assignment_id,target_id,enrollment_id,submitted_by,submission_type,submitted_text,supersedes_submission_id)
   values(sid,a.id,target.id,eid,private.my_person_id(),'text','Schedule planning conclusion: '||reason,s.id);
   update private.schedule_runs set revised=rows,explanation=reason,saved_at=clock_timestamp(),version=version+1 where id=r.id;
  else
   update private.schedule_runs set working=case when r.revealed_at is null then rows else working end,revised=case when r.revealed_at is not null then rows else revised end,
    explanation=case when r.revealed_at is not null then reason else '' end,saved_at=clock_timestamp(),version=version+1 where id=r.id;
  end if;
  result=jsonb_build_object('saved',true,'submissionId',sid);
 else raise exception using errcode='22023',message='Unknown schedule operation';end if;
 insert into private.schedule_receipts values(auth.uid(),p_request,payload,result);return result;
end $$;
revoke all on function public.mutate_schedule(text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mutate_schedule(text,uuid,jsonb,uuid) to authenticated;

create function private.guard_schedule() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if tg_table_name='assignments' then
  if new.workflow is distinct from old.workflow and exists(select 1 from private.schedule_runs where assignment_id=old.id) then raise exception using errcode='22023',message='Workflow is locked because schedule activity exists';end if;
  if new.workflow='schedule' and old.workflow<>'schedule' and (exists(select 1 from public.submissions where assignment_id=old.id) or exists(select 1 from private.upload_intents where assignment_id=old.id)
   or exists(select 1 from public.assignment_completions where assignment_id=old.id) or exists(select 1 from private.case_runs where assignment_id=old.id)
   or exists(select 1 from private.guided_states where assignment_id=old.id) or exists(select 1 from private.investigation_runs where assignment_id=old.id)) then raise exception using errcode='22023',message='Existing activity prevents conversion';end if;
 elsif tg_table_name='program_weeks' then
  if new.published and exists(select 1 from public.assignments a where a.week_id=new.id and a.workflow='schedule' and not exists(select 1 from private.schedule_configs c where c.assignment_id=a.id)) then raise exception using errcode='22023',message='Configure every schedule activity before publishing';end if;
 else
  if exists(select 1 from public.assignments where id=new.assignment_id and workflow='schedule') then
   if tg_table_name='assignment_completions' then raise exception using errcode='42501',message='Review the schedule submission instead of granting manual credit';end if;
   if not exists(select 1 from private.schedule_attempts i join private.schedule_runs r on r.assignment_id=i.assignment_id and r.enrollment_id=i.enrollment_id
    where i.submission_id=new.id and i.assignment_id=new.assignment_id and i.enrollment_id=new.enrollment_id and new.team_id is null and new.submission_type='text'
    and new.submitted_text='Schedule planning conclusion: '||i.explanation and i.original=r.original and r.revealed_at is not null
    and private.valid_schedule(i.original,true) and private.valid_schedule(i.revised,true) and i.explanation !~ '^[[:space:]]*$' and length(i.explanation)<=2000)
    then raise exception using errcode='42501',message='Use the schedule workspace to submit';end if;
  end if;
 end if;return new;
end $$;
revoke all on function private.guard_schedule() from public,anon,authenticated,service_role;
create trigger schedule_workflow_lock before update of workflow on public.assignments for each row execute function private.guard_schedule();
create trigger schedule_publish_ready before insert or update on public.program_weeks for each row execute function private.guard_schedule();
create trigger schedule_checked_submit before insert on public.submissions for each row execute function private.guard_schedule();
create trigger schedule_credit_denied before insert on public.assignment_completions for each row execute function private.guard_schedule();
alter function private.resolve_submission_target(uuid) rename to resolve_submission_target_before_schedule;
create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if exists(select 1 from public.assignments where id=p_assignment and workflow='schedule') then raise exception using errcode='42501',message='Use the schedule workspace';end if;
 return private.resolve_submission_target_before_schedule(p_assignment);
end $$;
revoke all on function private.resolve_submission_target(uuid),private.resolve_submission_target_before_schedule(uuid) from public,anon,authenticated,service_role;
-- Existing prepared uploads cannot bypass the new activity after a mode/configuration change.
create or replace function private.may_upload(p_path text) returns boolean language sql volatile security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from private.upload_intents i
 join public.cohort_enrollments e on e.id=i.enrollment_id join public.submission_targets t on t.id=i.target_id
 join public.assignments a on a.id=i.assignment_id join public.program_weeks w on w.id=a.week_id
 where i.path=p_path and i.owner_id=auth.uid() and i.state='pending' and i.expires_at>clock_timestamp()
 and a.workflow not in ('investigation','schedule') and (i.mime_type not in ('image/png','image/jpeg','image/webp') or a.workflow='standard')
 and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(e.cohort_id) and w.published
 and (t.enrollment_id=e.id or exists(select 1 from public.team_memberships m join public.cohort_teams g on g.id=m.team_id where m.enrollment_id=e.id and g.id=t.team_id and g.version=i.team_version))
 and not exists(select 1 from public.submissions s where s.target_id=t.id and s.is_current and s.status='completed'))
$$;
create function public.schedule_review(p_submission uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required';end if;
 return (select jsonb_build_object('original',original,'revised',revised,'explanation',explanation) from private.schedule_attempts where submission_id=p_submission);
end $$;
revoke all on function public.schedule_review(uuid) from public,anon,authenticated;
grant execute on function public.schedule_review(uuid) to authenticated;
commit;
