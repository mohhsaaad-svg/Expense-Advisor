import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';
import { Check, Minus, X, Flame } from 'lucide-react';

export function FeatureMatrix() {
  const { featureMatrix } = reportData;

  const renderCell = (val: string) => {
    switch (val) {
      case 'win':
        return <div className="mx-auto w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm"><Flame className="w-4 h-4 fill-current" /></div>;
      case 'yes':
        return <Check className="w-5 h-5 mx-auto text-foreground/60" />;
      case 'partial':
        return <Minus className="w-5 h-5 mx-auto text-muted-foreground" />;
      case 'no':
        return <X className="w-5 h-5 mx-auto text-muted-foreground/30" />;
      default:
        return null;
    }
  };

  return (
    <Section id="matrix" className="!max-w-none px-4 md:px-12 w-full overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionTitle 
          overline="Feature Matrix" 
          title="The honest scorecard" 
        />
        
        <p className="text-sm text-muted-foreground mb-8">
          {featureMatrix.legend}
        </p>

        <div className="overflow-x-auto pb-8">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4 border-b border-border font-medium text-muted-foreground w-[300px]">Feature (Weight)</th>
                {featureMatrix.columns.map((col, i) => (
                  <th key={i} className={`p-4 border-b border-border text-center font-serif text-lg ${col === 'Ember' ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-sm">
              {featureMatrix.rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors group">
                  <td className="p-4 py-5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{row.feature}</span>
                      <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded font-mono">W{row.weight}</span>
                    </div>
                    {row.note && (
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{row.note}</p>
                    )}
                  </td>
                  {row.cells.map((cell, j) => (
                    <td key={j} className={`p-4 text-center align-middle ${j === 0 ? 'bg-primary/5 group-hover:bg-primary/10 transition-colors' : ''}`}>
                      {renderCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}
