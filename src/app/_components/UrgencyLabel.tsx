export function UrgencyLabel({ label }: { label: string }) {
  return (
    <span className="border-signal text-signal inline-block border-l-2 pl-2 font-sans text-xs font-semibold tracking-wide uppercase">
      {label}
    </span>
  );
}
