const base = import.meta.env.BASE_URL;

export default function EmberProof() {
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

      <div className="absolute top-[16vh] left-[8vw] z-10 w-[46vw]">
        <h2 className="text-text text-[3.4vw] font-bold leading-[1.12] tracking-[-0.02em] m-0 mb-[3.5vh] [text-wrap:balance]">
          Product #1: Ember — proof we can ship
        </h2>

        <div className="flex items-start gap-[1.2vw] mb-[2.4vh]">
          <div className="w-[0.8vw] h-[0.8vw] bg-primary shrink-0 mt-[1.1vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            Live now: React web app, native mobile app, shared API + Postgres
          </p>
        </div>

        <div className="flex items-start gap-[1.2vw] mb-[2.4vh]">
          <div className="w-[0.8vw] h-[0.8vw] bg-primary shrink-0 mt-[1.1vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            Daily spend tracking, budgets, goals, and automatic alerts
          </p>
        </div>

        <div className="flex items-start gap-[1.2vw] mb-[2.4vh]">
          <div className="w-[0.8vw] h-[0.8vw] bg-accent shrink-0 mt-[1.1vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            “Rituals” — recurring expenses that log themselves on schedule
          </p>
        </div>

        <div className="flex items-start gap-[1.2vw] mb-[2.4vh]">
          <div className="w-[0.8vw] h-[0.8vw] bg-accent shrink-0 mt-[1.1vh]" />
          <p className="text-text text-[2vw] leading-[1.45] m-0 [text-wrap:pretty]">
            “Ask Ember” — an AI coach grounded in the user’s real numbers
          </p>
        </div>

      </div>

      <div className="absolute top-[14vh] right-[5vw] z-10 w-[38vw] h-[78vh]">
        <div className="absolute left-0 top-[3vh] w-[28vw] bg-bg border border-line shadow-[0_1.5vh_3vh_rgba(0,0,0,0.06)]">
          <div className="h-[3vh] bg-[#f5f5f5] border-b border-line flex items-center gap-[0.5vw] px-[0.8vw]">
            <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-line" />
            <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-line" />
            <div className="w-[0.6vw] h-[0.6vw] rounded-full bg-line" />
          </div>
          <img
            src={`${base}ember-web.jpg`}
            crossOrigin="anonymous"
            alt="Ember web app"
            className="w-full block"
          />
        </div>

        <div className="absolute right-0 top-[26vh] w-[12.5vw] bg-text rounded-[1.4vw] p-[0.4vw] shadow-[0_2vh_4vh_rgba(0,0,0,0.14)]">
          <img
            src={`${base}ember-mobile.jpg`}
            crossOrigin="anonymous"
            alt="Ember mobile app"
            className="w-full block rounded-[1.1vw]"
          />
        </div>

        <div className="absolute left-0 bottom-[1vh] text-faint text-[1.5vw]">
          Real product screens — Ember web and mobile
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        03
      </div>
    </div>
  );
}
