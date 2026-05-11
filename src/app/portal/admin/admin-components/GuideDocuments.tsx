export function GuideDocuments() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Manage the selected admin resource here.</p>
      <div className="rounded-3xl border border-border/70 bg-white/80 p-4">
        <div className="text-sm font-semibold capitalize">Guide documents</div>
        <div className="text-xs text-muted-foreground mt-2">
          Item list and editable details appear when a live integration is connected.
        </div>
      </div>
    </div>
  );
}