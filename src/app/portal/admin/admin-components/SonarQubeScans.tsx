export function SonarQubeScans() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Recent scan results and status summaries.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {['Scan #142', 'Scan #141', 'Scan #140'].map((scan) => (
          <div key={scan} className="rounded-2xl border border-border/70 bg-white/80 p-3">
            <div className="text-sm font-semibold">{scan}</div>
            <div className="text-xs text-muted-foreground mt-1">Passed with warnings</div>
          </div>
        ))}
      </div>
    </div>
  );
}