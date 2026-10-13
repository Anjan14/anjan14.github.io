/* ==========================================================================
   Project demos on the homepage
   1. Pareto front explorer (GenMOR)
   2. RRT route planner (autonomous surface vehicles)
   ========================================================================== */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const W = 400, H = 300;

  function el(name, attrs = {}, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clearSvg(svg) {
    [...svg.childNodes].forEach((n) => { if (n.nodeName !== "desc") n.remove(); });
  }

  /* ======================================================================
     1. Pareto front explorer
     ====================================================================== */
  const paretoFigure = document.querySelector("[data-pareto]");
  if (paretoFigure) {
    const svg = paretoFigure.querySelector("svg");
    const readout = paretoFigure.querySelector(".demo-readout");
    const defaultText = readout.textContent;
    const pad = { l: 40, r: 14, t: 14, b: 38 };
    const sx = (x) => pad.l + x * (W - pad.l - pad.r);
    const sy = (y) => H - pad.b - y * (H - pad.t - pad.b);

    let plans = [];

    const dominates = (a, b) => a.x <= b.x && a.y <= b.y && (a.x < b.x || a.y < b.y);

    function samplePlans() {
      const out = [];
      while (out.length < 24) {
        const x = 0.04 + Math.random() * 0.92;
        const y = 0.04 + Math.random() * 0.92;
        // Keep the lower-left corner empty so a curved trade-off front appears
        if (Math.hypot(x * 1.05, y) < 0.5) continue;
        out.push({ x, y });
      }
      out.forEach((p, i) => {
        p.id = i + 1;
        p.dominators = out.filter((q) => dominates(q, p));
        p.front = p.dominators.length === 0;
      });
      return out;
    }

    function draw() {
      clearSvg(svg);

      // Axes
      el("line", { class: "axis", x1: pad.l, y1: sy(0), x2: W - pad.r, y2: sy(0) }, svg);
      el("line", { class: "axis", x1: pad.l, y1: sy(0), x2: pad.l, y2: pad.t }, svg);
      const xl = el("text", { class: "axis-label", x: pad.l, y: H - 12 }, svg);
      xl.textContent = "Objective A, lower is better";
      const yl = el("text", { class: "axis-label", x: -sy(0), y: 16, transform: "rotate(-90)" }, svg);
      yl.textContent = "Objective B, lower is better";

      // Region of plans that would beat the hovered one
      const region = el("rect", { class: "dom-region", x: pad.l, y: sy(0), width: 0, height: 0, visibility: "hidden" }, svg);

      // Pareto front staircase
      const front = plans.filter((p) => p.front).sort((a, b) => a.x - b.x);
      let d = `M${sx(front[0].x)},${pad.t} L${sx(front[0].x)},${sy(front[0].y)}`;
      for (let i = 1; i < front.length; i++) {
        d += ` L${sx(front[i].x)},${sy(front[i - 1].y)} L${sx(front[i].x)},${sy(front[i].y)}`;
      }
      d += ` L${W - pad.r},${sy(front[front.length - 1].y)}`;
      el("path", { class: "front-line", d }, svg);

      // Points (dominated first so front points sit on top)
      const dots = new Map();
      [...plans].sort((a, b) => a.front - b.front).forEach((p) => {
        dots.set(p, el("circle", { class: `pt ${p.front ? "pt-front" : "pt-dominated"}`, cx: sx(p.x), cy: sy(p.y), r: 5 }, svg));
      });

      // Larger invisible hit areas make the dots easy to point at, including on touch screens
      plans.forEach((p) => {
        const hit = el("circle", { class: "hit", cx: sx(p.x), cy: sy(p.y), r: 11 }, svg);
        hit.addEventListener("pointerenter", () => focusPlan(p));
        hit.addEventListener("click", () => focusPlan(p));
      });
      svg.onpointerleave = reset;

      function focusPlan(p) {
        dots.forEach((dot, q) => {
          dot.classList.toggle("is-active", q === p);
          dot.classList.toggle("is-dominator", p.dominators.includes(q));
        });
        region.setAttribute("y", sy(p.y));
        region.setAttribute("width", sx(p.x) - pad.l);
        region.setAttribute("height", sy(0) - sy(p.y));
        region.setAttribute("visibility", "visible");

        const n = p.dominators.length;
        readout.textContent = p.front
          ? `Plan ${p.id} is on the Pareto front. Nothing in the shaded corner beats it on both objectives.`
          : `Plan ${p.id} is beaten on both objectives by ${n} ${n === 1 ? "plan" : "plans"} (outlined) in the shaded corner.`;
      }

      function reset() {
        dots.forEach((dot) => dot.classList.remove("is-active", "is-dominator"));
        region.setAttribute("visibility", "hidden");
        readout.textContent = defaultText;
      }
    }

    function resample() {
      plans = samplePlans();
      draw();
    }

    paretoFigure.querySelector("[data-resample]").addEventListener("click", resample);
    resample();
  }

  /* ======================================================================
     2. RRT route planner
     ====================================================================== */
  const rrtFigure = document.querySelector("[data-rrt]");
  if (rrtFigure) {
    const svg = rrtFigure.querySelector("svg");
    const readout = rrtFigure.querySelector(".demo-readout");
    const button = rrtFigure.querySelector("[data-replan]");
    const start = { x: 34, y: 262 };
    const goal = { x: 366, y: 38 };
    const STEP = 16;
    const CLEARANCE = 5;
    let animationId = 0;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function randomObstacles() {
      const obstacles = [];
      let attempts = 0;
      while (obstacles.length < 8 && attempts++ < 400) {
        const r = 16 + Math.random() * 24;
        const o = { x: 40 + Math.random() * (W - 80), y: 30 + Math.random() * (H - 60), r };
        if (dist(o, start) < r + 30 || dist(o, goal) < r + 30) continue;
        if (obstacles.some((p) => dist(o, p) < o.r + p.r + 14)) continue;
        obstacles.push(o);
      }
      return obstacles;
    }

    // Distance from point c to segment ab
    function segmentDistance(a, b, c) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2));
      return Math.hypot(a.x + t * dx - c.x, a.y + t * dy - c.y);
    }
    const segmentIsFree = (a, b, obstacles) => obstacles.every((o) => segmentDistance(a, b, o) > o.r + CLEARANCE);

    function planRoute(obstacles) {
      const nodes = [{ x: start.x, y: start.y, parent: -1 }];
      for (let i = 0; i < 4000; i++) {
        const target = Math.random() < 0.08 ? goal : { x: Math.random() * W, y: Math.random() * H };
        let nearest = nodes[0], best = Infinity;
        for (const n of nodes) {
          const d = dist(n, target);
          if (d < best) { best = d; nearest = n; }
        }
        if (best < 1) continue;
        const k = Math.min(STEP, best) / best;
        const next = { x: nearest.x + (target.x - nearest.x) * k, y: nearest.y + (target.y - nearest.y) * k, parent: nodes.indexOf(nearest) };
        if (next.x < 4 || next.x > W - 4 || next.y < 4 || next.y > H - 4) continue;
        if (!segmentIsFree(nearest, next, obstacles)) continue;
        nodes.push(next);

        if (dist(next, goal) < STEP * 1.5 && segmentIsFree(next, goal, obstacles)) {
          nodes.push({ x: goal.x, y: goal.y, parent: nodes.length - 1 });
          const raw = [];
          for (let n = nodes[nodes.length - 1]; n; n = n.parent >= 0 ? nodes[n.parent] : null) raw.unshift(n);
          return { nodes, route: shortcut(raw, obstacles) };
        }
      }
      return null;
    }

    // Standard post-processing: skip waypoints whenever a straight line is clear
    function shortcut(path, obstacles) {
      const out = [path[0]];
      let i = 0;
      while (i < path.length - 1) {
        let j = path.length - 1;
        while (j > i + 1 && !segmentIsFree(path[i], path[j], obstacles)) j--;
        out.push(path[j]);
        i = j;
      }
      return out;
    }

    function draw(animate) {
      cancelAnimationFrame(animationId);
      let obstacles, result;
      for (let tries = 0; tries < 8 && !result; tries++) {
        obstacles = randomObstacles();
        result = planRoute(obstacles);
      }
      if (!result) {
        readout.textContent = "The planner couldn't find a route this time. Try again.";
        return;
      }

      clearSvg(svg);
      obstacles.forEach((o) => el("circle", { class: "obstacle", cx: o.x, cy: o.y, r: o.r }, svg));

      const treeGroup = el("g", {}, svg);
      const edges = result.nodes.slice(1).map((n) => {
        const p = result.nodes[n.parent];
        return el("line", { class: "tree-edge", x1: p.x, y1: p.y, x2: n.x, y2: n.y }, treeGroup);
      });

      const routeD = result.route.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      const route = el("path", { class: "route", d: routeD }, svg);

      el("circle", { class: "endpoint", cx: start.x, cy: start.y, r: 5 }, svg);
      el("rect", { class: "endpoint", x: goal.x - 5, y: goal.y - 5, width: 10, height: 10 }, svg);
      const sl = el("text", { class: "endpoint-label", x: start.x + 10, y: start.y + 16 }, svg); sl.textContent = "Start";
      const gl = el("text", { class: "endpoint-label", x: goal.x - 40, y: goal.y - 12 }, svg); gl.textContent = "Goal";

      const vessel = el("path", { class: "vessel", d: "M7,0 L-5,-4.5 L-3,0 L-5,4.5 Z", visibility: "hidden" }, svg);

      const explored = result.nodes.length - 1;
      const done = () => {
        readout.textContent = `The planner explored ${explored} branches before finding this route.`;
      };

      if (!animate || reducedMotion.matches) { done(); return; }

      // Animate: grow the tree, draw the route, then sail the vessel along it
      readout.textContent = "Exploring…";
      edges.forEach((e) => e.setAttribute("visibility", "hidden"));
      const routeLength = route.getTotalLength();
      route.style.strokeDasharray = routeLength;
      route.style.strokeDashoffset = routeLength;

      const growMs = 1100, drawMs = 600, sailMs = 1800;
      const t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);

      const frame = (now) => {
        const t = now - t0;
        const shown = Math.floor(Math.min(1, t / growMs) * edges.length);
        for (let i = 0; i < shown; i++) edges[i].removeAttribute("visibility");

        if (t > growMs) {
          const k = Math.min(1, (t - growMs) / drawMs);
          route.style.strokeDashoffset = routeLength * (1 - ease(k));
        }
        if (t > growMs + drawMs) {
          const k = ease(Math.min(1, (t - growMs - drawMs) / sailMs));
          const p = route.getPointAtLength(k * routeLength);
          const q = route.getPointAtLength(Math.min(routeLength, k * routeLength + 1));
          const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
          vessel.setAttribute("transform", `translate(${p.x},${p.y}) rotate(${angle})`);
          vessel.setAttribute("visibility", "visible");
        }
        if (t < growMs + drawMs + sailMs) animationId = requestAnimationFrame(frame);
        else { route.style.strokeDasharray = ""; route.style.strokeDashoffset = ""; done(); }
      };
      animationId = requestAnimationFrame(frame);
    }

    button.addEventListener("click", () => draw(true));
    draw(false);
  }
})();
