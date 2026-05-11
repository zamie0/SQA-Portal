export function Groups() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage user groups, permissions and role assignments for the portal.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {['Admins', 'QA Team', 'Support'].map((group) => (
          <div key={group} className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <div className="text-sm font-semibold">{group}</div>
            <div className="text-xs text-muted-foreground mt-1">3 members</div>
          </div>
        ))}
      </div>
    </div>
  );
}