import type { Metadata } from "next";
import { AdminMembers } from "@/components/admin/admin-members";
import { MondayImportPanel } from '@/components/admin/monday-import-panel';
import { PageContainer } from '@/components/ui/container';
export const metadata: Metadata = { title: "Members | GAP Admin" };
export default function AdminMembersPage() { return <><AdminMembers /><PageContainer className="pb-12"><MondayImportPanel /></PageContainer></>; }
