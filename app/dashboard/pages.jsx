// === PrimePath Travel — pages ===
const {
  Icon, StatusBadge, Avatar, SearchInput, Select, Button,
  Toast, Drawer, KPI, HBar,
  Table, THead, TH, TD, TR, Spinner,
  formatDateNL, formatDateTimeNL, formatEUR, isActiveTrip, isCurrentlyTraveling,
  getTeamUsernames, cityForIata, destinationCities,
} = window;

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function DashboardPage({ data, extensions, onNavigate, onOpenTrip, onOpenPerson, persona }) {
  const { trips, people, airlines, airports } = data;
  const now = new Date();
  const role = persona?.id || "coordinator";

  const activeTrips = useMemo(() => trips.filter(t => isActiveTrip(t, now)), [trips]);
  const peopleOnTrip = useMemo(() => {
    const set = new Set();
    trips.forEach(t => { if (isActiveTrip(t, now)) set.add(t.owner); });
    return set.size;
  }, [trips]);
  const peopleAvailable = people.length - peopleOnTrip;

  // FV-01 + FV-03: gebruik de autoritatieve CAP-tellingen (data.kpis) indien beschikbaar,
  // anders de client-side berekening.
  const kpiActiveTrips  = data.kpis?.activeTrips ?? activeTrips.length;
  const kpiPeopleOnTrip = data.kpis?.onTravel    ?? peopleOnTrip;
  const activeFromCap   = data.kpis?.activeTrips != null;
  const onTravelFromCap = data.kpis?.onTravel    != null;

  const airlineCounts = useMemo(() => {
    const m = {};
    trips.forEach(t => { if (t.Airline) m[t.Airline] = (m[t.Airline] || 0) + 1; });
    return m;
  }, [trips]);
  const topAirline = useMemo(() => {
    let best = null, bestN = 0;
    Object.entries(airlineCounts).forEach(([code, n]) => { if (n > bestN) { best = code; bestN = n; } });
    if (!best) return { name: "—", n: 0 };
    const al = airlines.find(a => a.AirlineCode === best);
    return { name: al ? al.Name : best, n: bestN };
  }, [airlineCounts, airlines]);

  const totalBudget = trips.reduce((s, t) => s + (t.Budget || 0), 0);
  const avgBudget = trips.length ? Math.round(totalBudget / trips.length) : 0;

  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const upcomingAll = useMemo(() => [...trips].filter(t => new Date(t.EndsAt) >= now).sort((a,b)=>new Date(a.StartsAt)-new Date(b.StartsAt)), [trips]);
  const upcomingTrips = role === "teamlead"
    ? upcomingAll.filter(t => new Date(t.StartsAt) <= sevenDays).slice(0, 5)
    : upcomingAll.slice(0, 5);

  const totalAirlineTrips = Object.values(airlineCounts).reduce((s, n) => s + n, 0);
  const airlineMax = Math.max(...Object.values(airlineCounts), 1);

  // ---------- TEAM LEAD dashboard ----------
  if (role === "teamlead") {
    return (
      <div className="pp-fade-enter p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <KPI icon="plane-takeoff" accent="#BB0000"
               label="Medewerkers Op Reis" value={peopleOnTrip}
               sublabel={`van ${people.length} medewerkers`} />
          <KPI icon="user-check" accent="#107E3E"
               label="Beschikbare Medewerkers" value={peopleAvailable}
               sublabel="vandaag beschikbaar" />
        </div>
        <div className="pp-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5]">
            <div className="text-[15px] font-semibold text-[#32363A]">Komende Reizen — komende 7 dagen</div>
            <div className="text-xs text-[#6A6D70]">{upcomingTrips.length} reizen gepland</div>
          </div>
          <Table className="!shadow-none !border-none !rounded-none">
            <THead><TH>Medewerker</TH><TH>Trip</TH><TH>Vertrek</TH><TH>Bestemming</TH><TH>Status</TH></THead>
            <tbody>
              {upcomingTrips.map((t, i) => {
                const person = people.find(p => p.UserName === t.owner);
                const ext = extensions.find(e => e.tripId === t.TripId);
                return (
                  <TR key={t.TripId} index={i} onClick={() => onOpenTrip(t.TripId)}>
                    <TD><div className="flex items-center gap-2"><Avatar name={person?.FirstName} size={26} /><span className="font-medium">{person ? person.FirstName+" "+person.LastName : t.owner}</span></div></TD>
                    <TD className="font-medium">{t.Name}</TD>
                    <TD className="text-[#6A6D70]">{formatDateNL(t.StartsAt)}</TD>
                    <TD><span className="font-mono text-[12px]">{t.From} → <strong>{t.To}</strong></span></TD>
                    <TD><StatusBadge status={ext?.approvalStatus || "In behandeling"} /></TD>
                  </TR>
                );
              })}
              {upcomingTrips.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#6A6D70] text-sm">Geen reizen gepland deze week.</td></tr>}
            </tbody>
          </Table>
        </div>
      </div>
    );
  }

  // ---------- HR dashboard (analytics) ----------
  if (role === "hr") {
    return (
      <div className="pp-fade-enter p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI icon="plane" accent="#0070F2" label="Totaal Reizen" value={trips.length} sublabel="in systeem" />
          <KPI icon="wallet" accent="#107E3E" label="Totaal Budget" value={formatEUR(totalBudget)} sublabel="alle reizen" />
          <KPI icon="trending-up" accent="#6800B4" label="Meest Gebruikte Airline" value={topAirline.name} sublabel={`${topAirline.n} reizen`} />
          <KPI icon="bar-chart-3" accent="#E9730C" label="Gemiddeld Budget" value={formatEUR(avgBudget)} sublabel="per reis" />
        </div>
        <div className="pp-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[15px] font-semibold text-[#32363A]">Airlines Gebruik</div>
              <div className="text-xs text-[#6A6D70]">{totalAirlineTrips} reizen verdeeld over {airlines.length} airlines</div>
            </div>
            <button onClick={() => onNavigate("airlines")} className="text-[13px] font-semibold text-[#0070F2] hover:underline">Naar Airlines →</button>
          </div>
          <div className="space-y-1">
            {airlines.map(a => {
              const n = airlineCounts[a.AirlineCode] || 0;
              const pct = totalAirlineTrips ? Math.round((n/totalAirlineTrips)*100) : 0;
              return <HBar key={a.AirlineCode} label={a.Name} value={n} max={airlineMax} sub={`${n} reizen · ${pct}%`} />;
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------- COORDINATOR (full) ----------
  return (
    <div className="pp-fade-enter p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon="plane-takeoff" accent="#0070F2" label="Actieve Reizen" value={kpiActiveTrips} sublabel={activeFromCap ? "via TravelService" : "nu of binnen 30 dagen"} />
        <KPI icon="users" accent="#107E3E" label="Medewerkers Op Reis" value={kpiPeopleOnTrip} sublabel={onTravelFromCap ? "op reis vandaag · TravelService" : `van ${people.length} medewerkers`} />
        <KPI icon="trending-up" accent="#6800B4" label="Meest Gebruikte Airline" value={topAirline.name} sublabel={`${topAirline.n} reizen`} />
        <KPI icon="building-2" accent="#E9730C" label="Totaal Luchthavens" value={airports.length} sublabel="in systeem" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 pp-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-[#32363A]">Komende Reizen</div>
              <div className="text-xs text-[#6A6D70]">Volgende {upcomingTrips.length} reizen op startdatum</div>
            </div>
            <button onClick={() => onNavigate("trips")}
                    className="text-[13px] font-semibold text-[#0070F2] hover:underline flex items-center gap-1">
              Alles bekijken <Icon name="arrow-right" size={14} />
            </button>
          </div>
          <Table className="!shadow-none !border-none !rounded-none">
            <THead>
              <TH>Medewerker</TH>
              <TH>Trip</TH>
              <TH>Vertrek</TH>
              <TH>Bestemming</TH>
              <TH>Status</TH>
            </THead>
            <tbody>
            {upcomingTrips.map((t, i) => {
              const person = people.find(p => p.UserName === t.owner);
              const ext = extensions.find(e => e.tripId === t.TripId);
              const fullName = person ? `${person.FirstName} ${person.LastName}` : t.owner;
              return (
                <TR key={t.TripId} index={i} onClick={() => onOpenTrip(t.TripId)}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Avatar name={person?.FirstName} size={26} />
                      <span className="font-medium text-[#32363A]">{fullName}</span>
                    </div>
                  </TD>
                  <TD className="font-medium">{t.Name}</TD>
                  <TD className="text-[#6A6D70]">{formatDateNL(t.StartsAt)}</TD>
                  <TD>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-[12px] text-[#6A6D70]">{t.From}</span>
                      <Icon name="arrow-right" size={12} color="#9aa0a6" />
                      <span className="font-mono text-[12px] font-semibold">{t.To}</span>
                    </span>
                  </TD>
                  <TD><StatusBadge status={ext?.approvalStatus || "In behandeling"} /></TD>
                </TR>
              );
            })}
            </tbody>
          </Table>
        </div>

        <div className="lg:col-span-2 pp-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[15px] font-semibold text-[#32363A]">Airlines Gebruik</div>
              <div className="text-xs text-[#6A6D70]">{totalAirlineTrips} reizen geregistreerd</div>
            </div>
            <button onClick={() => onNavigate("airlines")}
                    className="text-[13px] font-semibold text-[#0070F2] hover:underline">Details</button>
          </div>
          <div className="space-y-1">
            {airlines.map(a => {
              const n = airlineCounts[a.AirlineCode] || 0;
              const pct = totalAirlineTrips ? Math.round((n / totalAirlineTrips) * 100) : 0;
              return <HBar key={a.AirlineCode}
                           label={a.Name}
                           value={n} max={airlineMax}
                           sub={`${n} reizen · ${pct}%`} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Medewerkers (People)
// ─────────────────────────────────────────────────────────────────────────────
function PeoplePage({ data, extensions, onOpenPerson, onOpenTrip, persona, team }) {
  const isTL = persona?.id === "teamlead";
  const readOnly = !!persona?.peopleReadOnly;
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const { trips } = data;
  const now = new Date();

  const scopedPeople = useMemo(() => {
    if (isTL && team) return data.people.filter(p => team.includes(p.UserName));
    return data.people;
  }, [data.people, isTL, team]);

  const pendingByUser = useMemo(() => {
    const m = {};
    trips.forEach(t => {
      const ext = extensions.find(e => e.tripId === t.TripId);
      if ((ext?.approvalStatus || "In behandeling") === "In behandeling") m[t.owner] = (m[t.owner] || 0) + 1;
    });
    return m;
  }, [trips, extensions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedPeople.filter(p => {
      if (onlyPending && !(pendingByUser[p.UserName] > 0)) return false;
      if (!q) return true;
      return (p.FirstName + " " + p.LastName).toLowerCase().includes(q) ||
             (p.Emails?.[0] || "").toLowerCase().includes(q);
    });
  }, [scopedPeople, search, onlyPending, pendingByUser]);

  const pendingTotal = scopedPeople.reduce((s, p) => s + (pendingByUser[p.UserName] || 0), 0);

  return (
    <div className="pp-fade-enter p-6">
      {isTL && (
        <div className="pp-card p-4 mb-4 flex items-center gap-3" style={{ borderLeft:"4px solid #107E3E" }}>
          <Icon name="users" size={20} color="#107E3E" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[#32363A]">Mijn Team — {scopedPeople.length} consultants</div>
            <div className="text-xs text-[#6A6D70]">Beschikbaarheid en openstaande goedkeuringen van uw teamleden</div>
          </div>
          {pendingTotal > 0 && (
            <span className="pp-badge warning"><Icon name="clock" size={11} /> {pendingTotal} in behandeling</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <SearchInput value={search} onChange={setSearch}
                     placeholder="Zoek op naam of email..." className="w-80" />
        {isTL && (
          <button onClick={() => setOnlyPending(v => !v)}
                  className={"inline-flex items-center gap-1.5 h-8 px-3 rounded text-[13px] font-semibold border transition-colors " +
                    (onlyPending ? "bg-[#FFF3E0] border-[#E9730C] text-[#E9730C]" : "bg-white border-[#E5E5E5] text-[#6A6D70] hover:bg-[#F7F7F7]")}>
            <Icon name="clock" size={14} /> Alleen 'In behandeling'
          </button>
        )}
        {readOnly && (
          <span className="pp-badge neutral"><Icon name="eye" size={11} /> Alleen lezen</span>
        )}
        <div className="text-sm text-[#6A6D70]"><strong>{filtered.length}</strong> {isTL ? "teamleden" : "medewerkers"} gevonden</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => {
          const myTrips = trips.filter(t => t.owner === p.UserName);
          const traveling = myTrips.some(t => isCurrentlyTraveling(t, now));
          const currentTrip = myTrips.find(t => isCurrentlyTraveling(t, now));
          const nextStart = myTrips.filter(t => new Date(t.StartsAt) > now).sort((a,b)=>new Date(a.StartsAt)-new Date(b.StartsAt))[0];
          const pending = pendingByUser[p.UserName] || 0;
          return (
            <div key={p.UserName} className="pp-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <Avatar name={p.FirstName} size={48} traveling={traveling} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#32363A] truncate">{p.FirstName} {p.LastName}</div>
                  <div className="text-xs text-[#6A6D70] truncate">{p.Emails?.[0]}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {traveling
                  ? <span className="pp-badge error"><span className="inline-block rounded-full" style={{width:6,height:6,background:"#BB0000"}} />Op reis{isTL && currentTrip ? ` tot ${formatDateNL(currentTrip.EndsAt)}` : ""}</span>
                  : <span className="pp-badge success"><span className="inline-block rounded-full" style={{width:6,height:6,background:"#107E3E"}} />Beschikbaar</span>}
                <span className="text-xs text-[#6A6D70]">{myTrips.length} reizen</span>
              </div>
              {isTL && (
                <div className="text-[11px] text-[#6A6D70] -mt-1 flex items-center justify-between">
                  <span>{traveling && currentTrip
                    ? `Beschikbaar vanaf ${formatDateNL(currentTrip.EndsAt)}`
                    : nextStart ? `Volgende reis: ${formatDateNL(nextStart.StartsAt)}` : "Geen geplande reizen"}</span>
                  {pending > 0 && <span className="pp-badge warning" style={{fontSize:10}}>{pending} te keuren</span>}
                </div>
              )}
              <button onClick={() => onOpenPerson(p.UserName)}
                      className="pp-btn-ghost text-[13px] font-semibold rounded h-8 flex items-center justify-center gap-1 border border-[#E5E5E5]">
                {isTL ? "Reistijdlijn" : "Bekijk reizen"} <Icon name="arrow-right" size={14} />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-[#6A6D70] py-12">Geen {isTL ? "teamleden" : "medewerkers"} gevonden.</div>
        )}
      </div>
    </div>
  );
}

function PersonDrawer({ personUser, data, extensions, onClose, onOpenTrip }) {
  if (!personUser) return null;
  const p = data.people.find(x => x.UserName === personUser);
  if (!p) return null;
  const myTrips = data.trips.filter(t => t.owner === p.UserName)
    .sort((a, b) => new Date(a.StartsAt) - new Date(b.StartsAt));

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-start gap-3">
        <Avatar name={p.FirstName} size={44} />
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-[#32363A] truncate">{p.FirstName} {p.LastName}</div>
          <div className="text-xs text-[#6A6D70] truncate">{p.Emails?.[0]}</div>
          <div className="text-xs text-[#6A6D70] mt-0.5">{p.Gender}</div>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-[#F0F2F5]" aria-label="Sluiten">
          <Icon name="x" size={18} />
        </button>
      </div>

      <div className="px-5 py-4 flex-1 overflow-y-auto pp-scroll">
        <div className="pp-label mb-2">Reizen van {p.FirstName}</div>
        {myTrips.length === 0 && <div className="text-sm text-[#6A6D70]">Geen reizen geregistreerd.</div>}
        <ul className="space-y-2">
          {myTrips.map(t => {
            const ext = extensions.find(e => e.tripId === t.TripId);
            return (
              <li key={t.TripId}>
                <button onClick={() => onOpenTrip(t.TripId)}
                        className="w-full text-left pp-card p-3 hover:border-[#0070F2] hover:bg-[#F8FBFF] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-semibold text-[#32363A] text-[14px] truncate">{t.Name}</div>
                    <StatusBadge status={ext?.approvalStatus || "In behandeling"} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6A6D70]">
                    <span className="flex items-center gap-1"><Icon name="calendar" size={12} />{formatDateNL(t.StartsAt)} – {formatDateNL(t.EndsAt)}</span>
                    <span className="flex items-center gap-1"><Icon name="wallet" size={12} />{formatEUR(t.Budget)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reizen (Trips) — list + detail
// ─────────────────────────────────────────────────────────────────────────────
function TripsListPage({ data, extensions, onOpenTrip, initialAirlineFilter = "all", initialStatusFilter = "Alle", persona, team }) {
  const isTL = persona?.id === "teamlead";
  const isHR = persona?.id === "hr";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [airlineFilter, setAirlineFilter] = useState(initialAirlineFilter);
  const [destFilter, setDestFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => { setAirlineFilter(initialAirlineFilter); }, [initialAirlineFilter]);
  useEffect(() => { setStatusFilter(initialStatusFilter); }, [initialStatusFilter]);

  const { people, airlines } = data;
  const cities = useMemo(() => destinationCities(data), [data]);
  const trips = useMemo(() => {
    if (isTL && team) return data.trips.filter(t => team.includes(t.owner));
    return data.trips;
  }, [data.trips, isTL, team]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter(t => {
      if (q && !t.Name.toLowerCase().includes(q)) return false;
      const ext = extensions.find(e => e.tripId === t.TripId);
      if (statusFilter !== "Alle" && (ext?.approvalStatus || "In behandeling") !== statusFilter) return false;
      if (airlineFilter !== "all" && t.Airline !== airlineFilter) return false;
      if (destFilter !== "all" && cityForIata(data, t.To) !== destFilter) return false;
      if (from && new Date(t.StartsAt) < new Date(from)) return false;
      if (to && new Date(t.StartsAt) > new Date(to)) return false;
      return true;
    });
  }, [trips, extensions, search, statusFilter, airlineFilter, destFilter, from, to, data]);

  const clear = () => { setSearch(""); setStatusFilter("Alle"); setAirlineFilter("all"); setDestFilter("all"); setFrom(""); setTo(""); };
  const anyFilter = search || statusFilter !== "Alle" || airlineFilter !== "all" || destFilter !== "all" || from || to;
  const totalBudget = filtered.reduce((s, t) => s + (t.Budget || 0), 0);

  return (
    <div className="pp-fade-enter p-6 space-y-4">
      {isTL && (
        <div className="pp-card p-4 flex items-center gap-3" style={{ borderLeft:"4px solid #107E3E" }}>
          <Icon name="plane" size={20} color="#107E3E" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[#32363A]">Reizen van mijn team</div>
            <div className="text-xs text-[#6A6D70]">Filter op 'In behandeling' om openstaande goedkeuringen te vinden</div>
          </div>
          <button onClick={() => setStatusFilter(statusFilter === "In behandeling" ? "Alle" : "In behandeling")}
                  className={"inline-flex items-center gap-1.5 h-8 px-3 rounded text-[13px] font-semibold border transition-colors " +
                    (statusFilter === "In behandeling" ? "bg-[#FFF3E0] border-[#E9730C] text-[#E9730C]" : "bg-white border-[#E5E5E5] text-[#6A6D70] hover:bg-[#F7F7F7]")}>
            <Icon name="clock" size={14} /> Alleen 'In behandeling'
          </button>
        </div>
      )}
      <div className="pp-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <div className="pp-label mb-1">Zoeken</div>
            <SearchInput value={search} onChange={setSearch} placeholder="Trip naam..." />
          </div>
          <div className="md:col-span-2">
            <div className="pp-label mb-1">Bestemming</div>
            <Select value={destFilter} onChange={setDestFilter}
                    options={[{value:"all",label:"Alle steden"}, ...cities.map(c => ({value:c, label:c}))]} />
          </div>
          <div className="md:col-span-2">
            <div className="pp-label mb-1">Status</div>
            <Select value={statusFilter} onChange={setStatusFilter}
                    options={[{value:"Alle",label:"Alle"},{value:"In behandeling",label:"In behandeling"},{value:"Goedgekeurd",label:"Goedgekeurd"},{value:"Afgekeurd",label:"Afgekeurd"}]} />
          </div>
          <div className="md:col-span-1">
            <div className="pp-label mb-1">Airline</div>
            <Select value={airlineFilter} onChange={setAirlineFilter}
                    options={[{value:"all",label:"Alle"}, ...airlines.map(a => ({value:a.AirlineCode, label:a.AirlineCode}))]} />
          </div>
          <div className="md:col-span-2">
            <div className="pp-label mb-1">Van</div>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="pp-input w-full" style={{height:32}} />
          </div>
          <div className="md:col-span-2">
            <div className="pp-label mb-1">Tot</div>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="pp-input w-full" style={{height:32}} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-[#6A6D70]">
            <strong>{filtered.length}</strong> reizen{isHR ? <span> in periode · totaal budget <strong>{formatEUR(totalBudget)}</strong></span> : " gevonden"}
          </div>
          {anyFilter && (
            <button onClick={clear} className="text-[13px] text-[#0070F2] font-semibold hover:underline flex items-center gap-1">
              <Icon name="x" size={14} /> Filters wissen
            </button>
          )}
        </div>
      </div>

      <Table>
        <THead>
          <TH>Trip Naam</TH>
          <TH>Medewerker</TH>
          <TH>Bestemming</TH>
          <TH>Vertrek</TH>
          <TH>Aankomst</TH>
          <TH className="text-right">Budget</TH>
          <TH>Status</TH>
          <TH style={{ width: 100 }} />
        </THead>
        <tbody>
        {filtered.map((t, i) => {
          const person = people.find(p => p.UserName === t.owner);
          const ext = extensions.find(e => e.tripId === t.TripId);
          return (
            <TR key={t.TripId} index={i} onClick={() => onOpenTrip(t.TripId)}>
              <TD className="font-semibold text-[#32363A]">{t.Name}</TD>
              <TD>
                <div className="flex items-center gap-2">
                  <Avatar name={person?.FirstName} size={24} />
                  <span>{person ? person.FirstName+" "+person.LastName : t.owner}</span>
                </div>
              </TD>
              <TD>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-[12px] text-[#6A6D70]">{t.From}</span>
                  <Icon name="arrow-right" size={11} color="#9aa0a6" />
                  <span className="font-mono text-[12px] font-semibold">{t.To}</span>
                  <span className="text-[12px] text-[#6A6D70]">{cityForIata(data, t.To)}</span>
                </span>
              </TD>
              <TD className="text-[#6A6D70]">{formatDateNL(t.StartsAt)}</TD>
              <TD className="text-[#6A6D70]">{formatDateNL(t.EndsAt)}</TD>
              <TD className="text-right tabular-nums font-semibold">{formatEUR(t.Budget)}</TD>
              <TD><StatusBadge status={ext?.approvalStatus || "In behandeling"} /></TD>
              <TD className="text-right">
                <span className="text-[#0070F2] font-semibold inline-flex items-center gap-1">
                  Details <Icon name="arrow-right" size={14} />
                </span>
              </TD>
            </TR>
          );
        })}
        {filtered.length === 0 && (
          <tr><td colSpan={8} className="px-4 py-12 text-center text-[#6A6D70] text-sm">Geen reizen gevonden met deze filters.</td></tr>
        )}
        </tbody>
      </Table>
    </div>
  );
}

function TripDetailPage({ tripId, data, extensions, setExtensions, onBack, onOpenPerson, onOpenAirline, showToast, persona, team }) {
  const trip = data.trips.find(t => t.TripId === tripId);
  if (!trip) return <div className="p-6">Reis niet gevonden.</div>;
  const isTL = persona?.id === "teamlead";
  const ownTeamTrip = !isTL || (team && team.includes(trip.owner));
  const basePerm = persona?.edit || { projectCode:true, approvalStatus:true, internalNote:true };
  const perm = (isTL && !ownTeamTrip)
    ? { projectCode:false, approvalStatus:false, internalNote:false }
    : basePerm;
  const editBadge = (isTL && !ownTeamTrip)
    ? { label:"Alleen lezen (ander team)", icon:"eye", cls:"neutral" }
    : (persona?.editBadge || { label:"Bewerkbaar", icon:"pencil", cls:"info" });
  const personaNote = (isTL && !ownTeamTrip)
    ? "Deze reis hoort bij een ander team. U kunt enkel de reizen van uw eigen teamleden goedkeuren."
    : persona?.note;
  const anyEditable = perm.projectCode || perm.approvalStatus || perm.internalNote;
  const ext = extensions.find(e => e.tripId === tripId);
  const person = data.people.find(p => p.UserName === trip.owner);
  const airline = data.airlines.find(a => a.AirlineCode === trip.Airline);
  const fromAirport = data.airports.find(a => a.IataCode === trip.From);
  const toAirport = data.airports.find(a => a.IataCode === trip.To);

  const [projectCode, setProjectCode] = useState(ext?.projectCode || "");
  const [approvalStatus, setApprovalStatus] = useState(ext?.approvalStatus || "In behandeling");
  const [internalNote, setInternalNote] = useState(ext?.internalNote || "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setProjectCode(ext?.projectCode || "");
    setApprovalStatus(ext?.approvalStatus || "In behandeling");
    setInternalNote(ext?.internalNote || "");
    setTouched(false);
  }, [tripId]);

  const codeError = perm.projectCode && projectCode.length > 0 && !projectCode.startsWith("PROJ-");
  const noteOver = perm.internalNote && internalNote.length > 500;
  const canSave = anyEditable && !codeError && !noteOver && touched;

  const save = () => {
    if (!canSave) return;
    const now = new Date().toISOString();
    setExtensions(prev => {
      const idx = prev.findIndex(e => e.tripId === tripId);
      const updated = {
        tripId,
        projectCode,
        approvalStatus,
        internalNote,
        createdAt: prev[idx]?.createdAt || now,
        modifiedAt: now,
      };
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated];
    });
    setTouched(false);
    showToast("Wijzigingen opgeslagen");
  };

  return (
    <div className="pp-fade-enter p-6">
      <button onClick={onBack} className="text-[13px] text-[#0070F2] font-semibold hover:underline flex items-center gap-1 mb-3">
        <Icon name="arrow-left" size={14} /> Terug naar reizen
      </button>
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-xs text-[#6A6D70] mb-1">Trip ID #{trip.TripId}</div>
          <h1 className="text-[26px] font-semibold text-[#32363A] leading-tight">{trip.Name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-[#6A6D70]">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="calendar" size={14} />{formatDateNL(trip.StartsAt)} – {formatDateNL(trip.EndsAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-[#32363A] font-semibold">{trip.From}</span>
              <Icon name="arrow-right" size={12} />
              <span className="font-mono text-[#32363A] font-semibold">{trip.To}</span>
            </span>
            <span>·</span>
            <span>{airline?.Name || trip.Airline}</span>
          </div>
        </div>
        <StatusBadge status={approvalStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TripPin (read-only) */}
        <div className="pp-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between"
               style={{ background:"#F7F7F7" }}>
            <div className="text-[14px] font-semibold text-[#32363A] flex items-center gap-2">
              <Icon name="database" size={14} color="#6A6D70" /> TripPin Informatie
            </div>
            <span className="pp-badge neutral"><Icon name="lock" size={10} /> Read-only (TripPin)</span>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Medewerker">
              <button onClick={() => onOpenPerson(trip.owner)}
                      className="flex items-center gap-2 hover:underline">
                <Avatar name={person?.FirstName} size={26} />
                <span className="font-semibold text-[#0070F2]">{person ? person.FirstName+" "+person.LastName : trip.owner}</span>
              </button>
            </Field>
            <Field label="Vertrekdatum">{formatDateNL(trip.StartsAt)}</Field>
            <Field label="Aankomstdatum">{formatDateNL(trip.EndsAt)}</Field>
            <Field label="Budget"><span className="text-[16px] font-semibold tabular-nums">{formatEUR(trip.Budget)}</span></Field>
            <Field label="Airline">
              {onOpenAirline ? (
                <button onClick={() => onOpenAirline(trip.Airline)}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#0070F2] hover:underline">
                  {airline?.Name || trip.Airline}
                  <Icon name="arrow-up-right" size={13} />
                </button>
              ) : (airline?.Name || trip.Airline)}
            </Field>
            <Field label="Route">
              <div className="flex items-center gap-2 text-sm">
                <span><span className="font-mono font-semibold">{trip.From}</span> {fromAirport ? `· ${fromAirport.City}` : ""}</span>
                <Icon name="arrow-right" size={14} color="#6A6D70" />
                <span><span className="font-mono font-semibold">{trip.To}</span> {toAirport ? `· ${toAirport.City}` : ""}</span>
              </div>
            </Field>
            <Field label="Beschrijving"><span className="text-[#32363A]">{trip.Description}</span></Field>
          </div>
        </div>

        {/* PrimePath (editable) */}
        <div className="pp-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between"
               style={{ background:"#E8F2FF", borderColor:"#BCD7FA" }}>
            <div className="text-[14px] font-semibold text-[#0058C4] flex items-center gap-2">
              <Icon name="sparkles" size={14} color="#0070F2" /> PrimePath Velden
            </div>
            <span className={"pp-badge " + editBadge.cls}><Icon name={editBadge.icon} size={10} /> {editBadge.label}</span>
          </div>
          <div className="p-5 space-y-4">
            {personaNote && (
              <div className="text-[12px] flex items-start gap-2 px-3 py-2 rounded" style={{ background:"#F7F7F7", color:"#6A6D70", border:"1px solid #E5E5E5" }}>
                <Icon name="info" size={12} /> <span>{personaNote}</span>
              </div>
            )}
            <div>
              <div className="pp-label mb-1.5 flex items-center gap-1">Project Code {!perm.projectCode && <Icon name="lock" size={10} color="#9aa0a6" />}</div>
              <input
                type="text"
                value={projectCode}
                onChange={(e)=>{ if(!perm.projectCode) return; setProjectCode(e.target.value); setTouched(true); }}
                disabled={!perm.projectCode}
                placeholder="PROJ-2026-XXX"
                className={"pp-input w-full font-mono " + (codeError ? "error " : "") + (!perm.projectCode ? "bg-[#F7F7F7] text-[#9aa0a6] cursor-not-allowed" : "")}
              />
              {codeError
                ? <div className="text-xs mt-1 flex items-center gap-1" style={{color:"#BB0000"}}>
                    <Icon name="alert-circle" size={12} /> Code moet starten met "PROJ-"
                  </div>
                : <div className="text-xs text-[#6A6D70] mt-1">Format: PROJ-YYYY-XXX</div>}
            </div>

            <div>
              <div className="pp-label mb-1.5 flex items-center gap-1">Goedkeuringsstatus {!perm.approvalStatus && <Icon name="lock" size={10} color="#9aa0a6" />}</div>
              {perm.approvalStatus ? (
                <Select value={approvalStatus}
                        onChange={(v)=>{ setApprovalStatus(v); setTouched(true); }}
                        options={[
                          {value:"In behandeling", label:"In behandeling"},
                          {value:"Goedgekeurd",   label:"Goedgekeurd"},
                          {value:"Afgekeurd",     label:"Afgekeurd"},
                        ]} />
              ) : (
                <div className="pp-input bg-[#F7F7F7] text-[#9aa0a6] cursor-not-allowed flex items-center" style={{height:32}}>{approvalStatus}</div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="pp-label">Interne Notitie</div>
                <div className={"text-xs tabular-nums " + (noteOver ? "text-[#BB0000] font-semibold" : "text-[#6A6D70]")}>
                  {internalNote.length}/500
                </div>
              </div>
              <textarea
                value={internalNote}
                onChange={(e)=>{ if(!perm.internalNote) return; setInternalNote(e.target.value); setTouched(true); }}
                disabled={!perm.internalNote}
                rows={4}
                className={"pp-input w-full resize-y " + (noteOver ? "error " : "") + (!perm.internalNote ? "bg-[#F7F7F7] text-[#9aa0a6] cursor-not-allowed" : "")}
                placeholder="Notities zichtbaar voor het travel team..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Field small label="Aangemaakt op">{formatDateTimeNL(ext?.createdAt)}</Field>
              <Field small label="Gewijzigd op">{formatDateTimeNL(ext?.modifiedAt)}</Field>
            </div>

            {anyEditable && (
              <button onClick={save} disabled={!canSave}
                      className={"w-full h-10 rounded font-semibold text-[14px] flex items-center justify-center gap-1.5 transition-colors " +
                                 (canSave ? "pp-btn-primary" : "bg-[#E5E5E5] text-[#9aa0a6] cursor-not-allowed")}>
                <Icon name="save" size={16} /> Opslaan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, small }) {
  return (
    <div>
      <div className={"pp-label mb-" + (small ? "0.5" : "1")}>{label}</div>
      <div className={small ? "text-[12px] text-[#32363A]" : "text-[14px] text-[#32363A]"}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Airlines
// ─────────────────────────────────────────────────────────────────────────────
function AirlinesPage({ data, onAirlineDrillDown, persona }) {
  const isHR = persona?.id === "hr";
  const { airlines, trips } = data;
  const counts = {};
  trips.forEach(t => { if (t.Airline) counts[t.Airline] = (counts[t.Airline]||0) + 1; });
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="pp-fade-enter p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#6A6D70]"><strong>{airlines.length}</strong> airlines</div>
        {isHR && (
          <div className="relative group">
            <button disabled className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-[13px] font-semibold bg-[#E5E5E5] text-[#9aa0a6] cursor-not-allowed">
              <Icon name="download" size={14} /> Exporteer rapport
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block pp-card px-3 py-2 text-[12px] text-[#6A6D70] whitespace-nowrap z-10">Functie beschikbaar in volgende versie</div>
          </div>
        )}
      </div>
      <Table>
        <THead>
          <TH style={{width:120}}>Code</TH>
          <TH>Naam</TH>
          <TH className="text-right" style={{width:120}}>Aantal Reizen</TH>
          {isHR && <TH className="text-right" style={{width:160}}>Totaal Budget</TH>}
          <TH style={{width:240}}>Aandeel</TH>
          <TH style={{width:160}} />
        </THead>
        <tbody>
          {airlines.map((a, i) => {
            const n = counts[a.AirlineCode] || 0;
            const pct = total ? Math.round((n/total)*100) : 0;
            const budget = trips.filter(t => t.Airline === a.AirlineCode).reduce((s,t)=>s+(t.Budget||0),0);
            return (
              <TR key={a.AirlineCode} index={i}>
                <TD><span className="font-mono font-bold text-[#0070F2] text-[14px] tracking-wide">{a.AirlineCode}</span></TD>
                <TD className="font-medium">{a.Name}</TD>
                <TD className="text-right tabular-nums font-semibold">{n}</TD>
                {isHR && <TD className="text-right tabular-nums">{formatEUR(budget)}</TD>}
                <TD>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#F0F2F5] rounded h-2 overflow-hidden">
                      <div className="h-full" style={{ width: pct+"%", background:"#0070F2" }} />
                    </div>
                    <span className="text-xs text-[#6A6D70] tabular-nums w-10 text-right">{pct}%</span>
                  </div>
                </TD>
                <TD className="text-right">
                  <button onClick={()=>onAirlineDrillDown(a.AirlineCode)}
                          className="text-[13px] text-[#0070F2] font-semibold hover:underline inline-flex items-center gap-1">
                    Bekijk reizen <Icon name="arrow-right" size={14} />
                  </button>
                </TD>
              </TR>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Luchthavens
// ─────────────────────────────────────────────────────────────────────────────
function AirportsPage({ data }) {
  const [search, setSearch] = useState("");
  const filtered = data.airports.filter(a => {
    const q = search.trim().toLowerCase(); if (!q) return true;
    return (a.Name||"").toLowerCase().includes(q)
        || (a.City||"").toLowerCase().includes(q)
        || (a.IataCode||"").toLowerCase().includes(q);
  });
  return (
    <div className="pp-fade-enter p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Zoek op naam, stad of IATA..." className="w-80" />
        <div className="text-sm text-[#6A6D70]"><strong>{filtered.length}</strong> luchthavens gevonden</div>
      </div>
      <Table>
        <THead>
          <TH style={{width:100}}>IATA</TH>
          <TH style={{width:100}}>ICAO</TH>
          <TH>Naam</TH>
          <TH>Stad</TH>
          <TH>Coördinaten</TH>
        </THead>
        <tbody>
          {filtered.map((a, i) => (
            <TR key={a.IcaoCode || a.IataCode || i} index={i}>
              <TD><span className="font-mono font-bold text-[#0070F2]">{a.IataCode}</span></TD>
              <TD><span className="font-mono text-[#6A6D70]">{a.IcaoCode}</span></TD>
              <TD className="font-medium">{a.Name}</TD>
              <TD>{a.City}</TD>
              <TD className="text-[#6A6D70] tabular-nums text-[12px]">
                {a.Location ? `${a.Location.Lat?.toFixed?.(2) ?? a.Location.Lat}, ${a.Location.Lon?.toFixed?.(2) ?? a.Location.Lon}` : "—"}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

Object.assign(window, {
  DashboardPage, PeoplePage, PersonDrawer,
  TripsListPage, TripDetailPage,
  AirlinesPage, AirportsPage,
});
