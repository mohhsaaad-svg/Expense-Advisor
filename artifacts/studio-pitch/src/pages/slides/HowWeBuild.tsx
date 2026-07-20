export default function HowWeBuild() {
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

      <div className="absolute top-[16vh] left-[8vw] z-10 w-[84vw]">
        <h2 className="text-text text-[4vw] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-[5vh]">
          How Product Lab builds
        </h2>

        <div className="text-faint text-[1.5vw] font-semibold uppercase tracking-[0.12em] mb-[1.8vh]">
          Quality gates on every release
        </div>
        <div className="flex items-center gap-[1vw] mb-[5vh]">
          <div className="bg-primary text-bg px-[1.5vw] py-[1.4vh] text-[1.5vw] font-semibold">
            Typecheck
          </div>
          <div className="text-faint text-[1.6vw]">→</div>
          <div className="bg-bg border border-line px-[1.5vw] py-[1.4vh] text-[1.5vw] font-semibold text-text">
            API tests
          </div>
          <div className="text-faint text-[1.6vw]">→</div>
          <div className="bg-bg border border-line px-[1.5vw] py-[1.4vh] text-[1.5vw] font-semibold text-text">
            End-to-end tests
          </div>
          <div className="text-faint text-[1.6vw]">→</div>
          <div className="bg-bg border border-line px-[1.5vw] py-[1.4vh] text-[1.5vw] font-semibold text-text">
            Code review
          </div>
          <div className="text-faint text-[1.6vw]">→</div>
          <div className="bg-bg border border-line px-[1.5vw] py-[1.4vh] text-[1.5vw] font-semibold text-text">
            Threat model
          </div>
        </div>

        <div className="text-faint text-[1.5vw] font-semibold uppercase tracking-[0.12em] mb-[1.8vh]">
          Evidence over opinions
        </div>
        <div className="flex gap-[3vw] mb-[5vh]">
          <div className="flex-1 border-t-[0.35vh] border-primary pt-[1.8vh]">
            <div className="text-steel text-[1.5vw] font-bold mb-[0.8vh]">
              01
            </div>
            <div className="text-text text-[2vw] font-semibold leading-[1.3]">
              User interviews
            </div>
          </div>
          <div className="flex-1 border-t-[0.35vh] border-primary pt-[1.8vh]">
            <div className="text-steel text-[1.5vw] font-bold mb-[0.8vh]">
              02
            </div>
            <div className="text-text text-[2vw] font-semibold leading-[1.3]">
              Prototype
            </div>
          </div>
          <div className="flex-1 border-t-[0.35vh] border-primary pt-[1.8vh]">
            <div className="text-steel text-[1.5vw] font-bold mb-[0.8vh]">
              03
            </div>
            <div className="text-text text-[2vw] font-semibold leading-[1.3]">
              40% week-4 retention
            </div>
          </div>
          <div className="flex-1 border-t-[0.35vh] border-primary pt-[1.8vh]">
            <div className="text-steel text-[1.5vw] font-bold mb-[0.8vh]">
              04
            </div>
            <div className="text-text text-[2vw] font-semibold leading-[1.3]">
              Three strangers pay
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[1.4vw]">
          <div className="w-[1.2vw] h-[1.2vw] bg-accent shrink-0" />
          <p className="text-muted text-[2vw] m-0 [text-wrap:pretty]">
            Charge before expanding — no bank sync, investments, or autonomous
            AI until value is proven
          </p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        08
      </div>
    </div>
  );
}
