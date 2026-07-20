export default function Closing() {
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

      <div className="absolute top-[32vh] left-[10vw] z-10 max-w-[66vw]">
        <h2 className="text-text text-[5vw] font-bold leading-[1.05] tracking-[-0.03em] m-0 mb-[2.4vh]">
          Let’s build what’s next
        </h2>
        <p className="text-muted text-[2vw] leading-[1.4] m-0 mb-[6vh] max-w-[52vw] [text-wrap:pretty]">
          Product Lab is open to collaborators, early users, and backers.
        </p>

        <div className="flex items-start gap-[1.4vw]">
          <div className="w-[1.2vw] h-[1.2vw] bg-accent shrink-0 mt-[0.9vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 max-w-[50vw] [text-wrap:pretty]">
            Project Basira is a working title pending clearance — the vision is
            already in motion.
          </p>
        </div>
      </div>

      <div className="absolute bottom-[10vh] right-[10vw] z-10 text-right">
        <div className="text-text text-[1.5vw] font-semibold mb-[0.8vh]">
          Product Lab
        </div>
        <div className="text-muted text-[1.5vw]">
          One studio. Distinct products. A shared craft bar.
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        10
      </div>
    </div>
  );
}
