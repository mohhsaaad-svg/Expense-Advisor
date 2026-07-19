import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';
import { Target } from 'lucide-react';

export function WhiteSpace() {
  const { whiteSpace, kano, watchlist } = reportData;

  return (
    <Section id="white-space">
      <SectionTitle 
        overline="The Opportunity" 
        title="Where they aren't" 
      />

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-12 mb-20">
        {whiteSpace.map((ws, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-primary/20 rounded-full" />
            <h3 className="text-xl font-bold mb-3 text-foreground">{ws.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{ws.evidence}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-3xl border border-border p-8 md:p-12">
        <div className="flex items-center gap-3 mb-8">
          <Target className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-serif text-foreground font-semibold">Kano Model Analysis</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-4">Basics</h4>
            <ul className="space-y-3">
              {kano.basics.map((item, i) => (
                <li key={i} className="text-foreground/80 text-sm leading-tight flex items-start gap-2 before:content-['•'] before:text-primary">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-muted-foreground mb-4">Performance</h4>
            <ul className="space-y-3">
              {kano.performance.map((item, i) => (
                <li key={i} className="text-foreground/80 text-sm leading-tight flex items-start gap-2 before:content-['•'] before:text-primary">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-primary mb-4">Delighters</h4>
            <ul className="space-y-3">
              {kano.delighters.map((item, i) => (
                <li key={i} className="text-foreground font-medium text-sm leading-tight flex items-start gap-2 before:content-['→'] before:text-primary">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-secondary/50 p-6 rounded-xl border border-border/50 text-foreground/80 italic text-sm leading-relaxed">
          <strong>Insight:</strong> {kano.insight}
        </div>
      </div>

      <div className="mt-12 text-sm text-muted-foreground border-t border-border pt-6 flex gap-4">
        <span className="font-bold uppercase tracking-widest text-foreground shrink-0">Watchlist</span>
        <p>{watchlist}</p>
      </div>
    </Section>
  );
}
