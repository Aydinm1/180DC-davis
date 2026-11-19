begin;
-- Links use the same private readiness/assignment records; no external bytes are fetched.
alter table private.swap_assets add column external_url text;
alter table private.swap_assets alter column path drop not null, alter column mime drop not null, alter column size drop not null;
create function private.valid_swap_link(value text) returns boolean language sql immutable set search_path='' as $$
 select value is not null and length(value)<=2048 and value !~ '[[:space:][:cntrl:]]' and value ~ '^https://(docs[.]google[.]com/presentation/(u/[0-9]+/)?d/[A-Za-z0-9_-]+|((www[.])?canva[.]com)/design/[A-Za-z0-9_-]+)(/[A-Za-z0-9_./-]*)?([?][^#]*)?(#.*)?$'
$$;
alter table private.swap_assets add constraint swap_asset_source check (
 (external_url is null and path is not null and mime is not null and size is not null)
 or (private.valid_swap_link(external_url) and kind='deck' and state='ready' and path is null and mime is null and size is null)
);
revoke all on function private.valid_swap_link(text) from public,anon,authenticated,service_role;
create function public.save_slide_swap_link(p_assignment uuid,p_url text,p_expected uuid,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare eid uuid;g public.slide_swap_groups;existing uuid;newid uuid;payload jsonb;receipt private.swap_receipts;result jsonb;
begin
 perform private.submission_gate();
 if not private.valid_swap_link(p_url) or p_request is null then raise exception using errcode='22023',message='Use a Google Slides presentation or Canva design link beginning with https://';end if;
 select e.id into eid from public.cohort_enrollments e join public.program_weeks w on w.cohort_id=e.cohort_id join public.assignments a on a.week_id=w.id where a.id=p_assignment and a.workflow='slide_swap' and w.published and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(w.cohort_id);
 select gg.* into g from public.slide_swap_groups gg join public.slide_swap_members m on m.group_id=gg.id where m.assignment_id=p_assignment and m.enrollment_id=eid for update of gg;
 if eid is null or g.id is null or private.is_viewer() or not private.can_read_swap(g.id) then raise exception using errcode='42501',message='Presentation group unavailable';end if;
 payload=jsonb_build_object('operation','deck-link','assignment',p_assignment,'url',p_url,'expected',p_expected);
 select * into receipt from private.swap_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then if receipt.payload<>payload then raise exception using errcode='22023',message='Request reused';end if;return receipt.result;end if;
 if g.unlocked_at is not null then raise exception using errcode='22023',message='The swap has already opened. Your shared deck remains editable at its original link';end if;
 select id into existing from private.swap_assets where assignment_id=p_assignment and enrollment_id=eid and kind='deck' and current and state='ready';
 if existing is distinct from p_expected then raise exception using errcode='40001',message='Your slides changed in another tab. Refresh before saving again';end if;
 update private.swap_assets set current=false where id=existing;
 insert into private.swap_assets(assignment_id,enrollment_id,group_id,owner_id,story_id,kind,path,name,mime,size,state,current,expected_id,group_version,external_url)
 values(p_assignment,eid,g.id,auth.uid(),(select story_id from public.slide_swap_members where assignment_id=p_assignment and enrollment_id=eid),'deck',null,case when p_url like 'https://docs.google.com/%' then 'Google Slides' else 'Canva' end,null,null,'ready',true,p_expected,g.version,p_url) returning id into newid;
 perform private.unlock_swap(g.id);
 result=jsonb_build_object('saved',true,'id',newid);
 insert into private.swap_receipts values(auth.uid(),p_request,payload,result);
 return result;
end $$;
revoke all on function public.save_slide_swap_link(uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.save_slide_swap_link(uuid,text,uuid,uuid) to authenticated;
-- Keep member projections and their authorization intact; add URLs only to authorized decks.
do $$ declare body text;begin
 body=pg_get_functiondef('public.read_slide_swap(uuid,boolean)'::regprocedure);
 body=replace(body,'''id'',id,''name'',name)', '''id'',id,''name'',name,''url'',external_url)');
 body=replace(body,'''name'',f.name,''author'',p.full_name)', '''name'',f.name,''author'',p.full_name,''url'',f.external_url)');
 execute body;
 body=pg_get_functiondef('public.slide_swap_review(uuid)'::regprocedure);
 body=replace(body,'''assetId'',d.asset_id,''story'',d.story)', '''assetId'',d.asset_id,''story'',d.story,''url'',(select external_url from private.swap_assets where id=d.asset_id))');
 execute body;
 -- A link is never a Storage object, upload intent, or PDF/image download.
 body=pg_get_functiondef('public.slide_swap_asset(uuid)'::regprocedure);
 body=replace(body,'where id=p_id and state=''ready''', 'where id=p_id and state=''ready'' and external_url is null');execute body;
end $$;
commit;
