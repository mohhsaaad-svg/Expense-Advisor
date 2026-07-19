import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';

export function Recommendations() {
  const { recommendations } = reportData;

  return (
    <Section id="recommendations">
      <SectionTitle 
        overline="Exec Summary" 
        title="Three moves to win the gap" 
      />
      
      <div className="grid gap-8">
        {recommendations.map((rec, i) => (
          <div key={i} className="bg-card p-8 md:p-10 rounded-3xl border border-card-border shadow-sm">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-2xl font-bold italic">
                {i + 1}
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-4 text-foreground">{rec.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {rec.detail}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
