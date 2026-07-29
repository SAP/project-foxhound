/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useCallback, useEffect, useRef } from "react";

/**
 * A custom react hook that sets up an IntersectionObserver to observe a single
 * or list of elements and triggers a callback when the element comes into the viewport
 * Note: The refs used should be an array type
 *
 * @function useIntersectionObserver
 * @param {function} callback - The function to call when an element comes into the viewport
 * @param {object} options - Options object passed to Intersection Observer:
 * https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#options
 * @param {boolean} [isSingle = false] Boolean if the elements are an array or single element
 *
 * @returns {React.MutableRefObject} a ref containing an array of elements or single element
 */
function useIntersectionObserver(callback, threshold = 0.3) {
  const elementsRef = useRef([]);
  const triggeredElements = useRef(new WeakSet());
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (
            entry.isIntersecting &&
            !triggeredElements.current.has(entry.target)
          ) {
            triggeredElements.current.add(entry.target);
            callback(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    elementsRef.current.forEach(el => {
      if (el && !triggeredElements.current.has(el)) {
        observer.observe(el);
      }
    });

    // Cleanup function to disconnect observer on unmount
    return () => observer.disconnect();
  }, [callback, threshold]);

  return elementsRef;
}

/**
 * Determines which column layout is active based on the screen width
 *
 * @param {number} screenWidth - The current window width (in pixels)
 * @returns {string} The active column layout (e.g. "col-3", "col-2", "col-1")
 */
function getActiveColumnLayout(screenWidth) {
  // Startup-cache rendering can call this before window.innerWidth is usable.
  const safeScreenWidth = Number.isFinite(screenWidth) ? screenWidth : 0;
  const breakpoints = [
    { min: 1374, column: "col-4" }, // $break-point-sections-variant
    { min: 1122, column: "col-3" }, // $break-point-widest
    { min: 724, column: "col-2" }, // $break-point-layout-variant
    { min: 0, column: "col-1" }, // (default layout)
  ];
  return breakpoints.find(bp => safeScreenWidth >= bp.min).column;
}

/**
 * Reads the active column layout from a DOM element via the --sections-col-count
 * CSS variable set by Nova grid container queries.
 *
 * @param {Element} el
 * @returns {string|null} e.g. "col-2", or null if the property is not set (classic path)
 */
function getNovaColumnLayout(el) {
  if (!el) {
    return null;
  }
  const val = parseInt(
    getComputedStyle(el).getPropertyValue("--sections-col-count"),
    10
  );
  return Number.isInteger(val) ? `col-${val}` : null;
}

/**
 * Determines the active card size ("small", "medium", or "large") based on the screen width
 * and class names applied to the card element at the time of an event (example: click)
 *
 * @param {number} screenWidth - The current window width (in pixels).
 * @param {string | string[]} classNames - A string or array of class names applied to the sections card.
 * @param {boolean[]} sectionsEnabled - If sections is not enabled, all cards are `medium-card`
 * @param {number} flightId - Error edge case: This function should not be called on spocs, which have flightId
 * @param {string} [columnLayout] - The active column layout (e.g. "col-2")
 * @returns {"small-card" | "medium-card" | "large-card" | null} The active card type, or null if none is matched.
 */
function getActiveCardSize(
  screenWidth,
  classNames,
  sectionsEnabled,
  flightId,
  columnLayout
) {
  // Only applies to sponsored content
  if (flightId) {
    return "spoc";
  }

  // Default layout only supports `medium-card`
  if (!sectionsEnabled) {
    // Missing arguments
    return "medium-card";
  }

  // Return null if no values are available
  // @nova-cleanup(remove-conditional): Remove the screenWidth check once Nova ships
  if ((!screenWidth && !columnLayout) || !classNames) {
    // Missing arguments
    return null;
  }

  const classList = classNames.split(" ");
  const cardTypes = ["small", "medium", "large"];

  // Determine which column is active based on the current screen width
  // @nova-cleanup(remove-conditional): Replace with just columnLayout once Nova ships
  const currColumnCount = columnLayout ?? getActiveColumnLayout(screenWidth);

  // Match the card type for that column count
  for (let type of cardTypes) {
    const className = `${currColumnCount}-${type}`;
    if (classList.includes(className)) {
      return `${type}-card`;
    }
  }

  return null;
}

const CONFETTI_VARS = [
  "--color-red-40",
  "--color-yellow-40",
  "--color-purple-40",
  "--color-blue-40",
  "--color-green-40",
];

/**
 * Custom hook to animate a confetti burst.
 *
 * @param {number} count   Number of particles
 * @param {number} spread  spread of confetti
 * @returns {[React.RefObject<HTMLCanvasElement>, () => void]}
 */
function useConfetti(count = 80, spread = Math.PI / 3) {
  // avoid errors from about:home cache
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let colors;
  // if in abouthome cache, getComputedStyle will not be available
  if (typeof getComputedStyle === "function") {
    const styles = getComputedStyle(document.documentElement);
    colors = CONFETTI_VARS.map(variable =>
      styles.getPropertyValue(variable).trim()
    );
  } else {
    colors = ["#fa5e75", "#de9600", "#c671eb", "#3f94ff", "#37b847"];
  }

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(0);

  // initialize/reset pool
  const initializeConfetti = useCallback(
    (width, height) => {
      const centerX = width / 2;
      const centerY = height;
      const pool = particlesRef.current;

      // Create or overwrite each particle’s initial state
      for (let i = 0; i < count; i++) {
        const angle = Math.PI / 2 + (Math.random() - 0.5) * spread;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const color = colors[Math.floor(Math.random() * colors.length)];

        pool[i] = {
          x: centerX + (Math.random() - 0.5) * 40,
          y: centerY,
          cos,
          sin,
          velocity: Math.random() * 6 + 6,
          gravity: 0.3,
          decay: 0.96,
          size: 8,
          color,
          life: 0,
          maxLife: 100,
          tilt: Math.random() * Math.PI * 2,
          tiltSpeed: Math.random() * 0.2 + 0.05,
        };
      }
    },
    [count, spread, colors]
  );

  // Core animation loop — updates physics & renders each frame
  const animateParticles = useCallback(canvas => {
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    const pool = particlesRef.current;

    // Clear the entire canvas each frame
    context.clearRect(0, 0, width, height);

    let anyAlive = false;
    for (let particle of pool) {
      if (particle.life < particle.maxLife) {
        anyAlive = true;

        // update each particles physics: position, velocity decay, gravity, tilt, lifespan
        particle.velocity *= particle.decay;
        particle.x += particle.cos * particle.velocity;
        particle.y -= particle.sin * particle.velocity;
        particle.y += particle.gravity;
        particle.tilt += particle.tiltSpeed;
        particle.life += 1;
      }

      // Draw: apply alpha, transform & draw a rotated, scaled square
      const alphaValue = 1 - particle.life / particle.maxLife;
      const scaleY = Math.sin(particle.tilt);

      context.globalAlpha = alphaValue;
      context.setTransform(1, 0, 0, 1, particle.x, particle.y);
      context.rotate(Math.PI / 4);
      context.scale(1, scaleY);

      context.fillStyle = particle.color;
      context.fillRect(
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size
      );

      // reset each particle
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
    }

    if (anyAlive) {
      // continue the animation
      animationFrameRef.current = requestAnimationFrame(() => {
        animateParticles(canvas);
      });
    } else {
      cancelAnimationFrame(animationFrameRef.current);
      context.clearRect(0, 0, width, height);
    }
  }, []);

  // Resets and starts a new confetti animation
  const fireConfetti = useCallback(() => {
    if (prefersReducedMotion) {
      return;
    }
    const canvas = canvasRef?.current;
    if (canvas) {
      cancelAnimationFrame(animationFrameRef.current);
      initializeConfetti(canvas.width, canvas.height);
      animateParticles(canvas);
    }
  }, [initializeConfetti, animateParticles, prefersReducedMotion]);

  return [canvasRef, fireConfetti];
}

/**
 * Wires a click listener onto a widget's "change size" submenu and returns a
 * ref callback to attach to its <panel-list slot="submenu"> element.
 *
 * moz-panel-list moves the submenu into shadow DOM, so React synthetic events
 * don't reach the inner <panel-item> elements; we listen on the submenu element
 * directly and resolve the clicked item across the shadow boundary via
 * composedPath() and its data-size attribute.
 *
 * A ref callback is required because several widgets gate their whole render on
 * async data and only mount the submenu once that data loads. The ref callback
 * fires whenever the node attaches, so the listener is wired up no matter when
 * the menu first appears.
 *
 * @function useSizeSubmenu
 * @param {function} onChangeSize - Called with the selected size string when a
 *   submenu item is clicked.
 * @returns {function} A ref callback for the submenu <panel-list> element.
 */
function useSizeSubmenu(onChangeSize) {
  const onChangeSizeRef = useRef(onChangeSize);
  const cleanupRef = useRef(null);

  useEffect(() => {
    onChangeSizeRef.current = onChangeSize;
  }, [onChangeSize]);

  return useCallback(el => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) {
      return;
    }
    const listener = e => {
      const item = e.composedPath().find(node => node.dataset?.size);
      if (item) {
        onChangeSizeRef.current(item.dataset.size);
      }
    };
    el.addEventListener("click", listener);
    cleanupRef.current = () => el.removeEventListener("click", listener);
  }, []);
}

export {
  useIntersectionObserver,
  useSizeSubmenu,
  getActiveCardSize,
  getActiveColumnLayout,
  getNovaColumnLayout,
  useConfetti,
};
