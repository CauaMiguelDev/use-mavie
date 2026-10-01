"use client";

// Efeitos reutilizáveis. Tudo via motion values (sem re-render) e desligado com prefers-reduced-motion.
import { useEffect, useRef, type ReactNode } from "react";
import { type MotionValue, motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;
const soft = { stiffness: 120, damping: 18, mass: 0.6 };

// Puxa suavemente em direção ao cursor e volta com mola.
export function Magnetic({ children, strength = 0.22, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, soft);
  const y = useSpring(0, soft);
  return (
    <motion.span
      ref={ref}
      style={{ x, y }}
      className={`inline-block ${className}`}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.span>
  );
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div style={{ scaleX }} className="bg-grad fixed inset-x-0 top-0 z-50 h-[3px] origin-left" />;
}

// Título que sobe palavra por palavra ao entrar na tela; trecho "accent" em degradê.
export function RevealText({ text, className = "", accent, as = "h2" }: { text: string; className?: string; accent?: string; as?: "h1" | "h2" }) {
  const reduce = useReducedMotion();
  const Tag = as === "h1" ? motion.h1 : motion.h2;
  const parts = [...text.split(" ").map((w) => ({ w, a: false })), ...(accent ? accent.split(" ").map((w) => ({ w, a: true })) : [])];
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.6 }} transition={{ staggerChildren: 0.06 }}>
      {parts.map(({ w, a }, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span
            className={`inline-block pr-[0.22em] ${a ? "text-grad italic" : ""}`}
            variants={{
              hidden: reduce ? { opacity: 0 } : { y: "105%", opacity: 0, filter: "blur(6px)" },
              show: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 1, ease } },
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

// Inclinação 3D leve seguindo o cursor, com reflexo de luz.
export function Tilt({ children, className = "", max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), soft);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), soft);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgb(255 255 255 / 0.22), transparent 55%)`;
  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      className={`group/tilt relative ${className}`}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { px.set(0.5); py.set(0.5); }}
    >
      {children}
      {!reduce && (
        <motion.div style={{ background: glare }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100" />
      )}
    </motion.div>
  );
}

// ---------- Fundo personalizado: seda líquida em WebGL ----------
const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FRAG = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c1,c2,c3,c4;
void main(){
  vec2 uv=gl_FragCoord.xy/r;vec2 p=uv;p.x*=r.x/r.y;float s=t*.05;
  vec2 q=vec2(sin(p.x*1.7+s*3.)+sin(p.y*2.2-s*2.),cos(p.y*1.5+s*2.4)+sin(p.x*2.6+s));
  float f=.5+.5*sin(p.x*1.3+q.x*1.5+s*4.)*cos(p.y*1.6+q.y*1.3-s*3.);
  float g=.5+.5*sin((p.x+p.y)*2.1+q.y+s*5.);
  vec3 col=mix(c1,c2,smoothstep(0.,1.,f));
  col=mix(col,c3,smoothstep(.35,1.,g)*.65);
  col=mix(col,c4,smoothstep(.55,1.,f*g)*.55);
  float d=distance(uv,m);col=mix(col,c4,.35*exp(-d*d*9.));
  gl_FragColor=vec4(col,1.);
}`;

function hexToRgb(hex: string) {
  const n = parseInt(hex.trim().replace("#", ""), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function SilkBackground({ mouse }: { mouse: MotionValue<{ x: number; y: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return; // sem WebGL: fica o degradê CSS por trás
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);

    const setColors = () => {
      const cs = getComputedStyle(document.documentElement);
      ["c1", "c2", "c3", "c4"].forEach((c, i) => gl.uniform3fv(u(c), hexToRgb(cs.getPropertyValue(`--sh${i + 1}`) || "#ffffff")));
    };
    setColors();
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", setColors);

    // ponytail: resolução limitada a 1x DPR; o degradê é suave, não precisa de mais.
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let visible = true;
    const sm = { x: 0.7, y: 0.5 };
    const start = performance.now();
    const draw = () => {
      const target = mouse.get();
      sm.x += (target.x - sm.x) * 0.04;
      sm.y += (target.y - sm.y) * 0.04;
      gl.uniform2f(u("r"), canvas.width, canvas.height);
      gl.uniform1f(u("t"), reduce ? 20 : (performance.now() - start) / 1000);
      gl.uniform2f(u("m"), sm.x, 1 - sm.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    draw();
    // Pausa quando sai da tela.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) draw();
    });
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      scheme.removeEventListener("change", setColors);
    };
  }, [mouse, reduce]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grad-soft absolute inset-0" />
      <canvas ref={ref} className="absolute inset-0 size-full" />
      <div className="dot-grid absolute inset-0" />
      <div className="outline-text absolute -bottom-[0.2em] left-0 whitespace-nowrap font-display text-[22vw] font-semibold leading-none">
        MAVIÊ MAVIÊ
      </div>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

export function Sparkles() {
  const reduce = useReducedMotion();
  const pts = [
    { l: "6%", t: "60%", s: 14, d: 0 },
    { l: "90%", t: "10%", s: 18, d: 0.8 },
    { l: "95%", t: "68%", s: 12, d: 1.6 },
    { l: "32%", t: "94%", s: 16, d: 2.2 },
  ];
  return (
    <>
      {pts.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="text-grad pointer-events-none absolute z-20"
          style={{ left: p.l, top: p.t, fontSize: p.s }}
          animate={reduce ? undefined : { y: [0, -12, 0], opacity: [0.35, 1, 0.35], rotate: [0, 90, 180] }}
          transition={{ duration: 5, delay: p.d, repeat: Infinity, ease: "easeInOut" }}
        >
          ✦
        </motion.span>
      ))}
    </>
  );
}
