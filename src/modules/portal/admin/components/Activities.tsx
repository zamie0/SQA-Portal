export function Activities() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Recent admin activity and audit events.</p>
      <ul className="space-y-2 text-sm">
        <li className="rounded-2xl bg-white/80 border border-border/70 p-3">
          User <strong>admin</strong> approved a new registration.
        </li>
        <li className="rounded-2xl bg-white/80 border border-border/70 p-3">
          Password reset request for <strong>@yana</strong> was completed.
        </li>
        <li className="rounded-2xl bg-white/80 border border-border/70 p-3">
          Tool configuration updated: <strong>Performance Testing</strong>.
        </li>
      </ul>
    </div>
  );
}
