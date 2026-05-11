export function Guides() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Publish or edit portal guides and tutorials.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {['Getting started', 'Release notes', 'Admin handbook'].map((guide) => (
          <div key={guide} className="rounded-2xl border border-border/70 bg-white/80 p-4">
            <div className="text-sm font-semibold">{guide}</div>
            <div className="text-xs text-muted-foreground mt-1">Last updated 4 days ago</div>
          </div>
        ))}
      </div>
    </div>
  );
}