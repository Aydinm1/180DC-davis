import { PageContainer } from '@/components/ui/container';
export default function QueueLoading(){
 return <section aria-label="Loading review queue" aria-busy="true"><PageContainer className="py-9 sm:py-11"><p className="text-sm font-bold uppercase tracking-widest text-brand-deep">Admin workspace</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Review queue</h1><p role="status" className="mt-8 text-sm text-ink-soft">Loading review queue…</p></PageContainer></section>;
}
