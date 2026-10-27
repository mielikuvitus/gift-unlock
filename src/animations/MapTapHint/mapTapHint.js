import gsap from "gsap";

export const MAP_TAP_HINT = {
  IDLE_MS: 2000,
  LOOP_GAP_S: 4,
  MOVE_PX: 26,
  ROT_Y: 0.3,
  FADE_IN_S: 0.35,
  MOVE_S: 0.65,
  FADE_OUT_S: 0.35,
};

function clearTimer(hintTimerRef) {
  if (hintTimerRef.current != null) {
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = null;
  }
}

function killTimeline(hintTimelineRef) {
  if (hintTimelineRef.current) {
    hintTimelineRef.current.kill();
    hintTimelineRef.current = null;
  }
}

export function createMapTapHintHandlers(getCancelled, refs, setShowTapHint) {
  const {
    landsAtRef,
    interactedRef,
    hintLoopStartedRef,
    hintTimerRef,
    hintTimelineRef,
    hintIconRef,
    contentRootRef,
  } = refs;

  const {
    IDLE_MS,
    LOOP_GAP_S,
    MOVE_PX,
    ROT_Y,
    FADE_IN_S,
    MOVE_S,
    FADE_OUT_S,
  } = MAP_TAP_HINT;

  const clearHintTimer = () => clearTimer(hintTimerRef);

  const dismissHintInteraction = () => {
    const cancelled = getCancelled();
    interactedRef.current = true;
    clearHintTimer();
    killTimeline(hintTimelineRef);
    const root = contentRootRef.current;
    if (root) {
      gsap.killTweensOf(root.rotation);
      root.rotation.set(0, 0, 0);
    }
    const el = hintIconRef.current;
    if (el) {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "opacity,transform" });
    }
    if (!cancelled) {
      setShowTapHint(false);
    }
  };

  const playHint = () => {
    const cancelled = getCancelled();
    if (cancelled || interactedRef.current || hintLoopStartedRef.current) {
      return;
    }
    if (!contentRootRef.current) {
      return;
    }
    hintLoopStartedRef.current = true;
    if (!cancelled) {
      setShowTapHint(true);
    }

    let attempts = 0;
    const startAnim = () => {
      if (getCancelled() || interactedRef.current) {
        return;
      }
      const root = contentRootRef.current;
      const el = hintIconRef.current;
      if (!root) {
        return;
      }
      if (!el) {
        attempts += 1;
        if (attempts > 24) {
          return;
        }
        requestAnimationFrame(startAnim);
        return;
      }

      killTimeline(hintTimelineRef);

      const prefersReduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReduce) {
        gsap.set(el, { opacity: 1, x: 0 });
        return;
      }

      const tl = gsap.timeline({ repeat: -1 });
      hintTimelineRef.current = tl;

      tl.set(root.rotation, { y: 0 });
      tl.fromTo(
        el,
        { opacity: 0, x: 0 },
        {
          opacity: 1,
          x: 0,
          duration: FADE_IN_S,
          ease: "power2.out",
        },
      );
      tl.to(el, { x: MOVE_PX, duration: MOVE_S, ease: "power2.out" }, ">");
      tl.to(
        root.rotation,
        {
          y: ROT_Y,
          duration: MOVE_S,
          ease: "power2.out",
        },
        "<",
      );
      tl.to(el, { opacity: 0, duration: FADE_OUT_S, ease: "power2.in" });
      tl.to(
        root.rotation,
        { y: 0, duration: FADE_OUT_S, ease: "power2.in" },
        "<",
      );
      tl.to({}, { duration: LOOP_GAP_S });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(startAnim);
    });
  };

  const scheduleHintTimer = () => {
    if (interactedRef.current || getCancelled()) {
      return;
    }
    clearHintTimer();
    const wait = Math.max(
      0,
      IDLE_MS - (performance.now() - landsAtRef.current),
    );
    hintTimerRef.current = setTimeout(() => {
      hintTimerRef.current = null;
      playHint();
    }, wait);
  };

  const cleanupMountGsap = () => {
    clearHintTimer();
    killTimeline(hintTimelineRef);
    gsap.killTweensOf(hintIconRef.current);
    if (contentRootRef.current) {
      gsap.killTweensOf(contentRootRef.current.rotation);
    }
    contentRootRef.current = null;
    setShowTapHint(false);
  };

  return {
    clearHintTimer,
    dismissHintInteraction,
    playHint,
    scheduleHintTimer,
    cleanupMountGsap,
  };
}
