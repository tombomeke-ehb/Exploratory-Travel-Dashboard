// === PrimePath Travel — data layer ===
// Mock fallback data (used if TripPin API unreachable)

const MOCK_PEOPLE = [
  { UserName: "russellwhyte", FirstName: "Russell", LastName: "Whyte", Emails: ["Russell@example.com"], Gender: "Male" },
  { UserName: "scottketchum", FirstName: "Scott", LastName: "Ketchum", Emails: ["Scott@example.com"], Gender: "Male" },
  { UserName: "ronaldmundy", FirstName: "Ronald", LastName: "Mundy", Emails: ["Ronald@example.com"], Gender: "Male" },
  { UserName: "javieralverez", FirstName: "Javier", LastName: "Alvarez", Emails: ["Javier@example.com"], Gender: "Male" },
  { UserName: "angelhuffman", FirstName: "Angel", LastName: "Huffman", Emails: ["Angel@example.com"], Gender: "Female" },
  { UserName: "elainestewart", FirstName: "Elaine", LastName: "Stewart", Emails: ["Elaine@example.com"], Gender: "Female" },
  { UserName: "salliesampson", FirstName: "Sallie", LastName: "Sampson", Emails: ["Sallie@example.com"], Gender: "Female" },
  { UserName: "vincentcalabrese", FirstName: "Vincent", LastName: "Calabrese", Emails: ["Vincent@example.com"], Gender: "Male" },
];

const MOCK_TRIPS = [
  { TripId: 1001, owner:"russellwhyte", Name: "Trip to Brussels",      Budget: 1200, StartsAt: "2026-05-10T00:00:00Z", EndsAt: "2026-05-14T00:00:00Z", Description: "Client visit at Proximus HQ",     Airline:"SN", From:"LHR", To:"BRU" },
  { TripId: 1002, owner:"russellwhyte", Name: "US Conference",         Budget: 3500, StartsAt: "2026-05-20T00:00:00Z", EndsAt: "2026-05-27T00:00:00Z", Description: "SAP TechEd Las Vegas",            Airline:"AA", From:"BRU", To:"LAX" },
  { TripId: 1003, owner:"scottketchum", Name: "London Business Trip",  Budget: 1800, StartsAt: "2026-06-02T00:00:00Z", EndsAt: "2026-06-05T00:00:00Z", Description: "Meeting with UK partners",        Airline:"BA", From:"BRU", To:"LHR" },
  { TripId: 1004, owner:"scottketchum", Name: "Paris Summit",          Budget:  950, StartsAt: "2026-05-08T00:00:00Z", EndsAt: "2026-05-09T00:00:00Z", Description: "Strategy alignment session",      Airline:"AF", From:"BRU", To:"CDG" },
  { TripId: 1005, owner:"ronaldmundy",  Name: "Amsterdam Workshop",    Budget:  600, StartsAt: "2026-05-15T00:00:00Z", EndsAt: "2026-05-16T00:00:00Z", Description: "Agile transformation workshop",   Airline:"LH", From:"BRU", To:"CDG" },
  { TripId: 1006, owner:"ronaldmundy",  Name: "Frankfurt Audit",       Budget: 1450, StartsAt: "2026-05-11T00:00:00Z", EndsAt: "2026-05-13T00:00:00Z", Description: "Year-end audit visit",            Airline:"LH", From:"BRU", To:"CDG" },
  { TripId: 1007, owner:"javieralverez",Name: "New York Pitch",        Budget: 4200, StartsAt: "2026-05-18T00:00:00Z", EndsAt: "2026-05-22T00:00:00Z", Description: "Investor pitch with NYC partners",Airline:"AA", From:"BRU", To:"JFK" },
  { TripId: 1008, owner:"javieralverez",Name: "Dublin Roadshow",       Budget: 1100, StartsAt: "2026-06-09T00:00:00Z", EndsAt: "2026-06-11T00:00:00Z", Description: "Recruitment roadshow",            Airline:"BA", From:"BRU", To:"LHR" },
  { TripId: 1009, owner:"angelhuffman", Name: "Berlin Workshop",       Budget:  890, StartsAt: "2026-05-06T00:00:00Z", EndsAt: "2026-05-07T00:00:00Z", Description: "Internal workshop",               Airline:"LH", From:"BRU", To:"CDG" },
  { TripId: 1010, owner:"angelhuffman", Name: "Madrid Onboarding",     Budget: 1300, StartsAt: "2026-05-25T00:00:00Z", EndsAt: "2026-05-28T00:00:00Z", Description: "Client onboarding session",       Airline:"AF", From:"BRU", To:"CDG" },
  { TripId: 1011, owner:"elainestewart",Name: "Zurich Review",         Budget: 1700, StartsAt: "2026-05-12T00:00:00Z", EndsAt: "2026-05-14T00:00:00Z", Description: "Quarterly review meeting",        Airline:"LH", From:"BRU", To:"CDG" },
  { TripId: 1012, owner:"elainestewart",Name: "Lisbon Conference",     Budget: 1200, StartsAt: "2026-06-15T00:00:00Z", EndsAt: "2026-06-18T00:00:00Z", Description: "Web Summit attendance",           Airline:"BA", From:"BRU", To:"LHR" },
  { TripId: 1013, owner:"salliesampson",Name: "Geneva Negotiation",    Budget: 1850, StartsAt: "2026-05-09T00:00:00Z", EndsAt: "2026-05-10T00:00:00Z", Description: "Contract negotiation",            Airline:"AF", From:"BRU", To:"CDG" },
  { TripId: 1014, owner:"salliesampson",Name: "Milan Trade Show",      Budget: 1650, StartsAt: "2026-05-30T00:00:00Z", EndsAt: "2026-06-02T00:00:00Z", Description: "Trade show booth",                Airline:"AF", From:"BRU", To:"CDG" },
  { TripId: 1015, owner:"vincentcalabrese", Name: "Copenhagen Visit",  Budget:  990, StartsAt: "2026-05-19T00:00:00Z", EndsAt: "2026-05-21T00:00:00Z", Description: "Nordic partner visit",            Airline:"SN", From:"BRU", To:"LHR" },
  { TripId: 1016, owner:"vincentcalabrese", Name: "Toronto Kickoff",   Budget: 3100, StartsAt: "2026-06-22T00:00:00Z", EndsAt: "2026-06-26T00:00:00Z", Description: "Project kickoff with NA team",    Airline:"AA", From:"BRU", To:"JFK" },
];

const MOCK_AIRLINES = [
  { AirlineCode: "AA", Name: "American Airlines" },
  { AirlineCode: "BA", Name: "British Airways" },
  { AirlineCode: "LH", Name: "Lufthansa" },
  { AirlineCode: "SN", Name: "Brussels Airlines" },
  { AirlineCode: "AF", Name: "Air France" },
];

const MOCK_AIRPORTS = [
  { IcaoCode: "EBBR", Name: "Brussels Airport",        IataCode: "BRU", City: "Brussel",     Location: { Lat: 50.9,  Lon: 4.48   } },
  { IcaoCode: "EGLL", Name: "Heathrow Airport",        IataCode: "LHR", City: "London",      Location: { Lat: 51.47, Lon: -0.45  } },
  { IcaoCode: "KLAX", Name: "Los Angeles Intl",        IataCode: "LAX", City: "Los Angeles", Location: { Lat: 33.94, Lon: -118.40} },
  { IcaoCode: "KJFK", Name: "JFK International",       IataCode: "JFK", City: "New York",    Location: { Lat: 40.63, Lon: -73.78 } },
  { IcaoCode: "LFPG", Name: "Charles de Gaulle",       IataCode: "CDG", City: "Paris",       Location: { Lat: 49.01, Lon: 2.55   } },
  { IcaoCode: "EDDF", Name: "Frankfurt am Main",       IataCode: "FRA", City: "Frankfurt",   Location: { Lat: 50.03, Lon: 8.56   } },
  { IcaoCode: "LSZH", Name: "Zurich Airport",          IataCode: "ZRH", City: "Zurich",      Location: { Lat: 47.46, Lon: 8.55   } },
  { IcaoCode: "EHAM", Name: "Amsterdam Schiphol",      IataCode: "AMS", City: "Amsterdam",   Location: { Lat: 52.31, Lon: 4.76   } },
];

function initialExtensions(trips) {
  const statuses = ["In behandeling", "Goedgekeurd", "Afgekeurd"];
  const notes = [
    "Reis bevestigd door teamlead. Wachten op definitieve agenda.",
    "Klant heeft data bevestigd. Hotel reservatie via Egencia.",
    "Budget overschrijding besproken — extra €200 voor catering.",
    "Geannuleerd wegens wijziging projectplanning.",
    "",
    "Eerste klasse goedgekeurd door directie.",
    "Combinatie met persoonlijke vakantie — privé verlof aangevraagd.",
    "",
  ];
  const now = Date.now();
  return trips.map((t, i) => ({
    tripId: t.TripId,
    projectCode: "PROJ-2026-" + String(40 + i).padStart(3, "0"),
    approvalStatus: statuses[i % 3],
    internalNote: notes[i % notes.length],
    createdAt: new Date(now - (i + 5) * 86400000).toISOString(),
    modifiedAt: new Date(now - (i + 1) * 3600000).toISOString(),
  }));
}

const TRIPPIN_BASE = "https://services.odata.org/V4/TripPinService";
const TRIPPIN_PROXY = "https://corsproxy.io/?url=";

async function fetchTripPin(path, timeoutMs = 8000) {
  const tryUrls = [
    TRIPPIN_BASE + path,
    TRIPPIN_PROXY + encodeURIComponent(TRIPPIN_BASE + path),
  ];
  for (const url of tryUrls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      clearTimeout(t);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.value)) return json;
      }
    } catch (e) { /* try next url */ }
  }
  return null;
}

async function loadAllData() {
  const data = {
    people: MOCK_PEOPLE,
    trips: MOCK_TRIPS,
    airlines: MOCK_AIRLINES,
    airports: MOCK_AIRPORTS,
    usingMock: true,
    source: { people:"mock", airlines:"mock", airports:"mock" },
  };

  const [peopleR, airlinesR, airportsR] = await Promise.allSettled([
    fetchTripPin("/People?$top=20"),
    fetchTripPin("/Airlines"),
    fetchTripPin("/Airports?$top=20"),
  ]);
  const people   = peopleR.status === "fulfilled" ? peopleR.value : null;
  const airlines = airlinesR.status === "fulfilled" ? airlinesR.value : null;
  const airports = airportsR.status === "fulfilled" ? airportsR.value : null;

  let gotLive = false;

  if (people && people.value) {
    const pp = people.value.filter(p => p.FirstName && p.LastName);
    if (pp.length >= 5) {
      data.people = pp.slice(0, 8).map(p => ({
        UserName: p.UserName,
        FirstName: p.FirstName,
        LastName: p.LastName,
        Emails: p.Emails && p.Emails.length ? p.Emails : [`${p.UserName}@example.com`],
        Gender: p.Gender || "Unknown",
      }));
      const usernames = data.people.map(p => p.UserName);
      data.trips = MOCK_TRIPS.map((t, i) => ({ ...t, owner: usernames[i % usernames.length] }));
      data.source.people = "TripPin";
      gotLive = true;
    }
  }

  if (airlines && airlines.value && airlines.value.length) {
    data.airlines = airlines.value.map(a => ({ AirlineCode: a.AirlineCode, Name: a.Name }));
    data.source.airlines = "TripPin";
    gotLive = true;
    const codes = data.airlines.map(a => a.AirlineCode);
    data.trips = data.trips.map((t, i) => codes.includes(t.Airline) ? t : { ...t, Airline: codes[i % codes.length] });
  }

  if (airports && airports.value && airports.value.length) {
    data.airports = airports.value.slice(0, 12).map(a => ({
      IcaoCode: a.IcaoCode,
      Name: a.Name,
      IataCode: a.IataCode,
      City: a.Location?.City?.Name || a.Location?.Address || a.Name,
      Location: a.Location?.Loc?.coordinates
        ? { Lat: a.Location.Loc.coordinates[1], Lon: a.Location.Loc.coordinates[0] }
        : null,
    }));
    data.source.airports = "TripPin";
    gotLive = true;

    const codes = data.airports.map(a => a.IataCode).filter(Boolean);
    if (codes.length >= 2) {
      data.trips = data.trips.map((t, i) => {
        const from = codes[i % codes.length];
        let to = codes[(i + 3) % codes.length];
        if (to === from) to = codes[(i + 1) % codes.length];
        return { ...t, From: from, To: to };
      });
    }
  }

  data.usingMock = !gotLive;
  return data;
}

function formatDateNL(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateTimeNL(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("nl-BE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatEUR(n) {
  if (n == null) return "—";
  return "€ " + Math.round(n).toLocaleString("nl-BE");
}
function avatarColor(firstName) {
  const c = (firstName || "?")[0].toUpperCase();
  if (c >= "A" && c <= "E") return "#0070F2";
  if (c >= "F" && c <= "J") return "#107E3E";
  if (c >= "K" && c <= "O") return "#6800B4";
  if (c >= "P" && c <= "T") return "#E9730C";
  return "#BB0000";
}
function statusBadgeClass(status) {
  if (status === "Goedgekeurd") return "success";
  if (status === "Afgekeurd") return "error";
  return "warning";
}
function isActiveTrip(trip, now = new Date()) {
  const start = new Date(trip.StartsAt);
  const end = new Date(trip.EndsAt);
  const in30 = new Date(now.getTime() + 30 * 86400000);
  return (start <= now && end >= now) || (start >= now && start <= in30);
}
function isCurrentlyTraveling(trip, now = new Date()) {
  const start = new Date(trip.StartsAt);
  const end = new Date(trip.EndsAt);
  return start <= now && end >= now;
}

function getTeamUsernames(data) {
  if (!data || !data.people) return [];
  return data.people.slice(0, 4).map(p => p.UserName);
}
function cityForIata(data, iata) {
  const a = (data.airports || []).find(x => x.IataCode === iata);
  return a ? a.City : iata;
}
function destinationCities(data) {
  const set = new Map();
  (data.trips || []).forEach(t => {
    const c = cityForIata(data, t.To);
    if (c) set.set(c, true);
  });
  return [...set.keys()].sort();
}

Object.assign(window, {
  MOCK_PEOPLE, MOCK_TRIPS, MOCK_AIRLINES, MOCK_AIRPORTS,
  initialExtensions, loadAllData,
  formatDateNL, formatDateTimeNL, formatEUR, avatarColor,
  statusBadgeClass, isActiveTrip, isCurrentlyTraveling,
  getTeamUsernames, cityForIata, destinationCities,
});
