import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ConfettiShape from "../confetti-sm.svg?react";
import ConfettiShapeLong from "../confetti-long.svg?react";
import ConfettiShapeRec from "../confetti-rec.svg?react";
import ConfettiShapeRec2 from "../confetti-rec2.svg?react";
import "./ConfettiBlast.css";

const PIECE_COUNT = 16;

function ConfettiBlastLayer({ startDelayMs }) {
  const pieceRefs = useRef(
    Array.from({ length: PIECE_COUNT }, () => React.createRef()),
  );
  const tlRef = useRef(null);

  const buildAndPlay = () => {
    tlRef.current?.kill();

    const tl = gsap.timeline();
    tlRef.current = tl;

    pieceRefs.current.forEach((ref, index) => {
      gsap.set(ref.current, { x: 0, y: 0, opacity: 0, scale: 1, rotation: 0 });

      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 120;
      const curve = (Math.random() - 0.5) * 1.5;
      const r = (Math.random() - 0.5) * 300;
      const offset = index < 5 ? index * 0.06 : 5 * 0.06;
      const opacityStayHidden = 0.1;

      const proxy = { t: 0 };

      tl.to(
        proxy,
        {
          t: 1,
          duration: 1.0,
          ease: "power2.out",
          onUpdate() {
            const a = angle + curve * proxy.t;
            const d = distance * proxy.t;
            gsap.set(ref.current, {
              x: Math.cos(a) * d,
              y: Math.sin(a) * d,
              rotation: r * proxy.t,
            });
          },
        },
        offset + 0.06,
      );

      tl.to(
        ref.current,
        {
          opacity: 1,
          duration: 0.06,
          ease: "none",
        },
        offset + 0.06 + opacityStayHidden,
      );

      tl.to(
        ref.current,
        {
          opacity: 0,
          duration: 0.4,
          ease: "power1.in",
        },
        offset + 0.66,
      );
    });
  };

  useGSAP(
    () => {
      let delayedCall = null;
      const run = () => {
        buildAndPlay();
      };
      if (startDelayMs <= 0) {
        run();
      } else {
        delayedCall = gsap.delayedCall(startDelayMs / 1000, run);
      }
      return () => {
        delayedCall?.kill();
        tlRef.current?.kill();
      };
    },
    { dependencies: [startDelayMs] },
  );

  return (
    <div className="confetti-blast__stage">
      {pieceRefs.current.map((ref, i) => (
        <div
          key={i}
          className="confetti-piece"
          ref={ref}
          data-type={i >= 10 ? "rec" : "default"}
        >
          {i < 5 ? (
            <ConfettiShape />
          ) : i < 10 ? (
            <ConfettiShapeLong />
          ) : i < 13 ? (
            <ConfettiShapeRec />
          ) : (
            <ConfettiShapeRec2 />
          )}
        </div>
      ))}
    </div>
  );
}

function ConfettiBlast({ startDelaysMs = [0] }) {
  const multi = startDelaysMs.length > 1;

  if (!multi) {
    const [delay = 0] = startDelaysMs;
    return (
      <div className="confetti-blast">
        <ConfettiBlastLayer startDelayMs={delay} />
      </div>
    );
  }

  return (
    <div className="confetti-blast confetti-blast--multi">
      {startDelaysMs.map((delay, i) => (
        <div key={i} className="confetti-blast__layer">
          <ConfettiBlastLayer startDelayMs={delay} />
        </div>
      ))}
    </div>
  );
}

export default ConfettiBlast;
