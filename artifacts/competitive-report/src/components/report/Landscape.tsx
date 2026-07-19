import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';
import { Flame } from 'lucide-react';

export function Landscape() {
  const { landscape } = reportData;

  return (
    <Section id="landscape">
      <SectionTitle 
        overline="The Field" 
        title="Who we're up against"
        subtitle="The giants, the darlings, and the AI pivots."
      />

      <div className="space-y-6">
        {landscape.map((item, i) => (
          <div key={i} className="group border border-border bg-card rounded-2xl p-6 md:p-8 transition-colors hover:border-primary/30">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
              <div>
                <h3 className="text-2xl font-bold font-serif text-foreground mb-1">
                  {item.name}
                </h3>
                <p className="text-sm font-medium text-muted-foreground">
                  {item.stage}
                </p>
              </div>
              <div className="inline-flex items-center bg-secondary px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                {item.pricing}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Strength</p>
                <p className="text-foreground/80 leading-snug">{item.strength}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Weakness</p>
                <p className="text-foreground/80 leading-snug">{item.weakness}</p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 md:px-6 flex items-start gap-4">
              <Flame className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-foreground font-medium leading-relaxed">
                {item.vsEmber}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
