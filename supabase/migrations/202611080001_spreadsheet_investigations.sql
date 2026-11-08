begin;
alter table public.assignments drop constraint assignments_workflow_check;
alter table public.assignments add constraint assignments_workflow_check check(workflow in ('standard','guided','cases','investigation'));
alter table public.assignments add constraint investigation_individual_only check(workflow<>'investigation' or submission_mode='individual');

create table private.investigation_configs (
 assignment_id uuid primary key references public.assignments(id), content jsonb not null, version bigint not null default 1
);
create table private.investigation_runs (
 id uuid primary key default gen_random_uuid(), assignment_id uuid not null references private.investigation_configs(assignment_id),
 enrollment_id uuid not null references public.cohort_enrollments(id), name text not null default '', reason text not null default '',
 version bigint not null default 0, saved_at timestamptz, unique(assignment_id,enrollment_id),
 check(length(name)<=200 and length(reason)<=2000)
);
create table private.investigation_reveals (
 run_id uuid not null references private.investigation_runs(id), hint_id uuid not null,
 opened_at timestamptz not null default clock_timestamp(), primary key(run_id,hint_id)
);
create table private.investigation_attempts (
 submission_id uuid primary key references public.submissions(id) deferrable initially deferred,
 assignment_id uuid not null references private.investigation_configs(assignment_id),
 enrollment_id uuid not null references public.cohort_enrollments(id),
 name text not null, reason text not null, hints jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create table private.investigation_receipts (
 actor_id uuid not null references auth.users(id), request_id uuid not null,
 payload jsonb not null, result jsonb not null, primary key(actor_id,request_id)
);
alter table private.investigation_configs enable row level security;
alter table private.investigation_runs enable row level security;
alter table private.investigation_reveals enable row level security;
alter table private.investigation_attempts enable row level security;
alter table private.investigation_receipts enable row level security;
revoke all on private.investigation_configs,private.investigation_runs,private.investigation_reveals,private.investigation_attempts,private.investigation_receipts from public,anon,authenticated,service_role;

create function private.investigation_name(p_name text) returns text language sql immutable set search_path='' as $$
 select lower(btrim(regexp_replace(normalize(p_name,NFKC),'[[:space:]]+',' ','g')))
$$;
create function private.investigation_enrollment(p_assignment uuid) returns uuid language plpgsql stable security definer set search_path='' as $$
declare eid uuid;
begin
 if private.is_viewer() then raise exception using errcode='42501',message='Participant access required'; end if;
 select e.id into eid from public.assignments a join public.program_weeks w on w.id=a.week_id
 join public.cohort_enrollments e on e.cohort_id=w.cohort_id
 where a.id=p_assignment and a.workflow='investigation' and w.published and private.can_learn(w.cohort_id)
 and e.person_id=private.my_person_id() and e.participation_status='enrolled';
 if eid is null then raise exception using errcode='42501',message='Investigation unavailable'; end if;
 return eid;
end $$;
revoke all on function private.investigation_name(text),private.investigation_enrollment(uuid) from public,anon,authenticated,service_role;

create function public.read_investigation(p_assignment uuid,p_preview boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.assignments; w public.program_weeks; c private.investigation_configs; r private.investigation_runs;
 eid uuid; stages jsonb; sub jsonb; admin_preview boolean;
begin
 select * into a from public.assignments where id=p_assignment;
 select * into w from public.program_weeks where id=a.week_id;
 if a.id is null or (not private.is_admin() and not(w.published and private.can_read_content(w.cohort_id))) then raise exception using errcode='42501',message='Investigation unavailable'; end if;
 admin_preview=private.is_admin() and p_preview;
 if p_preview and not private.is_admin() and not private.is_viewer() then raise exception using errcode='42501',message='Preview unavailable'; end if;
 select * into c from private.investigation_configs where assignment_id=a.id;
 if a.workflow='investigation' and not admin_preview and not private.is_viewer() then
  eid=private.investigation_enrollment(a.id);
  select * into r from private.investigation_runs where assignment_id=a.id and enrollment_id=eid;
  select jsonb_build_object('id',s.id,'status',s.status,'feedback',s.feedback,'updatedAt',s.updated_at,'submittedAt',s.submitted_at,'name',i.name,'reason',i.reason)
  into sub from public.submissions s join private.investigation_attempts i on i.submission_id=s.id
  where s.assignment_id=a.id and s.enrollment_id=eid and s.is_current;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',stage->>'id','title',stage->>'title','hints',
  case when private.is_viewer() then '[]'::jsonb else (
   select coalesce(jsonb_agg(jsonb_build_object('id',h->>'id','title',h->>'title','optional',coalesce((h->>'optional')::boolean,false),
    'body',case when admin_preview or rev.hint_id is not null then h->>'body' end,'openedAt',rev.opened_at) order by hn),'[]'::jsonb)
   from jsonb_array_elements(stage->'hints') with ordinality as hints(h,hn)
   left join private.investigation_reveals rev on rev.run_id=r.id and rev.hint_id=(h->>'id')::uuid
  ) end) order by sn),'[]'::jsonb) into stages
 from jsonb_array_elements(coalesce(c.content->'stages','[]')) with ordinality as ss(stage,sn);
 return jsonb_build_object('workflow',a.workflow,'configVersion',coalesce(c.version,0),'overview',c.content->>'overview',
 'workbookUrl',c.content->>'workbookUrl','stages',stages,'config',case when admin_preview then c.content end,
 'run',case when r.id is not null then jsonb_build_object('version',r.version,'name',r.name,'reason',r.reason,'savedAt',r.saved_at) end,'submission',sub);
end $$;
revoke all on function public.read_investigation(uuid,boolean) from public,anon,authenticated;
grant execute on function public.read_investigation(uuid,boolean) to authenticated;

create function public.mutate_investigation(p_action text,p_assignment uuid,p_data jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare a public.assignments; c private.investigation_configs; r private.investigation_runs; receipt private.investigation_receipts;
 eid uuid; expected bigint; stage jsonb; h jsonb; previous jsonb; ids uuid[]='{}'; n int; total int=0;
 payload jsonb; result jsonb; hints jsonb; target public.submission_targets; s public.submissions; sid uuid;
 v_name text; v_reason text; text_value text; matched boolean; content jsonb;
begin
 perform private.submission_gate();
 if private.my_person_id() is null or private.is_viewer() or p_request is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception using errcode='42501',message='Access denied'; end if;
 select * into a from public.assignments where id=p_assignment for update;
 if a.id is null then raise exception using errcode='22023',message='Save the assignment first'; end if;
 if p_action='configure' then
  if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 else eid=private.investigation_enrollment(a.id); end if;
 payload=jsonb_build_object('action',p_action,'assignment',a.id,'enrollment',eid,'data',p_data);
 select * into receipt from private.investigation_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then
  if receipt.payload<>payload then raise exception using errcode='22023',message='Retry request changed'; end if;
  return receipt.result;
 end if;
 expected=(p_data->>'version')::bigint;
 if expected is null or expected<0 then raise exception using errcode='22023',message='Reload before saving'; end if;
 select * into c from private.investigation_configs where assignment_id=a.id for update;
 if p_action='configure' then
  if a.submission_mode<>'individual' or exists(select 1 from public.program_weeks where id=a.week_id and published) then raise exception using errcode='22023',message='Use Individual mode and return the week to draft before configuration'; end if;
  if exists(select 1 from private.investigation_runs where assignment_id=a.id) or exists(select 1 from public.submissions where assignment_id=a.id)
   or exists(select 1 from private.upload_intents where assignment_id=a.id) or exists(select 1 from public.assignment_completions where assignment_id=a.id)
   or exists(select 1 from private.case_runs where assignment_id=a.id) or exists(select 1 from private.guided_states where assignment_id=a.id)
  then raise exception using errcode='22023',message='Workflow is locked because participant activity exists'; end if;
  if expected<>coalesce(c.version,0) then raise exception using errcode='40001',message='Configuration changed. Copy your edits before reloading'; end if;
  content=p_data->'content';
  if jsonb_typeof(content) is distinct from 'object' or jsonb_typeof(content->'overview') is distinct from 'string' or length(btrim(content->>'overview')) not between 1 and 50000
   or jsonb_typeof(content->'workbookUrl') is distinct from 'string' or content->>'workbookUrl' !~ '^https?://[^[:space:]]+$'
   or length(content->>'workbookUrl')>2000 or jsonb_typeof(content->'gradingGuidance') is distinct from 'string' or length(content->>'gradingGuidance')>50000
   or jsonb_typeof(content->'acceptedNames') is distinct from 'array' or jsonb_array_length(content->'acceptedNames') not between 1 and 20
   or jsonb_typeof(content->'stages') is distinct from 'array' or jsonb_array_length(content->'stages') not between 1 and 12
  then raise exception using errcode='22023',message='Complete the overview, student workbook, accepted names and stages'; end if;
  for h in select value from jsonb_array_elements(content->'acceptedNames') loop
   if jsonb_typeof(h) is distinct from 'string' or length(btrim(h#>>'{}')) not between 1 and 200 then raise exception using errcode='22023',message='Accepted names require 1–200 characters'; end if;
  end loop;
  for stage in select value from jsonb_array_elements(content->'stages') loop
   if jsonb_typeof(stage->'id') is distinct from 'string' or (stage->>'id')::uuid=any(ids) then raise exception using errcode='22023',message='Unique stage IDs required'; end if;
   ids=array_append(ids,(stage->>'id')::uuid);
   if jsonb_typeof(stage->'title') is distinct from 'string' or length(btrim(stage->>'title')) not between 1 and 200 or jsonb_typeof(stage->'hints') is distinct from 'array' or jsonb_array_length(stage->'hints') not between 1 and 24 then raise exception using errcode='22023',message='Every stage requires a title and hints'; end if;
   for h in select value from jsonb_array_elements(stage->'hints') loop
    if jsonb_typeof(h->'id') is distinct from 'string' or (h->>'id')::uuid=any(ids) then raise exception using errcode='22023',message='Unique hint IDs required'; end if;
    ids=array_append(ids,(h->>'id')::uuid); total=total+1;
    if jsonb_typeof(h->'title') is distinct from 'string' or length(btrim(h->>'title')) not between 1 and 200 or jsonb_typeof(h->'body') is distinct from 'string' or length(btrim(h->>'body')) not between 1 and 50000 or jsonb_typeof(h->'optional') is distinct from 'boolean' then raise exception using errcode='22023',message='Every hint requires a title, body and optional flag'; end if;
   end loop;
  end loop;
  if total>100 or octet_length(content::text)>1000000 then raise exception using errcode='22023',message='Investigation configuration is too large'; end if;
  insert into private.investigation_configs(assignment_id,content) values(a.id,content) on conflict(assignment_id) do update set content=excluded.content,version=investigation_configs.version+1;
  update public.assignments set workflow='investigation' where id=a.id;
  result=jsonb_build_object('saved',true);
 else
  if a.workflow<>'investigation' or c.assignment_id is null then raise exception using errcode='22023',message='Your investigation is being prepared'; end if;
  insert into private.investigation_runs(assignment_id,enrollment_id) values(a.id,eid) on conflict do nothing;
  select * into r from private.investigation_runs where assignment_id=a.id and enrollment_id=eid for update;
  if p_action='reveal' then
   for stage in select value from jsonb_array_elements(c.content->'stages') loop
    previous=null;
    for h in select value from jsonb_array_elements(stage->'hints') loop
     if h->>'id'=p_data->>'hintId' then
      if not (h->>'optional')::boolean and previous is not null and not exists(select 1 from private.investigation_reveals where run_id=r.id and hint_id=(previous->>'id')::uuid) then raise exception using errcode='22023',message='Open the preceding hint in this stage first'; end if;
      insert into private.investigation_reveals(run_id,hint_id) values(r.id,(h->>'id')::uuid) on conflict do nothing;
      result=jsonb_build_object('revealed',h->>'id'); exit;
     end if;
     if not (h->>'optional')::boolean then previous=h; end if;
    end loop;
    if result is not null then exit; end if;
   end loop;
   if result is null then raise exception using errcode='22023',message='Hint unavailable'; end if;
  elsif p_action in ('draft','submit') then
   if expected<>r.version then raise exception using errcode='40001',message='Your response changed in another tab. Copy your input before reloading'; end if;
   v_name=p_data->>'name'; v_reason=p_data->>'reason';
   if jsonb_typeof(p_data->'name') is distinct from 'string' or jsonb_typeof(p_data->'reason') is distinct from 'string' or length(v_name)>200 or length(v_reason)>2000 then raise exception using errcode='22023',message='Use up to 200 characters for the name and 2,000 for evidence'; end if;
   target=private.resolve_submission_target_before_cases(a.id);
   select * into s from public.submissions where target_id=target.id and is_current for update;
   if s.status='completed' then raise exception using errcode='22023',message='Completed responses are read-only'; end if;
   if p_action='submit' and (s.id is distinct from (p_data->>'expectedId')::uuid or s.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz) then raise exception using errcode='40001',message='Your submission changed. Refresh before submitting again'; end if;
   if p_action='submit' and (length(btrim(v_name))<1 or length(btrim(v_reason))<1) then raise exception using errcode='22023',message='Enter a name and supporting evidence'; end if;
   update private.investigation_runs set name=v_name,reason=v_reason,version=version+1,saved_at=clock_timestamp() where id=r.id;
   result=jsonb_build_object('saved',true);
   if p_action='submit' then
    select exists(select 1 from jsonb_array_elements_text(c.content->'acceptedNames') v where private.investigation_name(v)=private.investigation_name(v_name)) into matched;
    if not matched then result=jsonb_build_object('incorrect',true);
    else
     select coalesce(jsonb_agg(jsonb_build_object('id',h->>'id','title',h->>'title','body',h->>'body','stage',stage->>'title','openedAt',rev.opened_at) order by sn,hn),'[]'::jsonb) into hints
     from jsonb_array_elements(c.content->'stages') with ordinality ss(stage,sn),jsonb_array_elements(stage->'hints') with ordinality hh(h,hn)
     join private.investigation_reveals rev on rev.run_id=r.id and rev.hint_id=(h->>'id')::uuid;
     sid=gen_random_uuid(); text_value='Suspect: '||v_name||E'\n\nSupporting evidence:\n'||v_reason;
     insert into private.investigation_attempts(submission_id,assignment_id,enrollment_id,name,reason,hints) values(sid,a.id,eid,v_name,v_reason,hints);
     update public.submissions set is_current=false where id=s.id;
     insert into public.submissions(id,assignment_id,target_id,enrollment_id,submitted_by,submission_type,submitted_text,supersedes_submission_id)
     values(sid,a.id,target.id,eid,private.my_person_id(),'text',text_value,s.id);
     result=jsonb_build_object('submissionId',sid);
    end if;
   end if;
  else raise exception using errcode='22023',message='Unknown investigation operation'; end if;
 end if;
 insert into private.investigation_receipts values(auth.uid(),p_request,payload,result);
 return result;
end $$;
revoke all on function public.mutate_investigation(text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mutate_investigation(text,uuid,jsonb,uuid) to authenticated;

create function private.guard_investigation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if tg_table_name='assignments' then
  if new.workflow is distinct from old.workflow and exists(select 1 from private.investigation_runs where assignment_id=old.id) then raise exception using errcode='22023',message='Workflow is locked because investigation activity exists'; end if;
 elsif tg_table_name='program_weeks' then
  if new.published and exists(select 1 from public.assignments a where a.week_id=new.id and a.workflow='investigation' and not exists(select 1 from private.investigation_configs c where c.assignment_id=a.id)) then raise exception using errcode='22023',message='Configure every spreadsheet investigation before publishing'; end if;
 else
  if exists(select 1 from public.assignments where id=new.assignment_id and workflow='investigation') then
   if tg_table_name='assignment_completions' then raise exception using errcode='42501',message='Review the investigation submission instead of granting manual credit'; end if;
   if not exists(select 1 from private.investigation_attempts i join private.investigation_configs c on c.assignment_id=i.assignment_id
    where i.submission_id=new.id and i.assignment_id=new.assignment_id and i.enrollment_id=new.enrollment_id and new.team_id is null and new.submission_type='text'
    and new.submitted_text='Suspect: '||i.name||E'\n\nSupporting evidence:\n'||i.reason
    and exists(select 1 from jsonb_array_elements_text(c.content->'acceptedNames') v where private.investigation_name(v)=private.investigation_name(i.name))) then raise exception using errcode='42501',message='Use the checked investigation submission'; end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_investigation() from public,anon,authenticated,service_role;
create trigger investigation_workflow_lock before update of workflow on public.assignments for each row execute function private.guard_investigation();
create trigger investigation_publish_ready before insert or update on public.program_weeks for each row execute function private.guard_investigation();
create trigger investigation_checked_submit before insert on public.submissions for each row execute function private.guard_investigation();
create trigger investigation_credit_denied before insert on public.assignment_completions for each row execute function private.guard_investigation();

alter function private.resolve_submission_target(uuid) rename to resolve_submission_target_before_investigation;
create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if exists(select 1 from public.assignments where id=p_assignment and workflow='investigation') then raise exception using errcode='42501',message='Use the investigation workspace'; end if;
 return private.resolve_submission_target_before_investigation(p_assignment);
end $$;
revoke all on function private.resolve_submission_target(uuid),private.resolve_submission_target_before_investigation(uuid) from public,anon,authenticated,service_role;

create or replace function private.may_upload(p_path text) returns boolean language sql volatile security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from private.upload_intents i
 join public.cohort_enrollments e on e.id=i.enrollment_id join public.submission_targets t on t.id=i.target_id
 join public.assignments a on a.id=i.assignment_id join public.program_weeks w on w.id=a.week_id
 where i.path=p_path and i.owner_id=auth.uid() and i.state='pending' and i.expires_at>clock_timestamp()
 and a.workflow<>'investigation' and (i.mime_type not in ('image/png','image/jpeg','image/webp') or a.workflow='standard')
 and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(e.cohort_id) and w.published
 and (t.enrollment_id=e.id or exists(select 1 from public.team_memberships m join public.cohort_teams g on g.id=m.team_id where m.enrollment_id=e.id and g.id=t.team_id and g.version=i.team_version))
 and not exists(select 1 from public.submissions s where s.target_id=t.id and s.is_current and s.status='completed'))
$$;

create function public.investigation_review(p_submission uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 return (select jsonb_build_object('name',i.name,'reason',i.reason,'hints',i.hints,'guidance',c.content->>'gradingGuidance') from private.investigation_attempts i join private.investigation_configs c on c.assignment_id=i.assignment_id where i.submission_id=p_submission);
end $$;
create function public.investigation_insights(p_assignment uuid,p_test boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare rows jsonb; hints jsonb;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',h->>'id','title',h->>'title','stage',stage->>'title','opened',(
  select count(*) from private.investigation_reveals rev join private.investigation_runs r on r.id=rev.run_id join public.cohort_enrollments e on e.id=r.enrollment_id where r.assignment_id=p_assignment and rev.hint_id=(h->>'id')::uuid and e.is_test=p_test and e.participation_status='enrolled'
 )) order by sn,hn),'[]'::jsonb) into hints from private.investigation_configs c,jsonb_array_elements(c.content->'stages') with ordinality ss(stage,sn),jsonb_array_elements(stage->'hints') with ordinality hh(h,hn) where c.assignment_id=p_assignment;
 select coalesce(jsonb_agg(jsonb_build_object('name',p.full_name,'email',p.email,'enrollmentId',e.id,'hints',(
  select coalesce(jsonb_agg(jsonb_build_object('id',h->>'id','title',h->>'title','stage',stage->>'title','openedAt',rev.opened_at) order by sn,hn),'[]'::jsonb)
  from private.investigation_runs r join private.investigation_reveals rev on rev.run_id=r.id,private.investigation_configs c,jsonb_array_elements(c.content->'stages') with ordinality ss(stage,sn),jsonb_array_elements(stage->'hints') with ordinality hh(h,hn)
  where r.assignment_id=p_assignment and r.enrollment_id=e.id and c.assignment_id=p_assignment and rev.hint_id=(h->>'id')::uuid
 )) order by p.full_name),'[]'::jsonb) into rows from public.cohort_enrollments e join public.people p on p.id=e.person_id join public.program_weeks w on w.cohort_id=e.cohort_id join public.assignments a on a.week_id=w.id
 where a.id=p_assignment and e.is_test=p_test and e.participation_status='enrolled';
 return jsonb_build_object('hints',hints,'participants',rows);
end $$;
revoke all on function public.investigation_review(uuid),public.investigation_insights(uuid,boolean) from public,anon,authenticated;
grant execute on function public.investigation_review(uuid),public.investigation_insights(uuid,boolean) to authenticated;
commit;
