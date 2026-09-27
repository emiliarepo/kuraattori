export function EmptyState({
  message,
  className = "py-6",
}: {
  message: string;
  className?: string;
}) {
  return <p className={`text-muted italic ${className}`.trim()}>{message}</p>;
}
