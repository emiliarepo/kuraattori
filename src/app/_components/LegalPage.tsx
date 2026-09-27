export function LegalPage({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-[65ch] flex-col gap-4 py-12 font-serif text-lg leading-relaxed [&_a]:underline [&_h2]:mt-6 [&_h2]:font-sans [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
      <p className="text-kicker text-muted">{kicker}</p>
      <h1 className="text-headline text-4xl sm:text-5xl">{title}</h1>
      {children}
    </article>
  );
}
