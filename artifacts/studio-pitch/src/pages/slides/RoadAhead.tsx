export default function RoadAhead() {
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

      <div className="absolute top-[17vh] left-[8vw] z-10 w-[84vw]">
        <h2 className="text-text text-[4vw] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-[5vh]">
          The road ahead
        </h2>

        <div className="grid grid-cols-[11vw_1fr] items-center border-t border-line py-[3vh]">
          <div className="bg-primary text-bg text-[1.5vw] font-bold uppercase tracking-[0.1em] px-[1.1vw] py-[0.8vh] w-fit">
            Now
          </div>
          <p className="text-text text-[2.1vw] leading-[1.35] m-0 [text-wrap:pretty]">
            Finish security hardening on the live build
          </p>
        </div>

        <div className="grid grid-cols-[11vw_1fr] items-center border-t border-line py-[3vh]">
          <div className="border border-primary text-primary text-[1.5vw] font-bold uppercase tracking-[0.1em] px-[1.1vw] py-[0.8vh] w-fit">
            Next
          </div>
          <p className="text-text text-[2.1vw] leading-[1.35] m-0 [text-wrap:pretty]">
            Salary-cycle foundations and a safe-to-spend prototype with real
            regional users
          </p>
        </div>

        <div className="grid grid-cols-[11vw_1fr] items-center border-t border-line py-[3vh]">
          <div className="border border-line text-muted text-[1.5vw] font-bold uppercase tracking-[0.1em] px-[1.1vw] py-[0.8vh] w-fit">
            Then
          </div>
          <p className="text-text text-[2.1vw] leading-[1.35] m-0 [text-wrap:pretty]">
            Affordability scenarios and a weekly report
          </p>
        </div>

        <div className="mt-[5.5vh] flex items-center gap-[1.4vw]">
          <div className="w-[1.2vw] h-[1.2vw] bg-accent shrink-0" />
          <p className="text-primary text-[2.2vw] font-semibold m-0 [text-wrap:pretty]">
            The studio playbook is codified, so every future product launches
            faster
          </p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        09
      </div>
    </div>
  );
}
