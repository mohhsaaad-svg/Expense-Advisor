import { Section, SectionTitle } from './Section';
import reportData from '@/report-data.json';
import { motion } from 'framer-motion';

export function PositioningMap() {
  const { positioningMap, pricingBars } = reportData;

  return (
    <Section id="positioning">
      <SectionTitle 
        overline="Strategic Gap" 
        title="Mapping the void"
        subtitle="Incumbents clustered in the expensive automation-first quadrant. The habit-first lane is wide open."
      />

      {/* The scatter plot */}
      <div className="relative w-full aspect-square md:aspect-[4/3] bg-card border border-border rounded-2xl shadow-sm my-12 p-8 md:p-12 overflow-hidden">
        
        {/* Axes */}
        <div className="absolute inset-x-8 top-1/2 h-px bg-border/80" />
        <div className="absolute inset-y-8 left-1/2 w-px bg-border/80" />
        
        {/* Quadrant backgrounds (optional subtle hint) */}
        <div className="absolute bottom-8 right-8 w-[calc(50%-2rem)] h-[calc(50%-2rem)] bg-primary/5 rounded-tl-3xl pointer-events-none" />

        {/* Labels */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-muted-foreground bg-card px-2">
          {positioningMap.yAxis.top}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 text-xs md:text-sm font-semibold uppercase tracking-widest text-muted-foreground bg-card px-2">
          {positioningMap.yAxis.bottom}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 left-4 text-xs md:text-sm font-semibold uppercase tracking-widest text-muted-foreground bg-card py-2 [writing-mode:vertical-lr] rotate-180">
          {positioningMap.xAxis.left}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-4 text-xs md:text-sm font-semibold uppercase tracking-widest text-muted-foreground bg-card py-2 [writing-mode:vertical-lr]">
          {positioningMap.xAxis.right}
        </div>

        {/* The Gap label */}
        <div className="absolute bottom-16 right-16 max-w-[200px] text-primary/80 font-medium text-sm text-right leading-tight italic">
          {positioningMap.whiteSpaceLabel}
        </div>

        {/* Points */}
        <div className="absolute inset-8">
          {positioningMap.points.map((pt, i) => {
            const xPos = `${pt.x * 100}%`;
            const yPos = `${(1 - pt.y) * 100}%`; // y=1 is top, y=0 is bottom
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="absolute w-0 h-0"
                style={{ left: xPos, top: yPos }}
              >
                {/* Dot */}
                <div className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm
                  ${pt.ember ? 'w-5 h-5 bg-primary z-20' : pt.minor ? 'w-2 h-2 bg-muted-foreground/40' : 'w-3 h-3 bg-foreground/80'}
                `} />
                
                {/* Label */}
                <div 
                  className={`absolute whitespace-nowrap text-sm font-medium px-2 py-1 rounded
                    ${pt.ember ? 'font-serif font-bold text-lg text-primary -translate-x-[calc(100%+12px)] -translate-y-1/2' : 'text-foreground/80'}
                  `}
                  style={!pt.ember ? { left: `${pt.dx}px`, top: `${pt.dy}px` } : undefined}
                >
                  {pt.name}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pricing Bar chart */}
      <div className="mt-20">
        <h3 className="font-serif text-2xl text-foreground mb-8 text-center">Annual Cost Comparison</h3>
        <div className="space-y-3 max-w-2xl mx-auto">
          {[...pricingBars].sort((a, b) => b.annual - a.annual).map((bar, i) => (
            <div key={i} className="flex items-center gap-4 text-sm">
              <div className={`w-24 text-right font-medium ${bar.ember ? 'text-primary font-bold' : 'text-foreground'}`}>
                {bar.name}
              </div>
              <div className="flex-1 h-8 bg-secondary rounded-full overflow-hidden flex items-center relative">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max((bar.annual / 120) * 100, 2)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.05 }}
                  className={`h-full ${bar.ember ? 'bg-primary' : 'bg-foreground/20'}`}
                />
                {bar.annual === 0 && (
                  <div className="absolute left-4 font-bold text-primary">FREE</div>
                )}
              </div>
              <div className="w-24 font-mono text-muted-foreground">
                {bar.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
