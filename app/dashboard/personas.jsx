// === Personas ===
const PERSONAS = {
  coordinator: {
    id: "coordinator",
    name: "Sarah De Backer",
    role: "Travel Coördinator",
    initials: "SD",
    color: "#0070F2",
    description: "Dagelijks beheer van alle zakelijke reizen",
    question: "Wie reist er wanneer, en via welke route?",
    frequency: "Dagelijks",
    nav: ["dashboard","people","trips","airlines","airports"],
    defaultPage: "dashboard",
    roleTag: "TravelAdmin",
    welcome: { tone:"info", text:"👋 Welkom Sarah! U heeft volledige beheerrechten. U kunt reizen bewerken, goedkeuren en notities toevoegen." },
    edit: { projectCode:true, approvalStatus:true, internalNote:true },
    editBadge: { label:"Bewerkbaar", icon:"pencil", cls:"info" },
  },
  teamlead: {
    id: "teamlead",
    name: "Marc Janssen",
    role: "Team Lead",
    initials: "MJ",
    color: "#107E3E",
    description: "Planning en aansturing van consultantteam",
    question: "Wie van mijn team is beschikbaar deze week?",
    frequency: "Wekelijks",
    nav: ["dashboard","people","trips"],
    defaultPage: "people",
    peopleLabel: "Mijn Team",
    teamScoped: true,
    roleTag: "TeamLead",
    welcome: { tone:"success", text:"👋 Welkom Marc! U ziet enkel uw eigen teamleden. U kunt de goedkeuringsstatus van hun reizen aanpassen." },
    edit: { projectCode:false, approvalStatus:true, internalNote:false },
    editBadge: { label:"Beperkt bewerkbaar", icon:"zap", cls:"warning" },
    note: "Als Team Lead kunt u enkel de goedkeuringsstatus aanpassen — en enkel voor reizen van uw eigen teamleden.",
  },
  hr: {
    id: "hr",
    name: "Lisa Peeters",
    role: "HR / Administratie",
    initials: "LP",
    color: "#6800B4",
    description: "Rapportage en leveranciersbeheer",
    question: "Welke airlines gebruiken we het vaakst?",
    frequency: "Maandelijks",
    nav: ["dashboard","trips","airlines","people"],
    defaultPage: "dashboard",
    peopleReadOnly: true,
    roleTag: "TravelViewer",
    welcome: { tone:"purple", text:"👋 Welkom Lisa! U heeft alleen-lezen toegang tot rapportage, airline-statistieken en het medewerkersoverzicht." },
    edit: { projectCode:false, approvalStatus:false, internalNote:false },
    editBadge: { label:"Alleen lezen", icon:"eye", cls:"neutral" },
    note: "U heeft alleen leesrechten als HR / Administratie.",
  },
};
const PERSONA_LIST = [PERSONAS.coordinator, PERSONAS.teamlead, PERSONAS.hr];

function PersonaChip({ persona, open, onClick }) {
  return (
    <button onClick={onClick}
            className="flex items-center gap-2 rounded h-8 px-2 hover:bg-white/10 transition-colors"
            style={{ border:"1px solid rgba(255,255,255,0.18)" }}>
      <span className="rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
            style={{ width:24, height:24, background: persona.color }}>{persona.initials}</span>
      <span className="text-[13px] font-medium leading-tight text-left hidden md:block">
        <span className="block text-white">{persona.name}</span>
        <span className="block text-[10px] opacity-70">{persona.role}</span>
      </span>
      <span className={"transition-transform " + (open ? "rotate-180" : "")}>
        <window.Icon name="chevron-down" size={14} color="#fff" />
      </span>
    </button>
  );
}

function PersonaDropdown({ active, onPick, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-1 pp-card p-3 z-30" style={{ width:320, color:"#32363A" }}>
      <div className="text-[14px] font-semibold mb-0.5">Wissel van gebruiker</div>
      <div className="text-[11px] text-[#6A6D70] mb-3">Kies een persona om de app vanuit die rol te bekijken</div>
      <div className="space-y-1">
        {PERSONA_LIST.map(p => {
          const isActive = p.id === active.id;
          return (
            <button key={p.id} onClick={() => { onPick(p.id); onClose(); }}
                    className={"w-full flex items-start gap-3 rounded p-2.5 text-left transition-colors " + (isActive ? "bg-[#EBF2FF]" : "hover:bg-[#F0F7FF]")}>
              <span className="rounded-full flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0"
                    style={{ width:36, height:36, background: p.color }}>{p.initials}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-[#32363A] truncate">{p.name}</div>
                  {isActive && <window.Icon name="check" size={14} color="#107E3E" />}
                </div>
                <div className="text-[11px] text-[#6A6D70]">{p.role}</div>
                <div className="text-[11px] italic text-[#6A6D70] mt-1 line-clamp-2">Kernvraag: {p.question}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="pp-badge neutral" style={{ fontSize:10 }}>{p.frequency}</span>
                  {p.roleTag && <span className="pp-badge info" style={{ fontSize:10 }}>{p.roleTag}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PersonaWelcomeBanner({ persona, onDismiss }) {
  if (!persona) return null;
  const tones = {
    info:    { bg:"#E8F2FF", border:"#BCD7FA", text:"#0058C4" },
    success: { bg:"#F1F8E9", border:"#C7E1B5", text:"#107E3E" },
    purple:  { bg:"#F3EAFB", border:"#D6BFEE", text:"#6800B4" },
  };
  const t = tones[persona.welcome.tone] || tones.info;
  return (
    <div className="px-4 py-2 text-[13px] flex items-center gap-3 pp-fade-enter"
         style={{ background:t.bg, borderBottom:`1px solid ${t.border}`, color:t.text }}>
      <span className="flex-1">{persona.welcome.text}</span>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100"><window.Icon name="x" size={14} /></button>
    </div>
  );
}

Object.assign(window, { PERSONAS, PERSONA_LIST, PersonaChip, PersonaDropdown, PersonaWelcomeBanner });
