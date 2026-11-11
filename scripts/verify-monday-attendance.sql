\set ON_ERROR_STOP on
begin;
do $$
declare actor uuid=gen_random_uuid(); admin_person uuid=gen_random_uuid(); participant uuid=gen_random_uuid();
 test_person uuid=gen_random_uuid(); cohort uuid=gen_random_uuid(); other_cohort uuid=gen_random_uuid();
 week uuid=gen_random_uuid(); other_week uuid=gen_random_uuid(); session uuid=gen_random_uuid();
 enrollment uuid=gen_random_uuid(); test_enrollment uuid=gen_random_uuid(); other_enrollment uuid=gen_random_uuid(); result jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at) values(actor,actor::text||'@ucdavis.edu',now());
 insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
 values(actor::text,actor,jsonb_build_object('sub',actor::text),'google',now(),now());
 insert into public.people(id,email,full_name) values(admin_person,actor::text||'@ucdavis.edu','Attendance Lead'),
 (participant,participant::text||'@ucdavis.edu','Official'),(test_person,test_person::text||'@ucdavis.edu','Test');
 insert into public.approved_members(person_id,email,full_name,role) values(admin_person,actor::text||'@ucdavis.edu','Lead','admin');
 insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values
 (cohort,'fall',2987,'2987-09-01','2987-12-01','active'),(other_cohort,'winter',2987,'2987-01-01','2987-03-01','archived');
 insert into public.program_weeks(id,cohort_id,week_number,title,description,published) values
 (week,cohort,2,'Fixture week','Fixture',true),(other_week,other_cohort,2,'Other week','Fixture',true);
 insert into public.cohort_enrollments(id,person_id,cohort_id,is_test) values
 (enrollment,participant,cohort,false),(test_enrollment,test_person,cohort,true),(other_enrollment,participant,other_cohort,false);
 insert into public.attendance_sessions(id,week_id,workshop_date,opened_at,closes_at) values(session,week,current_date,now(),now()+interval '2 hours');
 insert into public.attendance_records(session_id,enrollment_id,present,recorded_at) values
 (session,enrollment,true,now()),(session,test_enrollment,true,now());
 insert into private.monday_application_links(account_id,board_id,item_id,enrollment_id) values
 ('fixture','board','11',enrollment),('fixture','board','12',test_enrollment),('fixture','board','13',other_enrollment),('wrong','board','14',enrollment);
 result=public.monday_attendance_snapshot(actor,cohort,week,'fixture','board');
 if result->>'weekNumber'<>'2' or jsonb_array_length(result->'participants')<>1 or result->'participants'->0->'items'<>'["11"]'::jsonb then raise exception 'Wrong snapshot %',result;end if;
 update public.attendance_sessions set closed_at=now() where id=session;
 if jsonb_array_length(public.monday_attendance_snapshot(actor,cohort,week,'fixture','board')->'participants')<>1 then raise exception 'Closed workshop lost attendance';end if;
 if result::text like '%code%' or result::text like '%recorded_at%' then raise exception 'Extra data';end if;
 result=public.monday_attendance_snapshot(actor,cohort,week,'fixture','board',other_enrollment);
 if result->'participants'<>'[]'::jsonb then raise exception 'Cross cohort export';end if;
 begin perform public.monday_attendance_snapshot(actor,cohort,other_week,'fixture','board');raise exception 'Wrong week accepted';exception when invalid_parameter_value then null;end;
 update public.attendance_records set present=false,recorded_at=null where enrollment_id=enrollment;
 if public.monday_attendance_snapshot(actor,cohort,week,'fixture','board')->'participants'<>'[]'::jsonb then raise exception 'Undo still exported';end if;
 update public.attendance_records set present=true,recorded_at=now() where enrollment_id=enrollment;
 update public.cohort_enrollments set is_test=true where id=enrollment;
 if public.monday_attendance_snapshot(actor,cohort,week,'fixture','board')->'participants'<>'[]'::jsonb then raise exception 'New test still exported';end if;
 for result in select jsonb_build_object('role',r) from unnest(array['member','viewer']) r loop
  update public.approved_members set role=(result->>'role')::public.app_role where person_id=admin_person;
  begin perform public.monday_attendance_snapshot(actor,cohort,week,'fixture','board');raise exception 'Non-admin exported';exception when insufficient_privilege then null;end;
 end loop;
 update public.approved_members set role='admin',active=false where person_id=admin_person;
 begin perform public.monday_attendance_snapshot(actor,cohort,week,'fixture','board');raise exception 'Inactive exported';exception when insufficient_privilege then null;end;
 update public.approved_members set active=true where person_id=admin_person;
 update auth.users set email='wrong@example.org' where id=actor;
 begin perform public.monday_attendance_snapshot(actor,cohort,week,'fixture','board');raise exception 'Wrong domain exported';exception when insufficient_privilege then null;end;
 if has_function_privilege('authenticated','public.monday_attendance_snapshot(uuid,uuid,uuid,text,text,uuid)','execute') or has_function_privilege('anon','public.monday_attendance_snapshot(uuid,uuid,uuid,text,text,uuid)','execute') then raise exception 'Client RPC grant';end if;
 raise notice 'Official/test, enrollment mapping, cohort/week, undo, role revocation and private RPC checks passed';
end $$;
rollback;
