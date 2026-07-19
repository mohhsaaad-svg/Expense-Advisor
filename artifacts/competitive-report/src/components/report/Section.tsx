import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Section({ children, className = '', id }: { children: ReactNode, className?: string, id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`py-24 border-b border-border/50 last:border-0 ${className}`}
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {children}
      </div>
    </motion.section>
  );
}

export function SectionTitle({ title, subtitle, overline }: { title: string, subtitle?: string, overline?: string }) {
  return (
    <div className="mb-16">
      {overline && (
        <p className="text-primary font-semibold tracking-widest uppercase text-sm mb-4">
          {overline}
        </p>
      )}
      <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-6 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
