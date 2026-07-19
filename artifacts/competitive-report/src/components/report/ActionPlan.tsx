import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';

export function ActionPlan() {
  const { actionPlan } = reportData;

  return (
    <Section id="action-plan">
      <SectionTitle 
        overline="Execution" 
        title="The battle plan" 
      />

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-border/50">
          {actionPlan.map((item, i) => (
            <div key={i} className="p-6 md:p-8 md:grid md:grid-cols-4 gap-6 items-start hover:bg-muted/30 transition-colors">
              <div className="md:col-span-3 mb-4 md:mb-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-foreground">{item.action}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.why}
                </p>
              </div>
              <div className="md:text-right flex items-center md:justify-end md:flex-col gap-3 md:gap-1">
                <span className="inline-flex px-3 py-1 bg-primary/10 text-primary font-medium text-xs rounded-full uppercase tracking-wider">
                  {item.status}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Sources: {item.source.join(', ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
