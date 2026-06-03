// === PrimePath Travel — main app shell, sidebar, header, routing ===
const {
  Icon, FallbackBanner, Toast, Drawer, Spinner, Avatar, SearchInput,
  DashboardPage, PeoplePage, PersonDrawer,
  TripsListPage, TripDetailPage,
  AirlinesPage, AirportsPage,
  loadAllData, initialExtensions, formatDateNL, formatEUR, getTeamUsernames,
  PERSONAS, PERSONA_LIST, PersonaChip, PersonaDropdown, PersonaWelcomeBanner,
} = window;

const NAV_ITEMS = [
  { id:"dashboard", label:"Dashboard",   icon:"layout-dashboard" },
  { id:"people",    label:"Medewerkers", icon:"users" },
  { id:"trips",     label:"Reizen",      icon:"plane" },
  { id:"airlines",  label:"Airlines",    icon:"badge-percent" },
  { id:"airports",  label:"Luchthavens", icon:"building-2" },
];

function Sidebar({ active, onNavigate, persona }) {
  const allowed = persona?.nav || NAV_ITEMS.map(n => n.id);
  return (
    <aside className="flex flex-col flex-shrink-0" style={{ width:240, background:"#F7F7F7", borderRight:"1px solid #E5E5E5" }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background:"#354A5E", color:"#fff", height:48 }}>
        <Icon name="plane" size={18} color="#fff" strokeWidth={2.2} />
        <div className="font-semibold text-[15px] tracking-tight">PrimePath</div>
        <span className="text-[11px] opacity-70 ml-1">Travel</span>
      </div>
      <nav className="flex-1 py-2">
        {NAV_ITEMS.filter(item => allowed.includes(item.id)).map(item => {
          const label = (item.id === "people" && persona?.peopleLabel) ? persona.peopleLabel : item.label;
          return (
          <button key={item.id}
                  onClick={()=>onNavigate(item.id)}
                  className={"pp-nav-item w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#32363A] " + (active===item.id ? "active" : "")}>
            <span className="pp-nav-icon"><Icon name={item.icon} size={16} /></span>
            {label}
          </button>
        );})}
      </nav>
      <div className="px-4 py-3 text-[11px] text-[#6A6D70] border-t border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[12px] font-semibold" style={{ background: persona?.color || "#0070F2" }}>{persona?.initials || "?"}</div>
          <div className="leading-tight">
            <div className="text-[#32363A] font-semibold">{persona?.name || ""}</div>
            <div>{persona?.role} · v1.0</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Header({ data, extensions, onJump, persona, onPickPersona }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const wrapRef = useRef(null);
  const personaWrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      if (personaWrapRef.current && !personaWrapRef.current.contains(e.target)) setPersonaOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    const people = data.people.filter(p => (p.FirstName+" "+p.LastName).toLowerCase().includes(term)).slice(0,4);
    const trips = data.trips.filter(t => t.Name.toLowerCase().includes(term)).slice(0,4);
    const airlines = data.airlines.filter(a => a.Name.toLowerCase().includes(term) || (a.AirlineCode||"").toLowerCase().includes(term)).slice(0,3);
    const airports = data.airports.filter(a => (a.Name||"").toLowerCase().includes(term) || (a.City||"").toLowerCase().includes(term) || (a.IataCode||"").toLowerCase().includes(term)).slice(0,4);
    return { people, trips, airlines, airports };
  }, [q, data]);

  const total = results ? results.people.length + results.trips.length + results.airlines.length + results.airports.length : 0;

  return (
    <header style={{ background:"#354A5E", color:"#fff", height:48 }} className="flex items-center px-4 flex-shrink-0">
      <div className="flex-1 flex items-center gap-3">
        <div className="text-[15px] font-semibold">PrimePath Travel</div>
        <div className="text-[12px] opacity-60 hidden lg:block">Exploratory Travel Dashboard</div>
        {data && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2 py-0.5"
                style={{ background: data.usingMock ? "rgba(233,115,12,0.22)" : "rgba(16,126,62,0.28)", color:"#fff" }}
                title={data.usingMock ? "TripPin niet bereikbaar — demo data" : `Live: People=${data.source?.people}, Airlines=${data.source?.airlines}, Airports=${data.source?.airports}`}>
            <span className="inline-block rounded-full" style={{ width:6, height:6, background: data.usingMock ? "#E9730C" : "#36D17A" }} />
            {data.usingMock ? "Demo data" : "TripPin OData V4 · live"}
          </span>
        )}
      </div>
      <div ref={wrapRef} className="relative w-[420px] max-w-[40vw]">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-70"><Icon name="search" size={14} color="#fff" /></span>
        <input
          type="text"
          value={q}
          onFocus={()=>setOpen(true)}
          onChange={(e)=>{ setQ(e.target.value); setOpen(true); }}
          placeholder="Zoek medewerkers, reizen, airlines, luchthavens..."
          className="w-full text-[13px] outline-none rounded"
          style={{ height:32, background:"rgba(255,255,255,0.12)", color:"#fff", paddingLeft:30, paddingRight:10, border:"1px solid rgba(255,255,255,0.18)" }}
        />
        {open && results && total > 0 && (
          <div className="absolute right-0 left-0 mt-1 pp-card p-2 z-30 max-h-[60vh] overflow-y-auto pp-scroll" style={{ color:"#32363A" }}>
            {results.people.length > 0 && <SearchGroup title="Medewerkers" items={results.people.map(p => ({
              icon:"user", label:`${p.FirstName} ${p.LastName}`, sub:p.Emails?.[0],
              onClick: () => { onJump({ type:"person", id:p.UserName }); setOpen(false); setQ(""); }
            }))} />}
            {results.trips.length > 0 && <SearchGroup title="Reizen" items={results.trips.map(t => ({
              icon:"plane", label:t.Name, sub:`${formatDateNL(t.StartsAt)} · ${formatEUR(t.Budget)}`,
              onClick: () => { onJump({ type:"trip", id:t.TripId }); setOpen(false); setQ(""); }
            }))} />}
            {results.airlines.length > 0 && <SearchGroup title="Airlines" items={results.airlines.map(a => ({
              icon:"badge-percent", label:a.Name, sub:a.AirlineCode,
              onClick: () => { onJump({ type:"airline", id:a.AirlineCode }); setOpen(false); setQ(""); }
            }))} />}
            {results.airports.length > 0 && <SearchGroup title="Luchthavens" items={results.airports.map(a => ({
              icon:"building-2", label:`${a.IataCode || ""} · ${a.Name}`, sub:a.City,
              onClick: () => { onJump({ type:"airport" }); setOpen(false); setQ(""); }
            }))} />}
          </div>
        )}
        {open && results && total === 0 && (
          <div className="absolute right-0 left-0 mt-1 pp-card p-4 z-30 text-sm text-[#6A6D70]">
            Geen resultaten voor "{q}".
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4 opacity-90">
        <button className="opacity-80 hover:opacity-100"><Icon name="bell" size={16} color="#fff" /></button>
        <button className="opacity-80 hover:opacity-100"><Icon name="settings" size={16} color="#fff" /></button>
        <button className="opacity-80 hover:opacity-100"><Icon name="help-circle" size={16} color="#fff" /></button>
      </div>
      <div ref={personaWrapRef} className="relative ml-3">
        <PersonaChip persona={persona} open={personaOpen} onClick={() => setPersonaOpen(o => !o)} />
        {personaOpen && <PersonaDropdown active={persona} onPick={onPickPersona} onClose={() => setPersonaOpen(false)} />}
      </div>
    </header>
  );
}

function SearchGroup({ title, items }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="px-2 pt-1 pb-1 pp-label">{title}</div>
      {items.map((it, i) => (
        <button key={i} onClick={it.onClick}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-left hover:bg-[#F0F7FF]">
          <Icon name={it.icon} size={14} color="#6A6D70" />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-medium text-[#32363A] truncate">{it.label}</span>
            {it.sub && <span className="block text-[11px] text-[#6A6D70] truncate">{it.sub}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);
  const [usingMock, setUsingMock] = useState(false);
  const [extensions, setExtensions] = useState([]);
  const [personaId, setPersonaId] = useState("coordinator");
  const persona = PERSONAS[personaId];
  const [active, setActive] = useState(persona.defaultPage);
  const [tripDetailId, setTripDetailId] = useState(null);
  const [drawerPerson, setDrawerPerson] = useState(null);
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [toast, setToast] = useState({ open: false, message: "" });
  const [welcomeFor, setWelcomeFor] = useState(null);

  const team = useMemo(
    () => (persona.teamScoped && data ? getTeamUsernames(data) : null),
    [persona, data]
  );

  useEffect(() => {
    let live = true;
    loadAllData().then(d => {
      if (!live) return;
      setData(d);
      setUsingMock(d.usingMock);
      setExtensions(initialExtensions(d.trips));
    });
    return () => { live = false; };
  }, []);

  const showToast = useCallback((message) => {
    setToast({ open: true, message });
    setTimeout(() => setToast({ open: false, message: "" }), 2500);
  }, []);

  const onPickPersona = (id) => {
    if (id === personaId) return;
    const p = PERSONAS[id];
    setPersonaId(id);
    setActive(p.defaultPage);
    setTripDetailId(null);
    setDrawerPerson(null);
    setAirlineFilter("all");
    setWelcomeFor(p);
    showToast(`Welkom, ${p.name}! U bekijkt de app als ${p.role}.`);
    setTimeout(() => setWelcomeFor(curr => curr === p ? null : curr), 5000);
  };

  const navigate = (id) => {
    if (!persona.nav.includes(id)) return;
    setActive(id);
    setTripDetailId(null);
    if (id !== "trips") setAirlineFilter("all");
  };

  const openTrip = (id) => { setActive("trips"); setTripDetailId(id); setDrawerPerson(null); };
  const openPerson = (u) => {
    if (!persona.nav.includes("people")) return;
    setDrawerPerson(u);
  };
  const onAirlineDrillDown = (code) => {
    if (!persona.nav.includes("trips")) return;
    setAirlineFilter(code); setActive("trips"); setTripDetailId(null);
  };

  const onJump = ({ type, id }) => {
    if (type === "person") {
      if (!persona.nav.includes("people")) { showToast("Geen toegang tot Medewerkers in deze rol."); return; }
      setActive("people"); setDrawerPerson(id); setTripDetailId(null);
    }
    else if (type === "trip") { openTrip(id); }
    else if (type === "airline") {
      if (persona.nav.includes("airlines")) { setActive("airlines"); setTripDetailId(null); }
      else { onAirlineDrillDown(id); }
    }
    else if (type === "airport") {
      if (!persona.nav.includes("airports")) { showToast("Geen toegang tot Luchthavens in deze rol."); return; }
      setActive("airports"); setTripDetailId(null);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background:"#F4F5F7" }}>
      <Sidebar active={active} onNavigate={navigate} persona={persona} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header data={data} extensions={extensions} onJump={onJump} persona={persona} onPickPersona={onPickPersona} />
        <FallbackBanner visible={usingMock} />
        {welcomeFor && <PersonaWelcomeBanner persona={welcomeFor} onDismiss={() => setWelcomeFor(null)} />}
        <main className="flex-1 overflow-y-auto pp-scroll" key={personaId + "-" + active + "-" + (tripDetailId || "list")}>
          {active === "dashboard" && (
            <DashboardPage data={data} extensions={extensions} onNavigate={navigate} onOpenTrip={openTrip} onOpenPerson={openPerson} persona={persona} />
          )}
          {active === "people" && persona.nav.includes("people") && (
            <PeoplePage data={data} extensions={extensions} onOpenPerson={openPerson} onOpenTrip={openTrip} persona={persona} team={team} />
          )}
          {active === "trips" && tripDetailId == null && (
            <TripsListPage data={data} extensions={extensions} onOpenTrip={openTrip} initialAirlineFilter={airlineFilter} persona={persona} team={team} />
          )}
          {active === "trips" && tripDetailId != null && (
            <TripDetailPage tripId={tripDetailId} data={data} extensions={extensions}
                            setExtensions={setExtensions}
                            onBack={() => setTripDetailId(null)}
                            onOpenPerson={openPerson}
                            onOpenAirline={persona.nav.includes("trips") ? onAirlineDrillDown : null}
                            showToast={showToast}
                            persona={persona}
                            team={team} />
          )}
          {active === "airlines" && persona.nav.includes("airlines") && (
            <AirlinesPage data={data} onAirlineDrillDown={onAirlineDrillDown} persona={persona} />
          )}
          {active === "airports" && persona.nav.includes("airports") && (
            <AirportsPage data={data} />
          )}
        </main>
      </div>

      <Drawer open={!!drawerPerson} onClose={() => setDrawerPerson(null)}>
        <PersonDrawer personUser={drawerPerson}
                      data={data}
                      extensions={extensions}
                      onClose={() => setDrawerPerson(null)}
                      onOpenTrip={(id) => { setDrawerPerson(null); openTrip(id); }}
                      persona={persona} />
      </Drawer>

      <Toast open={toast.open} message={toast.message} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
