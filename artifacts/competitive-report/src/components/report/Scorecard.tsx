import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';
import { ArrowRight, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export function Scorecard() {
  const { headToHead, trapQuestions } = reportData;

  return (
    <Section id="scorecard">
      <SectionTitle 
        overline="Reality Check" 
        title="Head-to-head scorecard" 
        subtitle="Where we win cleanly, where we lose, and how we neutralize objections."
      />

      <div className="grid md:grid-cols-3 gap-8 mb-20">
        <div className="bg-success/5 border border-success/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-2 text-success font-semibold uppercase tracking-widest text-sm mb-6">
            <CheckCircle2 className="w-5 h-5" /> Wins
          </div>
          <ul className="space-y-4">
            {headToHead.wins.map((item, i) => (
              <li key={i} className="text-foreground/80 text-sm leading-relaxed border-b border-success/10 pb-4 last:border-0 last:pb-0">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-2 text-destructive font-semibold uppercase tracking-widest text-sm mb-6">
            <AlertCircle className="w-5 h-5" /> Losses
          </div>
          <ul className="space-y-4">
            {headToHead.losses.map((item, i) => (
              <li key={i} className="text-foreground/80 text-sm leading-relaxed border-b border-destructive/10 pb-4 last:border-0 last:pb-0">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-semibold uppercase tracking-widest text-sm mb-6">
            <Shield className="w-5 h-5" /> Neutralizers
          </div>
          <ul className="space-y-4">
            {headToHead.neutralizers.map((item, i) => (
              <li key={i} className="text-foreground/80 text-sm leading-relaxed border-b border-border pb-4 last:border-0 last:pb-0 flex gap-3">
                <ArrowRight className="w-4 h-4 shrink-0 text-primary mt-1" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-2xl mx-auto text-center">
        <h3 className="font-serif text-2xl font-semibold mb-8 text-foreground">
          Sales & Marketing Trap Questions
        </h3>
        <div className="space-y-4">
          {trapQuestions.map((q, i) => (
            <div key={i} className="bg-secondary/40 rounded-lg p-4 text-foreground font-medium border border-border/50">
              "{q}"
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
