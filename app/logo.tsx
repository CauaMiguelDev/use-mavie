// Logo original da USE MAVIÊ (public/logo.png, recortado do arquivo da marca).
// Usado como máscara: a cor vem do texto (currentColor) ou de um fundo, ex. className="bg-grad".
import { BASE } from "./products";

const RATIO = 1049 / 198; // largura / altura do logo.png

export function Logo({ className = "h-5", fill = "bg-current" }: { className?: string; fill?: string }) {
  const mask = `url(${BASE}/logo.png)`;
  return (
    <span
      role="img"
      aria-label="USE MAVIÊ"
      className={`inline-block shrink-0 ${fill} ${className}`}
      style={{
        aspectRatio: RATIO,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
