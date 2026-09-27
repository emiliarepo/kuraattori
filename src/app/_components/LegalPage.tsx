/** The legal text itself is Finnish only; `lang` marks it when the UI is in another language. */
export function LegalPage({
  title,
  kicker,
  lang,
  children,
}: {
  title: string;
  kicker: string;
  lang?: "fi";
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-[65ch] flex-col gap-4 py-8 font-serif text-lg leading-relaxed [&_a]:underline [&_h2]:mt-6 [&_h2]:font-sans [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
      <p lang={lang} className="text-kicker text-muted">
        {kicker}
      </p>
      <h1 className="text-headline text-4xl sm:text-5xl">{title}</h1>
      <div lang={lang} className="contents">
        {children}
      </div>
    </article>
  );
}
