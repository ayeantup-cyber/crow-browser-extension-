```javascript
// World Words Hub — Main Application
//
// All extension-page JavaScript lives here.
// No inline JavaScript is required in index.html.

const api = typeof browser !== "undefined" ? browser : chrome;


/* ================================================================
   STORAGE
================================================================ */

const STORAGE_KEYS = {
  NOTES: "bluco_field_notes_v3",
  EMBEDS: "bluco_embed_playlist_v1"
};

let notesVault = loadLocalArray(STORAGE_KEYS.NOTES);
let embedPlaylist = loadLocalArray(STORAGE_KEYS.EMBEDS);


/* ================================================================
   AUDIO STATE
================================================================ */

let audioCtx = null;
let analyserNode = null;
let audioElement = null;
let audioSourceNode = null;


/* ================================================================
   INITIALIZATION
================================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  renderNotes();
  renderEmbedPlaylist();

  setupEventListeners();

  /*
   * Handle a word sent from the extension context menu.
   */
  await loadTargetWord();

});


/* ================================================================
   EVENT LISTENERS
================================================================ */

function setupEventListeners() {

  // Themes
  document
    .getElementById("btnThemeDark")
    .addEventListener("click", () => setTheme("dark"));

  document
    .getElementById("btnThemeLight")
    .addEventListener("click", () => setTheme("light"));

  document
    .getElementById("btnThemeCyber")
    .addEventListener("click", () => setTheme("cyber"));


  // Tabs
  document
    .getElementById("tab-words")
    .addEventListener("click", () => switchTab("words"));

  document
    .getElementById("tab-audio")
    .addEventListener("click", () => switchTab("audio"));

  document
    .getElementById("tab-notes")
    .addEventListener("click", () => switchTab("notes"));


  // Word search
  document
    .getElementById("wordSearchButton")
    .addEventListener("click", executeWordSearch);

  document
    .getElementById("wordSearchInput")
    .addEventListener("keydown", (event) => {

      if (event.key === "Enter") {
        event.preventDefault();
        executeWordSearch();
      }

    });


  // Audio
  document
    .getElementById("audioFileInput")
    .addEventListener("change", handleAudioUpload);

  document
    .getElementById("playBtn")
    .addEventListener("click", togglePlay);

  document
    .getElementById("stopAudioBtn")
    .addEventListener("click", stopAudio);

  document
    .getElementById("timestampBtn")
    .addEventListener("click", addTimestampToNote);


  // Embeds
  document
    .getElementById("saveEmbedBtn")
    .addEventListener("click", saveEmbedToPlaylist);


  // Notes
  document
    .getElementById("saveNoteBtn")
    .addEventListener("click", saveNote);


  // Dynamic playlist controls
  document
    .getElementById("embedPlaylistList")
    .addEventListener("click", handlePlaylistClick);


  // Dynamic note controls
  document
    .getElementById("notesContainer")
    .addEventListener("click", handleNotesClick);
}


/* ================================================================
   CONTEXT MENU → TARGET WORD
================================================================ */

async function loadTargetWord() {

  if (!api?.storage?.local) {
    return;
  }

  try {

    const result = await api.storage.local.get("targetWord");

    if (!result || !result.targetWord) {
      return;
    }

    const targetWord = String(result.targetWord).trim();

    if (!targetWord) {
      return;
    }

    const input = document.getElementById("wordSearchInput");

    if (!input) {
      return;
    }

    /*
     * Put the selected webpage text into the actual
     * input used by this application.
     */
    input.value = targetWord;

    /*
     * Automatically execute this application's
     * existing dictionary search.
     */
    await executeWordSearch();

    /*
     * Remove the temporary value so reopening the
     * extension doesn't search the same word again.
     */
    await api.storage.local.remove("targetWord");

  } catch (error) {

    console.error(
      "Unable to load target word:",
      error
    );

  }
}


/* ================================================================
   LOCAL STORAGE HELPERS
================================================================ */

function loadLocalArray(key) {

  try {

    const raw = localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      `Unable to load localStorage key "${key}":`,
      error
    );

    return [];
  }
}


/* ================================================================
   TOAST
================================================================ */

function showToast(message) {

  const toast = document.getElementById("toastMsg");

  if (!toast) {
    return;
  }

  toast.innerText = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


/* ================================================================
   THEMES
================================================================ */

function setTheme(theme) {

  document.body.setAttribute(
    "data-theme",
    theme
  );

  document
    .querySelectorAll(".themeBtn")
    .forEach((button) => {
      button.classList.remove("active");
    });


  if (theme === "dark") {

    document
      .getElementById("btnThemeDark")
      .classList.add("active");

  }


  if (theme === "light") {

    document
      .getElementById("btnThemeLight")
      .classList.add("active");

  }


  if (theme === "cyber") {

    document
      .getElementById("btnThemeCyber")
      .classList.add("active");

  }
}


/* ================================================================
   TAB ROUTING
================================================================ */

function switchTab(tabId) {

  document
    .querySelectorAll(".tabBtn")
    .forEach((button) => {
      button.classList.remove("active");
    });


  document
    .querySelectorAll(".panel")
    .forEach((panel) => {
      panel.classList.remove("active");
    });


  const tabButton =
    document.getElementById(`tab-${tabId}`);

  const panel =
    document.getElementById(`panel-${tabId}`);


  if (tabButton) {
    tabButton.classList.add("active");
  }

  if (panel) {
    panel.classList.add("active");
  }
}


/* ================================================================
   WORLD WORDS SEARCH
================================================================ */

async function executeWordSearch() {

  const input =
    document.getElementById("wordSearchInput");

  const statusLine =
    document.getElementById("wordsStatusLine");

  const container =
    document.getElementById("wordResultsContainer");


  if (!input || !statusLine || !container) {
    return;
  }


  const query =
    input.value.trim();


  if (!query) {
    return;
  }


  statusLine.innerText =
    `Searching definition for "${query}"…`;

  container.innerHTML = "";


  try {

    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`
    );


    const data =
      response.ok
        ? await response.json()
        : null;


    statusLine.innerText =
      `Query complete for "${query}".`;


    let html = `
      <div class="card">

        <div class="sectionLabel">
          ${escapeHtml(query.toUpperCase())}
        </div>
    `;


    if (data && data[0]) {

      const entry = data[0];


      entry.meanings?.forEach((meaning) => {

        const definition =
          meaning.definitions?.[0]?.definition || "";


        html += `
          <div style="margin-top:8px;">

            <span
              style="
                color:var(--accent);
                font-weight:600;
                font-size:11px;
                font-family:'Fira Code',monospace;
              "
            >
              [${escapeHtml(meaning.partOfSpeech || "unknown")}]
            </span>

            <div
              style="
                font-size:13px;
                margin-top:4px;
              "
            >
              ${escapeHtml(definition)}
            </div>

          </div>
        `;

      });

    } else {

      html += `
        <div
          style="
            font-size:12px;
            color:var(--text-dim);
          "
        >
          No direct dictionary definition found.
        </div>
      `;

    }


    html += `
      </div>
    `;


    container.innerHTML = html;


  } catch (error) {

    console.error(
      "Dictionary search error:",
      error
    );

    statusLine.innerText =
      "Error fetching search results.";

  }
}


/* ================================================================
   EMBED PLAYLIST
================================================================ */

function saveEmbedToPlaylist() {

  const titleInput =
    document.getElementById("embedTitleInput");

  const snippetInput =
    document.getElementById("embedSnippetInput");


  const title =
    titleInput.value.trim() ||
    "Untitled Embed";

  const snippet =
    snippetInput.value.trim();


  if (!snippet) {

    showToast(
      "Please paste valid iframe code"
    );

    return;
  }


  const newEmbed = {

    id: `emb_${Date.now()}`,

    title,

    snippet

  };


  embedPlaylist.unshift(
    newEmbed
  );


  localStorage.setItem(
    STORAGE_KEYS.EMBEDS,
    JSON.stringify(embedPlaylist)
  );


  titleInput.value = "";
  snippetInput.value = "";


  renderEmbedPlaylist();

  loadEmbedToPlayer(
    newEmbed.id
  );


  showToast(
    "Embed added to playlist"
  );
}


function renderEmbedPlaylist() {

  const container =
    document.getElementById(
      "embedPlaylistList"
    );


  if (!embedPlaylist.length) {

    container.innerHTML = `
      <div
        style="
          font-size:11px;
          color:var(--text-dim);
          font-family:'Fira Code',monospace;
        "
      >
        No embedded items saved in playlist.
      </div>
    `;

    return;
  }


  container.innerHTML =
    embedPlaylist
      .map((item, index) => {

        return `
          <div
            class="trackItem"
            data-embed-id="${escapeHtml(item.id)}"
          >

            <span>
              ${index + 1}.
              ${escapeHtml(item.title)}
            </span>

            <button
              class="ghost remove-embed-btn"
              data-embed-id="${escapeHtml(item.id)}"
              style="padding:2px 6px; font-size:10px;"
            >
              ✕
            </button>

          </div>
        `;

      })
      .join("");
}


function handlePlaylistClick(event) {

  const removeButton =
    event.target.closest(
      ".remove-embed-btn"
    );


  if (removeButton) {

    event.stopPropagation();

    const id =
      removeButton.dataset.embedId;

    removeEmbed(id);

    return;
  }


  const track =
    event.target.closest(
      ".trackItem"
    );


  if (track) {

    loadEmbedToPlayer(
      track.dataset.embedId
    );

  }
}


function loadEmbedToPlayer(id) {

  const item =
    embedPlaylist.find(
      (embed) => embed.id === id
    );


  if (!item) {
    return;
  }


  const viewer =
    document.getElementById(
      "embedViewer"
    );


  viewer.innerHTML =
    item.snippet;


  showToast(
    `Loaded: ${item.title}`
  );
}


function removeEmbed(id) {

  embedPlaylist =
    embedPlaylist.filter(
      (embed) => embed.id !== id
    );


  localStorage.setItem(
    STORAGE_KEYS.EMBEDS,
    JSON.stringify(embedPlaylist)
  );


  renderEmbedPlaylist();
}


/* ================================================================
   NATIVE AUDIO
================================================================ */

function handleAudioUpload(event) {

  const file =
    event.target.files?.[0];


  if (!file) {
    return;
  }


  if (!audioElement) {

    audioElement =
      new Audio();

  }


  audioElement.src =
    URL.createObjectURL(file);


  setupAudioContext();


  audioElement
    .play()
    .catch((error) => {

      console.error(
        "Audio playback error:",
        error
      );

    });


  document
    .getElementById("playBtn")
    .innerText = "Pause";
}


function setupAudioContext() {

  if (audioCtx) {

    if (
      audioCtx.state === "suspended"
    ) {

      audioCtx.resume().catch(() => {});

    }

    return;
  }


  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;


  if (!AudioContext) {

    showToast(
      "Web Audio is not supported."
    );

    return;
  }


  audioCtx =
    new AudioContext();


  analyserNode =
    audioCtx.createAnalyser();


  analyserNode.fftSize =
    128;


  audioSourceNode =
    audioCtx.createMediaElementSource(
      audioElement
    );


  audioSourceNode.connect(
    analyserNode
  );


  analyserNode.connect(
    audioCtx.destination
  );


  renderVisualizer();
}


function togglePlay() {

  if (!audioElement) {

    showToast(
      "Load an audio file first."
    );

    return;
  }


  if (audioElement.paused) {

    if (
      audioCtx &&
      audioCtx.state === "suspended"
    ) {

      audioCtx.resume().catch(() => {});

    }


    audioElement
      .play()
      .catch((error) => {

        console.error(
          "Audio playback error:",
          error
        );

      });


    document
      .getElementById("playBtn")
      .innerText = "Pause";


  } else {

    audioElement.pause();


    document
      .getElementById("playBtn")
      .innerText = "Play";

  }
}


function stopAudio() {

  if (!audioElement) {
    return;
  }


  audioElement.pause();

  audioElement.currentTime = 0;


  document
    .getElementById("playBtn")
    .innerText = "Play";
}


function renderVisualizer() {

  requestAnimationFrame(
    renderVisualizer
  );


  if (!analyserNode) {
    return;
  }


  const canvas =
    document.getElementById(
      "audioCanvas"
    );


  if (!canvas) {
    return;
  }


  const context =
    canvas.getContext("2d");


  if (
    canvas.width !==
    canvas.clientWidth
  ) {

    canvas.width =
      canvas.clientWidth;

  }


  if (
    canvas.height !==
    canvas.clientHeight
  ) {

    canvas.height =
      canvas.clientHeight;

  }


  const bufferLength =
    analyserNode.frequencyBinCount;


  const dataArray =
    new Uint8Array(
      bufferLength
    );


  analyserNode.getByteFrequencyData(
    dataArray
  );


  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  const barWidth =
    (canvas.width / bufferLength) * 2.5;


  let x = 0;


  for (
    let i = 0;
    i < bufferLength;
    i++
  ) {

    const barHeight =
      (dataArray[i] / 255) *
      canvas.height;


    context.fillStyle =
      "#00f2ff";


    context.fillRect(
      x,
      canvas.height - barHeight,
      barWidth,
      barHeight
    );


    x +=
      barWidth + 1;

  }
}


/* ================================================================
   AUDIO → FIELD NOTE TIMESTAMP
================================================================ */

function addTimestampToNote() {

  if (!audioElement) {

    showToast(
      "Load an audio file first."
    );

    return;
  }


  const seconds =
    audioElement.currentTime;


  const minutes =
    Math.floor(seconds / 60);


  const secs =
    Math.floor(seconds % 60);


  const timeString =
    `${minutes < 10 ? "0" : ""}${minutes}:` +
    `${secs < 10 ? "0" : ""}${secs}`;


  const textarea =
    document.getElementById(
      "noteBodyInput"
    );


  textarea.value +=
    `\n[${timeString}] `;


  switchTab("notes");

  textarea.focus();
}


/* ================================================================
   FIELD NOTES
================================================================ */

function saveNote() {

  const titleInput =
    document.getElementById(
      "noteTitleInput"
    );


  const bodyInput =
    document.getElementById(
      "noteBodyInput"
    );


  const title =
    titleInput.value.trim() ||
    "Untitled Note";


  const body =
    bodyInput.value.trim();


  if (!body) {

    showToast(
      "Cannot save an empty note"
    );

    return;
  }


  notesVault.unshift({

    id:
      `note_${Date.now()}`,

    title,

    body,

    updatedAt:
      new Date().toISOString()

  });


  localStorage.setItem(
    STORAGE_KEYS.NOTES,
    JSON.stringify(notesVault)
  );


  titleInput.value = "";

  bodyInput.value = "";


  renderNotes();


  showToast(
    "Note saved to vault"
  );
}


function renderNotes() {

  const container =
    document.getElementById(
      "notesContainer"
    );


  if (!notesVault.length) {

    container.innerHTML = `
      <div
        style="
          font-size:11px;
          color:var(--text-dim);
          font-family:'Fira Code',monospace;
        "
      >
        No field notes stored.
      </div>
    `;

    return;
  }


  container.innerHTML =
    notesVault
      .map((note) => {

        return `
          <div
            class="noteItem"
            data-note-id="${escapeHtml(note.id)}"
          >

            <div style="flex:1;">

              <div class="noteTitle">
                ${escapeHtml(note.title)}
              </div>

              <div class="notePreview">
                ${escapeHtml(note.body)}
              </div>

            </div>

            <button
              class="ghost delete-note-btn"
              data-note-id="${escapeHtml(note.id)}"
              style="padding:2px 6px; font-size:10px;"
            >
              ✕
            </button>

          </div>
        `;

      })
      .join("");
}


function handleNotesClick(event) {

  const deleteButton =
    event.target.closest(
      ".delete-note-btn"
    );


  if (!deleteButton) {
    return;
  }


  const id =
    deleteButton.dataset.noteId;


  deleteNote(id);
}


function deleteNote(id) {

  notesVault =
    notesVault.filter(
      (note) => note.id !== id
    );


  localStorage.setItem(
    STORAGE_KEYS.NOTES,
    JSON.stringify(notesVault)
  );


  renderNotes();
}


/* ================================================================
   HTML ESCAPING
================================================================ */

function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );
}
```
