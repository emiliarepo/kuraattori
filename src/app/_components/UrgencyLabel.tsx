export function UrgencyLabel({ label }: { label: string }) {
  return (
    <span className="bg-signal text-on-signal inline-block px-2 py-1 text-sm font-semibold">
      {label}
    </span>
  );
}
