import { Show, SignUpButton, UserButton } from "@clerk/nextjs";
import Clock from "./clock";

export default function Home() {
  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Invytt" className="logo-img" />
        </div>
        <div className="nav-right">
          <Show when="signed-in">
            <UserButton />
          </Show>
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
            <a href="/dashboard">
              <button className="nav-cta">Get Started ↗</button>
            </a>
          </Show>
        </div>
      </nav>

      <section className="hero">
        <h1 className="title">
          <span className="scriptle">Enterprise</span>
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
            Power your organization's events with our
            <br />
             enterprise platform — built for scale,
            <br />
           with dedicated support, advanced controls,
            <br />
            and the tools your team needs to host with confidence.
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
