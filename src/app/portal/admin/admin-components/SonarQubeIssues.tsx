export function SonarQubeIssues() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Track the latest SonarQube issues.</p>
      <div className="grid gap-2 text-xs">
        {['Blocker issue in auth module', 'Duplicate code in dashboard', 'Security hotspot in upload flow'].map((issue) => (
          <div key={issue} className="rounded-2xl border border-border/70 bg-white/80 p-3">{issue}</div>
        ))}
      </div>
    </div>
  );
}