"use client";
import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {AppHeader} from '@/components/shell/app-header';
import {PageContainer} from '@/components/ui/container';
import {CohortSwitcher} from './cohort-switcher';
import type {ProgramCohort,ProgramUser} from '@/lib/program/types';

export function AdminShell({children,user,cohorts,selectedCohortId,onCohortChange,hasMyProgram,confirmNavigation=()=>true}:{children:ReactNode;user:ProgramUser;cohorts:readonly ProgramCohort[];selectedCohortId:string;onCohortChange:(id:string)=>void;hasMyProgram:boolean;confirmNavigation?:()=>boolean}){
 const pathname=usePathname();
 const cohortQuery=`?cohort=${encodeURIComponent(selectedCohortId)}`;
  const navigation = [
    { label: "Review queue", href: `/admin${cohortQuery}`, current: pathname === "/admin" || pathname.startsWith("/admin/submissions") },
    { label: "Weeks", href: `/admin/weeks${cohortQuery}`, current: pathname.startsWith("/admin/weeks") },
    { label: "Attendance", href: `/admin/attendance${cohortQuery}`, current: pathname.startsWith("/admin/attendance") },
    { label: "Members", href: `/admin/members${cohortQuery}`, current: pathname.startsWith("/admin/members") },
  ];

 return <div className="min-h-screen bg-canvas text-ink"><AppHeader prefetchNavigation={false} user={user} navigation={navigation} profileLinks={[]} homeHref={`/admin${cohortQuery}`}/><div className="border-b border-border bg-surface-subtle"><PageContainer className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2"><CohortSwitcher cohorts={cohorts} selectedId={selectedCohortId} onChange={onCohortChange}/><div className="flex flex-wrap gap-4">{selectedCohortId?<Link prefetch={false} className="inline-flex min-h-10 items-center text-sm font-bold text-action hover:text-action-hover" href={`/admin/preview${cohortQuery}`} onClick={event=>{if(!confirmNavigation())event.preventDefault();}}>Preview as member →</Link>:null}{hasMyProgram?<Link prefetch={false} className="inline-flex min-h-10 items-center text-sm font-bold text-action hover:text-action-hover" href="/" onClick={event=>{if(!confirmNavigation())event.preventDefault();}}>My program →</Link>:null}</div></PageContainer></div>{children}</div>;
}
