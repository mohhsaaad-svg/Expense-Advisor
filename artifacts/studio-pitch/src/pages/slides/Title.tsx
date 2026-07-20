export default function Title() {
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

      <div className="absolute bottom-[10vh] left-[10vw] z-10 max-w-[62vw]">
        <div className="text-primary text-[1.2vw] font-semibold tracking-[-0.01em] mb-[2vh]">
          Studio introduction — July 2026
        </div>
        <h1 className="text-text text-[7vw] font-bold leading-[1.05] tracking-[-0.03em] m-0 mb-[2vh] [text-wrap:balance]">
          Product Lab
        </h1>
        <p className="text-muted text-[1.8vw] font-normal leading-[1.4] max-w-[52vw] m-0 [text-wrap:pretty]">
          A product studio that turns ideas into working software. Introducing
          the studio, our first product, and where it goes next.
        </p>
      </div>
    </div>
  );
}
