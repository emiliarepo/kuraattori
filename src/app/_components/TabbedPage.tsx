export function TabbedPage({
  title,
  tabs,
  className = "",
  children,
}: {
  title: string;
  tabs: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`py-8 ${className}`.trim()}>
      <h1 className="text-headline mb-6 text-4xl sm:text-5xl">{title}</h1>
      {tabs}
      <div data-tab-panel className="pt-6">
        {children}
      </div>
    </div>
  );
}
