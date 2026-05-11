export function Testbeds() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review available testbeds and their status.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {["Web Lab", "Mobile Lab", "API Lab"].map((lab) => (
          <div key={lab} className="rounded-2xl border border-border/70 bg-white/80 p-4">
            <div className="text-sm font-semibold">{lab}</div>
            <div className="text-xs text-muted-foreground mt-1">Available</div>
          </div>
        ))}
      </div>
    </div>
  );
}
