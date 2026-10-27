import gsap from "gsap";

const giftRevealAnimationDefaults = {
  spinEndSpeed: 0.02,
  spin1Speed: 0.06,
  spin1Duration: 0.8,
  spin1Ease: "power2.in",
  spin1At: 0,
  spin2Speed: 0.5,
  spin2Duration: 0.1,
  spin2Ease: "power3.in",
  spin2At: 0.8,
  spin3Duration: 0.8,
  spin3Ease: "power2.out",
  spin3At: 0.9,
  nudgeUpY: 0.15,
  nudgeUpDuration: 0.8,
  nudgeUpEase: "power2.out",
  nudgeUpAt: 0,
  nudgeDownY: 0,
  nudgeDownDuration: 0.8,
  nudgeDownEase: "power2.inOut",
  nudgeDownAt: 0.9,
  giftFadeDuration: 0.25,
  giftFadeEase: "power2.in",
  giftFadeAt: 0.9,
  productFadeDuration: 0.3,
  productFadeEase: "power1.out",
  productFadeAt: 0.95,
  productScaleDuration: 0.3,
  productScaleEase: "power1.out",
  productScaleAt: 0.95,
};

export const giftRevealConfigTapToUnlock = Object.freeze({
  ...giftRevealAnimationDefaults,
});

export const giftRevealConfigAR = Object.freeze({
  ...giftRevealAnimationDefaults,
  spinEndSpeed: 0,
  spin1Speed: 0.06,
  spin2Speed: 0.4,
  spin3Duration: 3.1,
  spin3Ease: "power4.out",
  swapGroupBurstScale: 1.35,
  swapGroupScaleUpAt: 0.7,
  swapGroupScaleUpDuration: 0.3,
  swapGroupScaleUpEase: "power3.in",
});

function giftRevealCollectMeshMaterials(root) {
  const mats = [];
  root.traverse((child) => {
    if (child.isMesh) {
      const meshMats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.push(...meshMats);
    }
  });
  return mats;
}

function giftRevealDisposeGiftTree(giftRoot) {
  if (!giftRoot?.parent) {
    return;
  }
  giftRoot.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((mat) => mat?.dispose());
    }
  });
  giftRoot.parent.remove(giftRoot);
}

export function runGiftRevealTimeline({
  swapGroup,
  giftRoot,
  productRoot,
  spinState,
  config,
  onGiftDisposed,
  onRevealReady,
  onComplete,
}) {
  if (!swapGroup || !giftRoot || !productRoot || !config) {
    return null;
  }

  const prefersReduce = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  productRoot.traverse((child) => {
    if (child.isMesh) {
      child.renderOrder = 1;
    }
  });

  const giftMats = giftRevealCollectMeshMaterials(giftRoot);
  const productMats = giftRevealCollectMeshMaterials(productRoot);

  const fullScale = productRoot.userData.arRevealFullScale;
  const spinEndSpeed = config.spinEndSpeed;

  if (prefersReduce) {
    giftMats.forEach((mat) => {
      mat.opacity = 0;
    });
    giftRevealDisposeGiftTree(giftRoot);
    onGiftDisposed?.();
    productMats.forEach((mat) => {
      mat.opacity = 1;
    });
    if (fullScale) {
      productRoot.scale.set(fullScale.x, fullScale.y, fullScale.z);
    }
    const burstReduce = config.swapGroupBurstScale;
    if (typeof burstReduce === "number" && burstReduce > 1) {
      swapGroup.scale.setScalar(burstReduce);
    }
    if (spinState) {
      spinState.speed = spinEndSpeed;
    }
    onRevealReady?.();
    onComplete?.();
    return null;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      onComplete?.();
    },
  });

  if (spinState) {
    tl.to(
      spinState,
      {
        speed: config.spin1Speed,
        duration: config.spin1Duration,
        ease: config.spin1Ease,
      },
      config.spin1At,
    );

    tl.to(
      spinState,
      {
        speed: config.spin2Speed,
        duration: config.spin2Duration,
        ease: config.spin2Ease,
      },
      config.spin2At,
    );

    tl.to(
      spinState,
      {
        speed: spinEndSpeed,
        duration: config.spin3Duration,
        ease: config.spin3Ease,
      },
      config.spin3At,
    );
  }

  const burstScale = config.swapGroupBurstScale;
  if (typeof burstScale === "number" && burstScale > 1) {
    tl.to(
      swapGroup.scale,
      {
        x: burstScale,
        y: burstScale,
        z: burstScale,
        duration: config.swapGroupScaleUpDuration,
        ease: config.swapGroupScaleUpEase,
      },
      config.swapGroupScaleUpAt,
    );

    if (typeof config.swapGroupScaleDownAt === "number") {
      tl.to(
        swapGroup.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: config.swapGroupScaleDownDuration,
          ease: config.swapGroupScaleDownEase,
        },
        config.swapGroupScaleDownAt,
      );
    }
  }

  tl.to(
    swapGroup.position,
    {
      y: config.nudgeUpY,
      duration: config.nudgeUpDuration,
      ease: config.nudgeUpEase,
    },
    config.nudgeUpAt,
  );

  tl.to(
    swapGroup.position,
    {
      y: config.nudgeDownY,
      duration: config.nudgeDownDuration,
      ease: config.nudgeDownEase,
    },
    config.nudgeDownAt,
  );

  giftMats.forEach((mat, i) => {
    tl.to(
      mat,
      {
        opacity: 0,
        duration: config.giftFadeDuration,
        ease: config.giftFadeEase,
        onComplete:
          i === 0
            ? () => {
                giftRevealDisposeGiftTree(giftRoot);
                onGiftDisposed?.();
              }
            : undefined,
      },
      config.giftFadeAt,
    );
  });

  productMats.forEach((mat) => {
    tl.to(
      mat,
      {
        opacity: 1,
        duration: config.productFadeDuration,
        ease: config.productFadeEase,
      },
      config.productFadeAt,
    );
  });

  if (fullScale) {
    tl.to(
      productRoot.scale,
      {
        x: fullScale.x,
        y: fullScale.y,
        z: fullScale.z,
        duration: config.productScaleDuration,
        ease: config.productScaleEase,
      },
      config.productScaleAt,
    );
  }

  if (typeof onRevealReady === "function") {
    const readyAt =
      (config.productFadeAt ?? 0) + (config.productFadeDuration ?? 0);
    tl.call(onRevealReady, [], readyAt);
  }

  return tl;
}
