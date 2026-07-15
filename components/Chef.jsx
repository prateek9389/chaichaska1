"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Chef() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".chef-portrait", {
        scale: 0.7,
        opacity: 0,
        duration: 0.9,
        ease: "back.out(1.5)",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      });
      gsap.from(".chef-copy > *", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      });
      gsap.from(".chef-leaf", {
        y: -30,
        opacity: 0,
        rotate: -30,
        duration: 0.8,
        stagger: 0.1,
        scrollTrigger: { trigger: rootRef.current, start: "top 65%" },
      });

      gsap.to(".chef-leaf", {
        y: 12,
        duration: 3,
        ease: "sine.inOut",
        stagger: { each: 0.4, repeat: -1, yoyo: true },
        repeat: -1,
        yoyo: true,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="chef" ref={rootRef} style={{ padding: "100px 0", position: "relative" }}>
      <span className="chef-leaf" style={{ position: "absolute", top: 60, left: "6%", fontSize: 30 }}>
        🌿
      </span>
      <span className="chef-leaf" style={{ position: "absolute", top: 40, right: "10%", fontSize: 26 }}>
        🍄
      </span>
      <span className="chef-leaf" style={{ position: "absolute", bottom: 60, left: "12%", fontSize: 26 }}>
        🍅
      </span>
      <span className="chef-leaf" style={{ position: "absolute", bottom: 40, right: "6%", fontSize: 28 }}>
        🍃
      </span>

      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "0.8fr 1.2fr",
          alignItems: "center",
          gap: 50,
        }}
      >
        <div
          className="chef-portrait"
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "var(--red)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            boxShadow: "0 30px 50px -20px rgba(226,18,58,0.45)",
          }}
        >
          <svg width="150" height="150" viewBox="0 0 150 150" fill="none">
            <ellipse cx="75" cy="60" rx="38" ry="34" fill="#fdf5e9" />
            <path
              d="M40 55 C40 30 60 12 75 12 C90 12 110 30 110 55 C118 55 122 62 118 70 C114 78 104 76 100 70 L100 82 H50 L50 70 C46 76 36 78 32 70 C28 62 32 55 40 55Z"
              fill="#fdf5e9"
            />
            <rect x="46" y="80" width="58" height="42" rx="10" fill="#fdf5e9" />
            <circle cx="60" cy="60" r="4" fill="#241a15" />
            <circle cx="90" cy="60" r="4" fill="#241a15" />
            <path d="M60 76 Q75 86 90 76" stroke="#241a15" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        <div className="chef-copy">
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Behind The Oven
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.4vw, 42px)",
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Meet the <span style={{ color: "var(--red)", fontStyle: "italic" }}>Maestro</span> Behind the Magic!
          </h2>
          <p style={{ marginTop: 18, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 480 }}>
            Our head chef isn't just passionate about pizza, he's obsessed
            with it. With over 15 years of experience, every pizza is a
            masterpiece of taste and texture.
          </p>
          <p style={{ marginTop: 12, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 480 }}>
            From hand-kneaded dough to the perfect topping combinations, our
            chef ensures every slice delivers pure, delicious joy.
          </p>
          <a href="#about" className="btn btn-dark" style={{ marginTop: 26 }}>
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
