export default function TrustRule() {
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

      <div className="absolute top-[17vh] left-[8vw] z-10 w-[44vw]">
        <h2 className="text-text text-[3.6vw] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-[3.5vh]">
          The rule that builds trust
        </h2>

        <p className="text-primary text-[2.7vw] font-bold leading-[1.2] tracking-[-0.015em] m-0 mb-[1.6vh]">
          Code calculates; AI explains
        </p>
        <p className="text-muted text-[1.9vw] leading-[1.4] m-0 mb-[4.5vh]">
          The model is never the source of truth
        </p>

        <div className="flex items-start gap-[1.2vw] mb-[3vh]">
          <div className="w-[0.8vw] h-[0.8vw] bg-primary shrink-0 mt-[1.1vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            Every recommendation shows its inputs and its calculation
          </p>
        </div>

        <div className="flex items-start gap-[1.2vw]">
          <div className="w-[0.8vw] h-[0.8vw] bg-primary shrink-0 mt-[1.1vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            Owner-scoped records, with tests that prevent cross-user access
          </p>
        </div>
      </div>

      <div className="absolute top-[19vh] right-[7vw] z-10 w-[34vw] bg-bg border border-line shadow-[0_1.5vh_3vh_rgba(0,0,0,0.05)] p-[2.2vw]">
        <div className="flex items-center justify-between mb-[2.2vh]">
          <div className="text-faint text-[1.5vw] font-semibold uppercase tracking-[0.12em]">
            Safe to spend
          </div>
          <div className="text-accent text-[1.5vw] font-semibold uppercase tracking-[0.12em]">
            Illustrative
          </div>
        </div>

        <div className="text-primary text-[3.4vw] font-bold tracking-[-0.02em] leading-none mb-[1vh]">
          JOD 412.500
        </div>
        <div className="text-muted text-[1.5vw] mb-[2.8vh]">
          for the 12 days until next salary
        </div>

        <div className="flex justify-between border-t border-line py-[1.7vh]">
          <div className="text-muted text-[1.6vw]">Salary received</div>
          <div className="text-text text-[1.6vw] font-semibold">
            JOD 1,150.000
          </div>
        </div>
        <div className="flex justify-between border-t border-line py-[1.7vh]">
          <div className="text-muted text-[1.6vw]">Committed before payday</div>
          <div className="text-text text-[1.6vw] font-semibold">
            − JOD 662.500
          </div>
        </div>
        <div className="flex justify-between border-t border-line py-[1.7vh]">
          <div className="text-muted text-[1.6vw]">Goal buffer</div>
          <div className="text-text text-[1.6vw] font-semibold">
            − JOD 75.000
          </div>
        </div>
        <div className="flex justify-between border-t-[0.35vh] border-primary py-[1.7vh]">
          <div className="text-text text-[1.6vw] font-semibold">
            Safe to spend
          </div>
          <div className="text-accent text-[1.6vw] font-bold">JOD 412.500</div>
        </div>

        <p className="text-faint text-[1.5vw] leading-[1.4] m-0 mt-[1.4vh] [text-wrap:pretty]">
          Three-decimal JOD precision — every figure traces to its inputs
        </p>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        07
      </div>
    </div>
  );
}
