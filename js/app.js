/*
   Holiday Movie Browser – JavaScript:
   - Kopplar ihop sökfält och knappar med OMDb API
   - Hämtar filmer, skapar filmkort i HTML och visar IMDb-betyg
*/

// API-nyckel till OMDb (krävs för att få hämta data)
const OMDB_KEY = "be127e16";

/* ---------------------------------------------------------------------------
   HÄMTA HTML-ELEMENT (DOM)
   - document.getElementById() används för att koppla JS till element i HTML
--------------------------------------------------------------------------- */
const form = document.getElementById("form"); // <form id="form">
const queryInput = document.getElementById("query"); // <input id="query">
const statusEl = document.getElementById("status"); // <p id="status">
const grid = document.getElementById("grid"); // <section id="grid">
const resultsTitle = document.getElementById("resultsTitle"); // <h2 id="resultsTitle">

/* ---------------------------------------------------------------------------
   HJÄLPFUNKTIONER FÖR UI-TEXT
   - Små funktioner gör koden mer lättläst och återanvändbar
--------------------------------------------------------------------------- */

// Visar ett meddelande till användaren (t.ex. "Hämtar..." eller feltext)
function setStatus(msg) {
  statusEl.textContent = msg;
}

// Rubriken på startsidan (innan användaren söker själv)
function setStartTitle() {
  resultsTitle.textContent = "Utvalda julfilmer:";
}

// Rubriken när man gjort en sökning: visar antal träffar
function setResultsTitle(total) {
  resultsTitle.textContent = `Träffar: ${total}`;
}

/* Reservbild för poster: om API:et saknar poster (Poster = "N/A") visas en enkel reservbild som skapas direkt i koden. */
function createPosterFallback() {
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">
      <rect width="100%" height="100%" fill="rgba(255,255,255,0.08)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="rgba(255,255,255,0.6)" font-family="Arial" font-size="18">Saknar bild</text>
    </svg>`)
  );
}

/* Hämtar IMDb-betyg: sökningen ger en lista filmer men inte imdbRating, så ett extra API-anrop görs per film med imdbID för att hämta betyget. */
async function fetchRating(imdbID) {
  // Bygger en URL med template string (backticks) och variabler
  const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbID}`;

  // fetch() gör en HTTP-förfrågan och returnerar ett Promise
  const res = await fetch(url);

  // .json() läser svaret och gör om det till ett JS-objekt
  const data = await res.json();

  // OMDb svarar med data.Response = "True" eller "False"
  if (data.Response === "True") return data.imdbRating; // t.ex. "8.2"
  return null; // om något inte stämmer
}

/* Renderar filmer på sidan: skapar filmkort i HTML med JavaScript (poster, titel, år och betyg) och lägger dem i resultat-gridden. */
async function renderMovies(movies) {
  // Rensar tidigare resultat innan man visar nya
  grid.innerHTML = "";

  // Om man inte fått några filmer: visa meddelande i resultatytan
  if (!movies || movies.length === 0) {
    grid.innerHTML = "<p>Inga träffar.</p>";
    return;
  }

  // Visa max 10 filmer (för att inte skapa för många kort)
  for (const m of movies.slice(0, 10)) {
    // Skapar ett <article> som filmkort
    const card = document.createElement("article");
    card.className = "card";

    // Skapar en <img> för poster
    const img = document.createElement("img");
    img.className = "poster";
    img.loading = "lazy"; // laddar bilden först när den behövs (prestanda)
    img.alt = m.Title ? `Poster: ${m.Title}` : "Poster";

    // Om OMDb har en poster-URL: använd den, annars fallback-SVG
    img.src = m.Poster && m.Poster !== "N/A" ? m.Poster : createPosterFallback();

    // Skapar en <p> för titel
    const title = document.createElement("p");
    title.className = "movie-title";
    title.textContent = m.Title || "Okänd titel";

    // Skapar en <p> för år
    const year = document.createElement("p");
    year.className = "small";
    year.textContent = `År: ${m.Year || "—"}`;

    // Skapar en <p> för betyg (fylls i efter att man hämtat rating)
    const rating = document.createElement("p");
    rating.className = "small";
    rating.textContent = "IMDb-betyg: …/10";

    // Lägger in alla delar i kortet och sedan kortet i gridden
    card.append(img, title, year, rating);
    grid.appendChild(card);

    /* ---------------------------------------------------------------
       HÄMTA BETYG EFTERÅT (Promise med then/catch)
       - Hämtar betyg per film med fetchRating(imdbID)
       - När betyget kommer uppdateras samma <p> för rating
       - catch används för att hantera nätverksfel / API-fel
    ---------------------------------------------------------------- */
    fetchRating(m.imdbID)
      .then((imdbRating) => {
        // ?? betyder: om imdbRating är null/undefined, använd "—"
        rating.textContent = `IMDb-betyg: ${imdbRating ?? "—"}/10`;
      })
      .catch((err) => {
        console.error(err);
        rating.textContent = "IMDb-betyg: —/10";
      });
  }
}

/* ---------------------------------------------------------------------------
   SÖK FILMER (API-ANROP + FELHANTERING)
   - Hämtar en lista filmer via OMDb: s=<sökord>&type=movie
   - Visar status "Hämtar..." medan man väntar
   - try/catch hanterar nätverksfel
--------------------------------------------------------------------------- */

// isStart = true betyder: på startsidan ska det inte skrivas "Träffar: ..."
async function searchMovies(q, isStart = false) {
  setStatus("Hämtar...");
  grid.innerHTML = ""; // rensar resultat direkt (snabbare för användaren)

  // encodeURIComponent skyddar URL:en om q innehåller mellanslag/åäö
  const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${encodeURIComponent(
    q
  )}&type=movie`;

  try {
    // Gör API-anropet
    const res = await fetch(url);
    const data = await res.json();

    // OMDb kan svara med "False" och ett Error-meddelande
    if (data.Response === "False") {
      if (!isStart) setResultsTitle(0);

      setStatus(data.Error || "Inga träffar.");
      await renderMovies([]); // visa "Inga träffar."
      return; // avslutar funktionen här
    }

    // totalResults kan vara en sträng, men det funkar bra att visa som text
    if (!isStart) setResultsTitle(data.totalResults);

    // Töm status när vi har resultat
    setStatus("");

    // Rendera filmkorten i gridden
    await renderMovies(data.Search);
  } catch (err) {
    // Om fetch misslyckas (offline, fel URL, CORS, API-problem etc.)
    console.error(err);
    setStatus("Något gick fel (nätverk/API-nyckel).");
    await renderMovies([]);
  }
}

/* ---------------------------------------------------------------------------
   EVENT LISTENERS (INTERAKTION)
   - addEventListener() används för att reagera på användarens handlingar
--------------------------------------------------------------------------- */

/* Form-sökning:
   - submit triggas när man trycker Enter eller klickar på Sök-knappen
   - preventDefault() stoppar att sidan laddas om
*/
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // .value läser texten i inputfältet
  // .trim() tar bort mellanslag i början/slutet
  const q = queryInput.value.trim();

  // Om input är tom: gör inget
  if (!q) return;

  // Starta en vanlig sökning: visar "Träffar: ..."
  searchMovies(q);
});

/* Chips-sökning:
   - querySelectorAll() hämtar alla element med klassen .chip
   - forEach() går igenom listan och kopplar en click-händelse
*/
document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    // dataset.q läser data-q="..." från HTML-knappen
    const q = btn.dataset.q;
    if (!q) return;

    // Uppdatera inputfältet så användaren ser vad som söks
    queryInput.value = q;

    // Starta en vanlig sökning: visar "Träffar: ..."
    searchMovies(q);
  });
});

/* ---------------------------------------------------------------------------
   STARTLÄGE
   - Visar en rubrik och laddar in "christmas" som exempel på startsidan.
--------------------------------------------------------------------------- */
setStartTitle();
searchMovies("christmas", true);
