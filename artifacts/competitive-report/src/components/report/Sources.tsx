import { Section } from './Section';
import reportData from '@/report-data.json';

export function Sources() {
  const { sources, methodologyNote } = reportData;

  return (
    <Section id="sources" className="!pb-32">
      <div className="max-w-3xl border-t-2 border-foreground pt-12">
        <h2 className="text-2xl font-serif mb-6 text-foreground">Sources & Methodology</h2>
        
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 italic">
          {methodologyNote}
        </p>

        <ul className="space-y-3">
          {sources.map((src, i) => (
            <li key={i} className="text-sm flex gap-3 group">
              <span className="text-muted-foreground font-mono w-6 shrink-0">[{src.n}]</span>
              <a 
                href={src.url} 
                target="_blank" 
                rel="noreferrer"
                className="text-foreground hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30"
              >
                {src.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
