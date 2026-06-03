// === PrimePath Travel — shared UI components ===
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function Icon({ name, size = 16, className = "", color = "currentColor", strokeWidth = 1.75 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.lucide) return;
    const map = window.lucide;
    const svgFn = map.icons && map.icons[name];
    const factory = svgFn || (map[name]);
    ref.current.innerHTML = "";
    if (factory && typeof factory === "function") {
      const node = factory();
      if (node instanceof SVGElement) {
        node.setAttribute("width", size);
        node.setAttribute("height", size);
        node.setAttribute("stroke-width", strokeWidth);
        node.style.color = color;
        ref.current.appendChild(node);
        return;
      }
    }
    if (window.lucide.createIcons) {
      const i = document.createElement("i");
      i.setAttribute("data-lucide", name);
      i.setAttribute("width", size);
      i.setAttribute("height", size);
      i.setAttribute("stroke-width", strokeWidth);
      i.style.color = color;
      ref.current.appendChild(i);
      window.lucide.createIcons({ attrs: { width: size, height: size, "stroke-width": strokeWidth }, nameAttr: "data-lucide" });
    }
  }, [name, size, color, strokeWidth]);
  return <span ref={ref} className={"inline-flex items-center justify-center " + className} style={{ width: size, height: size }} />;
}

function StatusBadge({ status }) {
  const cls = window.statusBadgeClass(status);
  const dot = { warning:"#E9730C", success:"#107E3E", error:"#BB0000" }[cls] || "#6A6D70";
  return (
    <span className={"pp-badge " + cls}>
      <span className="inline-block rounded-full" style={{ width:6, height:6, background:dot }} />
      {status}
    </span>
  );
}

function Avatar({ name, size = 36, traveling = false }) {
  const initial = (name || "?")[0].toUpperCase();
  const bg = window.avatarColor(name);
  return (
    <div className="relative inline-flex" style={{ width:size, height:size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-semibold select-none"
        style={{ width:size, height:size, background:bg, fontSize: size*0.42 }}
      >{initial}</div>
      {traveling && (
        <span className="absolute right-0 bottom-0 rounded-full border-2 border-white"
              style={{ width:size*0.28, height:size*0.28, background:"#107E3E" }} />
      )}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, className = "", icon = "search" }) {
  return (
    <div className={"relative " + className}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6A6D70]"><Icon name={icon} size={14} /></span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pp-input pl-7 pr-2 w-full"
        style={{ paddingLeft: 28, height: 32 }}
      />
    </div>
  );
}

function Select({ value, onChange, options, className = "" }) {
  return (
    <div className={"relative " + className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pp-input appearance-none pr-7 w-full"
        style={{ height: 32 }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#6A6D70]">
        <Icon name="chevron-down" size={14} />
      </span>
    </div>
  );
}

function Button({ children, variant = "secondary", size = "md", className = "", ...rest }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded transition-colors";
  const sizes = { sm: "text-xs px-2.5 h-7", md: "text-[13px] px-3 h-8", lg: "text-sm px-4 h-9" };
  let variantCls = "";
  if (variant === "primary") variantCls = "pp-btn-primary";
  else if (variant === "ghost") variantCls = "pp-btn-ghost";
  else if (variant === "danger") variantCls = "text-white";
  else variantCls = "bg-white border border-[#E5E5E5] text-[#0070F2] hover:bg-[#EBF2FF]";
  const danger = variant === "danger" ? { background:"#BB0000" } : {};
  return (
    <button {...rest}
      className={base + " " + sizes[size] + " " + variantCls + " " + className}
      style={{ ...danger, ...(rest.style||{}) }}
    >{children}</button>
  );
}

function Toast({ open, message }) {
  if (!open) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 pp-toast-enter">
      <div className="pp-card flex items-center gap-2 px-4 py-3 text-sm" style={{ borderLeft:"4px solid #107E3E" }}>
        <Icon name="check-circle-2" size={18} color="#107E3E" />
        <span className="text-[#32363A]">{message}</span>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, children, width = 460 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 bg-white pp-drawer-enter pp-scroll overflow-y-auto" style={{ width, boxShadow:"-4px 0 16px rgba(0,0,0,.12)" }}>
        {children}
      </div>
    </div>
  );
}

function KPI({ icon, label, value, sublabel, accent = "#0070F2" }) {
  return (
    <div className="pp-card p-4 flex items-start gap-3 flex-1 min-w-0">
      <div className="rounded-md flex items-center justify-center flex-shrink-0"
           style={{ width:40, height:40, background:accent + "1A" }}>
        <Icon name={icon} size={20} color={accent} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="pp-label">{label}</div>
        <div className="text-[26px] font-semibold leading-tight text-[#32363A] mt-1 truncate">{value}</div>
        {sublabel && <div className="text-xs text-[#6A6D70] mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

function HBar({ label, value, max, sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="text-[13px] text-[#32363A] font-medium w-32 truncate">{label}</div>
      <div className="flex-1 bg-[#F0F2F5] rounded h-5 overflow-hidden relative">
        <div className="h-full rounded transition-all duration-500"
             style={{ width: pct + "%", background:"linear-gradient(90deg,#0070F2 0%,#3A8DFF 100%)" }} />
      </div>
      <div className="text-xs text-[#6A6D70] w-20 text-right tabular-nums">{sub != null ? sub : (pct + "%")}</div>
    </div>
  );
}

function Table({ children, className = "" }) {
  return <div className={"pp-card overflow-hidden " + className}>
    <div className="pp-scroll overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  </div>;
}
function THead({ children }) { return <thead><tr className="pp-th">{children}</tr></thead>; }
function TH({ children, className = "", style }) {
  return <th className={"text-left font-semibold px-4 py-2.5 border-b border-[#E5E5E5] whitespace-nowrap " + className} style={style}>{children}</th>;
}
function TD({ children, className = "", style }) {
  return <td className={"px-4 py-2.5 border-b border-[#E5E5E5] align-middle " + className} style={style}>{children}</td>;
}
function TR({ children, onClick, className = "", index = 0 }) {
  const bg = index % 2 === 1 ? "#FAFAFA" : "#FFFFFF";
  return <tr onClick={onClick} className={"pp-tr-hover " + (onClick ? "cursor-pointer " : "") + className} style={{ background: bg }}>{children}</tr>;
}

function Spinner({ label = "Gegevens laden..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#6A6D70]">
      <div className="pp-spinner" />
      <div className="text-sm">{label}</div>
    </div>
  );
}

function FallbackBanner({ visible }) {
  if (!visible) return null;
  return (
    <div className="px-4 py-2 text-[12px] flex items-center gap-2"
         style={{ background:"#FFF3E0", color:"#E9730C", borderBottom:"1px solid #F4D9B5" }}>
      <Icon name="info" size={14} />
      <span>TripPin niet bereikbaar — <strong>demo data actief</strong></span>
    </div>
  );
}

Object.assign(window, {
  Icon, StatusBadge, Avatar, SearchInput, Select, Button,
  Toast, Drawer, KPI, HBar,
  Table, THead, TH, TD, TR, Spinner, FallbackBanner,
});
