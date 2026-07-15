"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PizzaGraphic from "./PizzaGraphic";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SliceShowcase() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".slice-pizza", {
        x: -80,
        opacity: 0,
        rotate: -20,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      });

      gsap.from(".slice-copy > *", {
        x: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      });

      gsap.to(".slice-pizza-inner", {
        rotate: -360,
        duration: 50,
        ease: "none",
        repeat: -1,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} style={{ padding: "80px 0" }}>
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          alignItems: "center",
          gap: 50,
        }}
      >
        <div className="slice-pizza" style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: "-10%",
              background: "radial-gradient(circle, rgba(201,154,46,0.16), transparent 65%)",
              borderRadius: "50%",
              zIndex: 0,
            }}
          />
          <div className="slice-pizza-inner" style={{ position: "relative", zIndex: 1 }}>
            <PizzaGraphic size={320} toppingSeed={2} />
          </div>
        </div>

        <div className="slice-copy">
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Our Craft
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(30px, 3.6vw, 44px)",
              lineHeight: 1.12,
              fontWeight: 700,
            }}
          >
            A Slice of <span style={{ color: "var(--red)", fontStyle: "italic" }}>Perfection</span> in Every Bite
          </h2>
          <p style={{ marginTop: 20, color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 480 }}>
            Crafted with fresh ingredients, bold flavours, and a whole lot of
            love — our pizzas are designed to satisfy your cravings. Whether
            you love classic combos or adventurous toppings, every slice is a
            journey of taste that'll keep you coming back for more.
          </p>
          <a href="#menu" className="btn btn-primary" style={{ marginTop: 28 }}>
            View More
          </a>
        </div>
      </div>
    </section>
  );
}
