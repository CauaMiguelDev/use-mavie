"use client";

// Peças visuais compartilhadas pelas seções do painel.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { ImagePlus, Loader2, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const ease = [0.16, 1, 0.3, 1] as const;
export const inputCls =
  "h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted-foreground focus:border-rose focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--rose)_18%,transparent)] aria-[invalid=true]:border-[#a1262b]";
export const compactBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" });
export const dateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function PageHeader({ title, accent, description, actions }: { title: string; accent?: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
          {title} {accent && <span className="text-grad italic">{accent}</span>}
        </h1>
        {description && <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 0.9, ease, onUpdate: (v) => (el.textContent = format(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduce]);
  return <span ref={ref}>{format(0)}</span>;
}

const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
export function Stat({ icon: Icon, label, value, format = int, sub, tone = "rose", i = 0 }: {
  icon: LucideIcon; label: string; value: number; format?: (v: number) => string; sub?: string; tone?: "rose" | "amber" | "green"; i?: number;
}) {
  const reduce = useReducedMotion();
  const tones = {
    rose: "bg-grad text-white",
    amber: "bg-[#fdecd2] text-[#8a5200] dark:bg-[#3b2a12] dark:text-[#f5c26b]",
    green: "bg-[#dff3e6] text-[#1d6b3c] dark:bg-[#12301e] dark:text-[#8fd8aa]",
  };
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.05 + i * 0.05, ease }}
      className="box box-hover p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
          <Icon className="size-[18px]" strokeWidth={1.5} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
        <CountUp value={value} format={format} />
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`box p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ChartTip({ active, payload, label, format }: { active?: boolean; payload?: { value: number }[]; label?: string; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-2xl px-3.5 py-2.5 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{format(payload[0].value)}</p>
    </div>
  );
}

type Tone = "green" | "amber" | "red" | "rose" | "neutral" | "blue";
const badgeTones: Record<Tone, string> = {
  green: "bg-[#dff3e6] text-[#1d6b3c] dark:bg-[#12301e] dark:text-[#8fd8aa]",
  amber: "bg-[#fdecd2] text-[#8a5200] dark:bg-[#3b2a12] dark:text-[#f5c26b]",
  red: "bg-[#fde2e2] text-[#a1262b] dark:bg-[#3d1618] dark:text-[#f3a5a8]",
  rose: "bg-rose-soft text-rose",
  blue: "bg-[#e0ecfb] text-[#1f4f8a] dark:bg-[#15263d] dark:text-[#9cc3f2]",
  neutral: "bg-muted text-muted-foreground",
};
export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${badgeTones[tone]}`}>
      {Icon && <Icon className="size-3.5" strokeWidth={2} />}
      {children}
    </span>
  );
}

export function Field({ label, htmlFor, help, error, children }: { label: string; htmlFor: string; help?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="text-xs text-[#a1262b] dark:text-[#f3a5a8]">{error}</p> : help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="bg-grad grid size-14 place-items-center rounded-3xl text-white"><Icon className="size-6" strokeWidth={1.4} /></span>
      <p className="mt-4 font-display text-2xl">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Painel lateral (formulários). Radix cuida de foco, Esc e leitores de tela.
export function Drawer({ open, onOpenChange, title, description, children, footer }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden border-l-0 p-0 sm:max-w-lg sm:rounded-l-[2rem]">
        <SheetHeader className="bg-grad-soft px-6 py-5 text-left">
          <SheetTitle className="font-display text-3xl font-medium">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="border-t border-border px-6 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

// Reduz a foto no navegador (lado maior 1200px, JPEG) para caber no painel e carregar rápido na loja.
async function compress(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ImageDrop({ value, onChange, error }: { value: string; onChange: (dataUrl: string) => void; error?: string }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function take(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)) return toast.error("Use uma foto JPG, PNG ou WEBP.");
    if (file.size > 20 * 1024 * 1024) return toast.error("A foto passa de 20 MB. Use uma menor.");
    setBusy(true);
    try {
      onChange(await compress(file));
    } catch {
      toast.error("Não consegui ler essa foto. Tente outra.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={value ? "Trocar foto do produto" : "Adicionar foto do produto"}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        className={`group relative grid aspect-[4/5] w-full cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed transition-[border-color,background-color,transform] duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose/30 ${
          over ? "scale-[0.99] border-rose bg-rose-soft" : error ? "border-[#a1262b]" : "border-border hover:border-rose/60 hover:bg-muted/50"
        }`}
      >
        {value ? (
          <>
            <img src={value} alt="Prévia da foto do produto" className="absolute inset-0 size-full object-cover" />
            <span className="glass absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              Arraste outra ou clique para trocar
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center px-6 text-center">
            <span className="bg-grad grid size-14 place-items-center rounded-2xl text-white">
              {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" strokeWidth={1.4} />}
            </span>
            <p className="mt-4 text-sm font-medium">Arraste a foto aqui</p>
            <p className="mt-1 text-xs text-muted-foreground">ou clique para escolher. JPG, PNG ou WEBP.</p>
          </div>
        )}
        {busy && value && <div className="absolute inset-0 grid place-items-center bg-background/60"><Loader2 className="size-6 animate-spin text-rose" /></div>}
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose">
          <X className="size-3.5" /> Remover foto
        </button>
      )}
      {error && <p className="mt-2 text-xs text-[#a1262b] dark:text-[#f3a5a8]">{error}</p>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

// Fotos extras do produto: arraste várias de uma vez (até 6), remova individualmente.
export function GalleryDrop({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const MAX = 6;

  async function take(files: FileList | null) {
    const list = [...(files ?? [])].filter((f) => /^image\//.test(f.type)).slice(0, MAX - value.length);
    if (!list.length) return;
    setBusy(true);
    try {
      const out = [];
      for (const f of list) {
        if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} passa de 20 MB.`); continue; }
        out.push(await compress(f));
      }
      onChange([...value, ...out]);
    } catch {
      toast.error("Não consegui ler uma das fotos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {value.map((src, i) => (
        <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted">
          <img src={src} alt={`Foto extra ${i + 1}`} className="size-full object-cover" />
          <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={`Remover foto extra ${i + 1}`} className="glass absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {value.length < MAX && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
          aria-label="Adicionar fotos extras"
          className={`grid aspect-[3/4] place-items-center rounded-2xl border-2 border-dashed text-center text-xs text-muted-foreground transition-colors duration-300 ${over ? "border-rose bg-rose-soft" : "border-border hover:border-rose/60"}`}
        >
          {busy ? <Loader2 className="size-5 animate-spin text-rose" /> : <span className="px-2"><ImagePlus className="mx-auto mb-1 size-5" strokeWidth={1.4} />Arraste ou clique</span>}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
