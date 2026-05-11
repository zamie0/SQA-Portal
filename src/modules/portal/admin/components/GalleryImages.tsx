export function GalleryImages() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Browse uploaded assets for the image gallery.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {["Screenshot_01.png", "Screenshot_02.png", "Dashboard.png"].map((image) => (
          <div key={image} className="rounded-3xl border border-border/70 bg-white/80 p-3 text-xs">
            <div className="font-semibold">{image}</div>
            <div className="text-muted-foreground mt-1">Uploaded 2 days ago</div>
          </div>
        ))}
      </div>
    </div>
  );
}
