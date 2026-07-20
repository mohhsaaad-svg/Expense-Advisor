export default function Basira() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg grid-bg font-body">
      <div className="absolute top-[5vh] left-[5vw] w-[3vw] h-[3vw] bg-primary z-10" />

      <div className="absolute top-[5vh] right-[5vw] z-10 text-right">
        <div className="text-primary text-[1vw] font-semibold uppercase tracking-[0.1em] mb-[0.5vh]">
          Product Lab
        </div>
        <div className="text-faint text-[0.9vw] uppercase tracking-[0.1em]">
          Studio Pitch / 2026
        </div>
      </div>

      <div className="absolute top-[19vh] left-[10vw] z-10 w-[80vw]">
        <div className="inline-block border border-accent text-accent text-[1.5vw] font-semibold uppercase tracking-[0.12em] px-[1.1vw] py-[0.7vh] mb-[2.6vh]">
          Working title
        </div>

        <h2 className="text-text text-[4.4vw] font-bold leading-[1.08] tracking-[-0.025em] m-0 mb-[2.2vh]">
          The next chapter: Project Basira
        </h2>

        <p className="text-muted text-[2vw] leading-[1.4] m-0 mb-[5vh] max-w-[60vw] [text-wrap:pretty]">
          A GCC-first financial navigator for salary-to-salary clarity.
        </p>

        <div className="flex items-start gap-[1.6vw] mb-[5vh]">
          <div className="w-[1.3vw] h-[1.3vw] bg-accent shrink-0 mt-[1.8vh]" />
          <p className="text-primary text-[3.1vw] font-bold leading-[1.22] tracking-[-0.02em] m-0 max-w-[68vw] [text-wrap:balance]">
            “Know what you can safely spend before your next salary — and why.”
          </p>
        </div>

        <p className="text-text text-[2.1vw] font-semibold m-0 mb-[1.6vh]">
          Own the decision layer, not the tracking layer
        </p>
        <p className="text-muted text-[2vw] leading-[1.45] m-0 max-w-[58vw] [text-wrap:pretty]">
          For salaried professionals in Jordan and the GCC who plan, but still
          wonder where the salary went before payday
        </p>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        05
      </div>
    </div>
  );
}
