import { Show, SignUpButton, UserButton } from "@clerk/nextjs";
import Clock from "./clock";

export default function Home() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">
          Invytt
          <br />
          <span className="scriptle">Early Events</span>
        </div>
        <div className="nav-right">
          <Show when="signed-out">
            <SignUpButton
              mode="modal"
              forceRedirectUrl="/dashboard"
              signInForceRedirectUrl="/dashboard"
            >
              <button className="nav-cta">Get Started ↗</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </nav>

      <section className="hero">
        <h1 className="title">
          Invytt
          <br />
          <span className="scriptle">Early Events</span>
        </h1>

        <div className="tv-wrap">
          <div className="tv">
            <a
              className="screen"
              href="https://invytt.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open invytt.com"
              style={{ cursor: "pointer" }}
            >
              <video
                className="screen-video"
                src="/vid1.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="screen-scan" />
            </a>

            <div className="tv-side">
              <div className="speaker" />
              <div className="knobs">
                <div className="knob" />
                <div className="knob" />
              </div>
            </div>
          </div>

          <p className="tv-caption">
            Join the early event program 
            <br />
            to host early events and get access to exclusive host features,
            <br />
            and help us build the future of event hosting.
          </p>
        </div>
      </section>

      <div className="meta">
        <div className="loc">
          <span className="pin" />
          BLR
        </div>
        <Clock />
      </div>
    </main>
  );
}
