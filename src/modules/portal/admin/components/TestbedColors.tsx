export function TestbedColors() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage color themes for testbed display cards.
      </p>
      <div className="flex flex-wrap gap-2">
        {["Slate", "Indigo", "Emerald", "Amber"].map((name) => (
          <div
            key={name}
            className="rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-foreground"
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
