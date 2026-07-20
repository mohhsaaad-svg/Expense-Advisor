export default function Studio() {
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

      <div className="absolute top-[18vh] left-[10vw] z-10 w-[80vw]">
        <h2 className="text-text text-[4vw] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-[5vh]">
          The studio in one slide
        </h2>

        <div className="flex gap-[3vw]">
          <div className="flex-1 bg-bg border border-line p-[2.4vw] shadow-[0_1vh_2vh_rgba(0,0,0,0.02)]">
            <div className="w-[2vw] h-[2vw] bg-primary mb-[2.2vh]" />
            <h3 className="text-text text-[2vw] font-semibold m-0 mb-[1.4vh]">
              Our own products
            </h3>
            <p className="text-muted text-[2vw] leading-[1.5] m-0 [text-wrap:pretty]">
              We build and operate our own products — not client work.
            </p>
          </div>

          <div className="flex-1 bg-bg border border-line p-[2.4vw] shadow-[0_1vh_2vh_rgba(0,0,0,0.02)]">
            <div className="w-[2vw] h-[2vw] bg-steel mb-[2.2vh]" />
            <h3 className="text-text text-[2vw] font-semibold m-0 mb-[1.4vh]">
              Distinct identity
            </h3>
            <p className="text-muted text-[2vw] leading-[1.5] m-0 [text-wrap:pretty]">
              Every product gets a distinct identity on a shared craft bar.
            </p>
          </div>

          <div className="flex-1 bg-bg border border-line p-[2.4vw] shadow-[0_1vh_2vh_rgba(0,0,0,0.02)]">
            <div className="w-[2vw] h-[2vw] bg-accent mb-[2.2vh]" />
            <h3 className="text-text text-[2vw] font-semibold m-0 mb-[1.4vh]">
              Small by design
            </h3>
            <p className="text-muted text-[2vw] leading-[1.5] m-0 [text-wrap:pretty]">
              Strategy, build, and quality in one tight loop.
            </p>
          </div>
        </div>

        <div className="mt-[5vh] border-t-[0.35vh] border-primary pt-[2.6vh] flex items-center gap-[1.4vw]">
          <div className="w-[1.2vw] h-[1.2vw] bg-accent shrink-0" />
          <p className="text-text text-[2.2vw] font-semibold m-0">
            Product #1 is live today: a full web + mobile + API finance product
          </p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        02
      </div>
    </div>
  );
}
