"use client";
import {createContext,useContext,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {AdminQueueState} from '@/lib/program/admin';
import type {ProgramUser} from '@/lib/program/types';
import {useOptionalAdminWorkspace} from './admin-workspace';
import {AdminShell} from './admin-shell';
const QueueContext=createContext<(AdminQueueState&{selectedCohortId:string})|null>(null);
export function useAdminQueue(){
 const queue=useContext(QueueContext),workspace=useOptionalAdminWorkspace();
 const value=queue??workspace;
 if(!value)throw new Error('Review queue is unavailable.');
 return value;
}
export function AdminQueueWorkspace({children,user,state,cohortId,hasMyProgram}:{children:ReactNode;user:ProgramUser;state:AdminQueueState;cohortId:string;hasMyProgram:boolean}){
 const router=useRouter();
 return <QueueContext.Provider value={{...state,selectedCohortId:cohortId}}><AdminShell user={user} cohorts={state.cohorts} selectedCohortId={cohortId} hasMyProgram={hasMyProgram} onCohortChange={id=>router.push(`/admin?cohort=${encodeURIComponent(id)}`)}>{children}</AdminShell></QueueContext.Provider>;
}
