import type { Metadata } from "next";
import { AdminWeeks } from "@/components/admin/admin-weeks";
export const metadata: Metadata = { title: "Weeks | GAP Admin" };
export default function AdminWeeksPage() { return <AdminWeeks />; }
