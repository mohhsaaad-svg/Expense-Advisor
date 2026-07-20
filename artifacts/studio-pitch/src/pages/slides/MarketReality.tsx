export default function MarketReality() {
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
        <h2 className="text-text text-[4vw] font-bold leading-[1.1] tracking-[-0.02em] m-0 mb-[4.5vh]">
          What the market told us
        </h2>

        <div className="grid grid-cols-[6vw_1fr] items-baseline border-t border-line py-[2.2vh]">
          <div className="text-steel text-[1.5vw] font-bold">01</div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            Tracking and dashboards are commodities — global leaders already
            own them
          </p>
        </div>

        <div className="grid grid-cols-[6vw_1fr] items-baseline border-t border-line py-[2.2vh]">
          <div className="text-steel text-[1.5vw] font-bold">02</div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            “Free”, “privacy-first”, “Arabic”, “AI companion”: every claim is
            already occupied
          </p>
        </div>

        <div className="grid grid-cols-[6vw_1fr] items-baseline border-t border-line py-[2.2vh]">
          <div className="text-steel text-[1.5vw] font-bold">03</div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            Three layers compete for the same user: global PFM, AI finance,
            regional fintech
          </p>
        </div>

        <div className="grid grid-cols-[6vw_1fr] items-baseline border-t border-line py-[2.2vh]">
          <div className="text-steel text-[1.5vw] font-bold">04</div>
          <p className="text-text text-[2vw] leading-[1.4] m-0 [text-wrap:pretty]">
            The strongest competitor is doing nothing — bank apps,
            spreadsheets, memory
          </p>
        </div>

        <div className="mt-[3.5vh] bg-primary px-[2.4vw] py-[2.6vh] flex items-center gap-[2vw]">
          <div className="text-steel text-[1.5vw] font-semibold uppercase tracking-[0.12em] shrink-0">
            Conclusion
          </div>
          <p className="text-bg text-[2.1vw] font-semibold m-0">
            The category didn’t crack open — it reorganized
          </p>
        </div>
      </div>

      <div className="absolute bottom-[5vh] left-[5vw] text-faint text-[1.5vw] font-semibold z-10">
        04
      </div>
    </div>
  );
}
