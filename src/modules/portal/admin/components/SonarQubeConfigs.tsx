export function SonarQubeConfigs() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review SonarQube scan configuration settings.</p>
      <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-slate-950/95 p-4 text-xs text-white">
        {`scanner:
  qualityGate: True
  branches: [main, release]`}
      </pre>
    </div>
  );
}
