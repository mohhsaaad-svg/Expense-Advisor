export default function Wedge() {
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

      <div className="absolute top-[16vh] left-[8vw] z-10 w-[42vw]">
        <h2 className="text-text text-[4vw] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-[4.5vh]">
          The defensible wedge
        </h2>

        <div className="flex items-start gap-[1.4vw] mb-[2.6vh]">
          <div className="text-accent text-[1.5vw] font-bold w-[2.4vw] shrink-0">
            1
          </div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            Salary-to-salary planning, not calendar months
          </p>
        </div>

        <div className="flex items-start gap-[1.4vw] mb-[2.6vh]">
          <div className="text-accent text-[1.5vw] font-bold w-[2.4vw] shrink-0">
            2
          </div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            Models regional life: quarterly rent, remittances, installments,
            family obligations
          </p>
        </div>

        <div className="flex items-start gap-[1.4vw] mb-[2.6vh]">
          <div className="text-accent text-[1.5vw] font-bold w-[2.4vw] shrink-0">
            3
          </div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            JOD, KWD and BHD three-decimal accuracy
          </p>
        </div>

        <div className="flex items-start gap-[1.4vw] mb-[2.6vh]">
          <div className="text-accent text-[1.5vw] font-bold w-[2.4vw] shrink-0">
            4
          </div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            Ramadan, Eid, school-fee and travel scenarios
          </p>
        </div>

        <div className="flex items-start gap-[1.4vw]">
          <div className="text-accent text-[1.5vw] font-bold w-[2.4vw] shrink-0">
            5
          </div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            Arabic explanations backed by transparent, deterministic
            calculations
          </p>
        </div>
      </div>

      <div className="absolute top-[30vh] right-[6vw] z-10 w-[40vw]">
        <div className="text-faint text-[1.5vw] font-semibold uppercase tracking-[0.12em] mb-[5vh]">
          One salary cycle, modeled
        </div>

        <div className="relative h-[24vh]">
          <div className="absolute left-0 right-0 top-[10vh] h-[0.3vh] bg-line" />

          <div className="absolute left-0 top-[10vh] -translate-y-1/2 w-[1.3vw] h-[1.3vw] bg-primary" />
          <div className="absolute left-0 top-[13vh] text-primary text-[1.5vw] font-semibold uppercase tracking-[0.06em]">
            Salary day
          </div>

          <div className="absolute left-[26%] top-[10vh] -translate-y-1/2 w-[1vw] h-[1vw] bg-accent" />
          <div className="absolute left-[20%] top-[4.5vh] text-muted text-[1.5vw] uppercase tracking-[0.05em]">
            Rent (quarterly)
          </div>

          <div className="absolute left-[47%] top-[10vh] -translate-y-1/2 w-[1vw] h-[1vw] bg-accent" />
          <div className="absolute left-[43%] top-[13vh] text-muted text-[1.5vw] uppercase tracking-[0.05em]">
            Remittance
          </div>

          <div className="absolute left-[68%] top-[10vh] -translate-y-1/2 w-[1vw] h-[1vw] bg-accent" />
          <div className="absolute left-[62%] top-[4.5vh] text-muted text-[1.5vw] uppercase tracking-[0.05em]">
            Installment
          </div>

          <div className="absolute right-0 top-[10vh] -translate-y-1/2 w-[1.3vw] h-[1.3vw] border-[0.2vw] border-primary bg-bg" />
          <div className="absolute right-0 top-[13vh] text-primary text-[1.5vw] font-semibold uppercase tracking-[0.06em] text-right">
            Next salary
          </div>
        </div>

        <div className="border-t-[0.35vh] border-primary pt-[2.4vh]">
          <p className="text-muted text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            Commitments mapped from payday to payday — what remains is safe to
            spend, and the math is shown.
          </p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        06
      </div>
    </div>
  );
}
