export function EmptyState({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return <p className={`text-muted italic ${className}`.trim()}>{message}</p>;
}
