import type {Metadata} from 'next';
import {AdminWeeks} from '@/components/admin/admin-weeks';
import {readAdminWeeks} from '@/lib/supabase/admin-weeks';
export const metadata:Metadata={title:'Weeks | GAP Admin'};
export default async function AdminWeeksPage({searchParams}:{searchParams:Promise<{cohort?:string}>}){
 const {cohort}=await searchParams;
 return <AdminWeeks {...await readAdminWeeks(cohort)}/>;
}
