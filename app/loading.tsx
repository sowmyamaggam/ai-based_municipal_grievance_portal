export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6" aria-busy="true" aria-label="Loading page">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
    </main>
  );
}
