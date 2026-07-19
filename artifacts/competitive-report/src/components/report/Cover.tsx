import { Download, Flame } from 'lucide-react';
import reportData from '@/report-data.json';
import { motion } from 'framer-motion';

export function Cover() {
  const { meta, positioning } = reportData;

  return (
    <section className="min-h-[90vh] flex flex-col justify-center relative pt-20 pb-16 border-b border-border/50">
      <div className="max-w-4xl mx-auto px-6 md:px-12 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-16"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <p className="font-semibold text-foreground tracking-tight">{meta.product}</p>
            <p className="text-sm text-muted-foreground">{meta.confidential}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-6">
            {meta.category} &middot; {meta.date}
          </p>
          
          <h1 className="text-5xl md:text-7xl font-serif leading-[1.1] mb-8 text-foreground">
            {meta.title}
          </h1>
          
          <p className="text-2xl md:text-3xl text-muted-foreground font-light leading-snug mb-16 max-w-3xl">
            {meta.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid md:grid-cols-3 gap-12"
        >
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-4">Positioning</h3>
            <p className="text-lg leading-relaxed text-foreground/80">
              {positioning.statement}
            </p>
          </div>
          <div className="flex items-end md:justify-end">
            <a 
              href={`${import.meta.env.BASE_URL}Ember-Competitive-Analysis.pdf`}
              className="inline-flex items-center justify-center gap-2 bg-foreground text-background hover:bg-primary transition-colors px-6 py-4 rounded-full font-medium"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
