export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
