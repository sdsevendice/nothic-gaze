const NOTHIC_MODULE_ID = "sd-nothic-gaze";
const NOTHIC_PACK_ID = "sd-nothic-gaze.adventure";
const NOTHIC_ADVENTURE_ID = "NothicGazeAdv001";

async function openNothicAdventureImporter() {
  if (!game.user.isGM) return;
  const pack = game.packs.get(NOTHIC_PACK_ID);
  const adventure = await pack?.getDocument(NOTHIC_ADVENTURE_ID);
  adventure?.sheet.render(true);
}

function nothicContentImported() {
  return game.journal.has("NTHJOURNALGM0001") && game.playlists.has("NTHMUSIC00000001");
}

const SKILLS = {
  acr: ["Акробатика", "Удержаться на ногах в сложной ситуации или выполнить акробатический трюк."],
  ani: ["Обращение с животными", "Успокоить или обучить животное либо заставить его вести себя определённым образом."],
  arc: ["Магия", "Вспомнить сведения о заклинаниях, магических предметах и планах существования."],
  ath: ["Атлетика", "Прыгнуть дальше обычного, удержаться на плаву в бурной воде или что-нибудь сломать."],
  dec: ["Обман", "Убедительно солгать или правдоподобно выдать себя за другого."],
  his: ["История", "Вспомнить сведения об исторических событиях, людях, народах и культурах."],
  ins: ["Проницательность", "Определить настроение и намерения другого существа."],
  itm: ["Запугивание", "Внушить страх или угрозами заставить кого-либо сделать то, чего вы хотите."],
  inv: ["Расследование", "Найти неочевидные сведения в книгах или понять, как что-либо устроено."],
  med: ["Медицина", "Определить болезнь или установить причину смерти недавно погибшего существа."],
  nat: ["Природа", "Вспомнить сведения о местности, растениях, животных и погоде."],
  prc: ["Внимание", "Используя органы чувств, заметить то, что легко упустить."],
  prf: ["Выступление", "Сыграть роль, рассказать историю, исполнить музыку или станцевать."],
  per: ["Убеждение", "Честно и учтиво убедить кого-либо в чём-либо."],
  rel: ["Религия", "Вспомнить сведения о богах, религиозных обрядах и священных символах."],
  slt: ["Ловкость рук", "Обчистить карман, незаметно спрятать небольшой предмет или выполнить ловкий трюк руками."],
  ste: ["Скрытность", "Остаться незамеченным, двигаясь бесшумно и прячась за укрытиями."],
  sur: ["Выживание", "Идти по следам, добывать пищу, находить путь или избегать природных опасностей."]
};

const GM_AUDIO = {
  music: "NTHMUSIC00000001",
  effects: "NTHSFX0000000001"
};

const GM_JOURNAL_PAGES = [
  ["Заказ и первый этаж", "JournalEntry.NTHJOURNALGM0001.JournalEntryPage.NTHPAGEGM0000002"],
  ["Библиотека", "JournalEntry.NTHJOURNALGM0001.JournalEntryPage.NTHPAGEGM0000003"],
  ["Лаборатория", "JournalEntry.NTHJOURNALGM0001.JournalEntryPage.NTHPAGEGM0000004"],
  ["Обсерватория", "JournalEntry.NTHJOURNALGM0001.JournalEntryPage.NTHPAGEGM0000005"],
  ["Правда и развязки", "JournalEntry.NTHJOURNALGM0001.JournalEntryPage.NTHPAGEGM0000006"],
  ["Блоки характеристик", "JournalEntry.NTHJOURNALGM0001.JournalEntryPage.NTHPAGEGM0000008"],
  ["Раздаточные материалы", "JournalEntry.NTHJOURNALHO0001"]
];

function skillTooltip([label, description]) {
  return `<section class="nothic-skill-tooltip"><header><h4>${label}</h4><span>НАВЫК</span></header><p>${description}</p></section>`;
}

function patchSkillTooltips(root = document) {
  const selector = '[data-reference-tooltip^="nothic-skill:"]';
  const elements = [];
  if (root?.matches?.(selector)) elements.push(root);
  if (root?.querySelectorAll) elements.push(...root.querySelectorAll(selector));

  for (const element of elements) {
    const key = element.dataset.referenceTooltip?.split(":")[1];
    const data = SKILLS[key];
    if (!data) continue;
    element.dataset.tooltip = skillTooltip(data);
    element.dataset.tooltipClass = "dnd5e2 nothic-skill-tooltip-container";
  }
}

function updateGmConsoleState() {
  const consoleElement = document.querySelector("#nothic-gm-console");
  if (!consoleElement) return;
  for (const button of consoleElement.querySelectorAll("[data-playlist][data-sound]")) {
    const sound = game.playlists.get(button.dataset.playlist)?.sounds.get(button.dataset.sound);
    button.classList.toggle("active", Boolean(sound?.playing));
    button.setAttribute("aria-pressed", String(Boolean(sound?.playing)));
  }
}

async function toggleGmSound(button) {
  const playlist = game.playlists.get(button.dataset.playlist);
  const sound = playlist?.sounds.get(button.dataset.sound);
  if (!playlist || !sound) {
    ui.notifications.error("Аудиофайл пульта мастера не найден.");
    return;
  }

  const isMusic = playlist.id === GM_AUDIO.music;
  if (sound.playing) await playlist.stopSound(sound);
  else {
    if (isMusic) await playlist.stopAll();
    await playlist.playSound(sound);
  }
  updateGmConsoleState();
}

async function stopGmAudio(kind) {
  const targets = kind === "all" ? Object.values(GM_AUDIO) : [GM_AUDIO[kind]];
  await Promise.all(targets.map(id => game.playlists.get(id)?.stopAll()).filter(Boolean));
  updateGmConsoleState();
}

async function openGmJournal(uuid) {
  const document = await fromUuid(uuid);
  if (!document) {
    ui.notifications.error("Страница журнала не найдена.");
    return;
  }
  const entry = document.documentName === "JournalEntryPage" ? document.parent : document;
  const pageId = document.documentName === "JournalEntryPage" ? document.id : undefined;
  const width = Math.min(1040, window.innerWidth - 80);
  const height = Math.min(820, window.innerHeight - 80);
  entry.sheet.render(true, {pageId, position:{width, height}});
}

function createGmConsole() {
  if (!game.user.isGM || document.querySelector("#nothic-gm-console")) return;
  const root = document.createElement("div");
  root.id = "nothic-gm-console";
  root.innerHTML = `
    <button type="button" class="nothic-gm-toggle" title="Открыть пульт мастера" aria-label="Открыть пульт мастера">
      <i class="fa-solid fa-sliders"></i><span>Пульт мастера</span>
    </button>
    <section class="nothic-gm-panel" hidden>
      <header><h3>Взгляд нотика</h3><button type="button" data-close aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="nothic-gm-section">
        <h4><i class="fa-solid fa-music"></i> Музыка</h4>
        <div class="nothic-gm-grid">
          <button type="button" data-playlist="${GM_AUDIO.music}" data-sound="NTHMUSCALM000001"><i class="fa-solid fa-leaf"></i> Спокойная</button>
          <button type="button" data-playlist="${GM_AUDIO.music}" data-sound="NTHMUSEXPLORE001"><i class="fa-solid fa-magnifying-glass"></i> Исследование</button>
          <button type="button" data-playlist="${GM_AUDIO.music}" data-sound="NTHMUSCOMBAT0001"><i class="fa-solid fa-skull"></i> Боевая</button>
          <button type="button" class="stop" data-stop="music"><i class="fa-solid fa-stop"></i> Стоп</button>
        </div>
      </div>
      <div class="nothic-gm-section">
        <h4><i class="fa-solid fa-volume-high"></i> Звуковые эффекты</h4>
        <div class="nothic-gm-grid">
          <button type="button" data-playlist="${GM_AUDIO.effects}" data-sound="NTHSFXFIREPLACE1"><i class="fa-solid fa-fire"></i> Камин</button>
          <button type="button" data-playlist="${GM_AUDIO.effects}" data-sound="NTHSFXFIREBALL01"><i class="fa-solid fa-burst"></i> Огненный шар</button>
          <button type="button" data-playlist="${GM_AUDIO.effects}" data-sound="NTHSFXELECTRIC01"><i class="fa-solid fa-bolt"></i> Электричество</button>
          <button type="button" class="stop" data-stop="effects"><i class="fa-solid fa-stop"></i> Стоп</button>
        </div>
      </div>
      <div class="nothic-gm-section">
        <h4><i class="fa-solid fa-book-open"></i> Книга мастера</h4>
        <div class="nothic-gm-journals">
          ${GM_JOURNAL_PAGES.map(([label, uuid]) => `<button type="button" data-journal="${uuid}">${label}</button>`).join("")}
        </div>
      </div>
      <button type="button" class="nothic-stop-all" data-stop="all"><i class="fa-solid fa-volume-xmark"></i> Остановить весь звук приключения</button>
    </section>`;
  document.body.append(root);

  const panel = root.querySelector(".nothic-gm-panel");
  const dragHandle = panel.querySelector(":scope > header");
  const savedPosition = localStorage.getItem("nothic-gm-console-position");
  if (savedPosition) {
    try {
      const { left, top } = JSON.parse(savedPosition);
      root.style.left = `${Math.max(0, Math.min(left, window.innerWidth - root.offsetWidth))}px`;
      root.style.top = `${Math.max(0, Math.min(top, window.innerHeight - 50))}px`;
      root.style.right = "auto";
    } catch (_error) {
      localStorage.removeItem("nothic-gm-console-position");
    }
  }

  dragHandle.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    const rect = root.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.top}px`;
    root.style.right = "auto";
    root.classList.add("dragging");
    dragHandle.setPointerCapture(event.pointerId);

    const move = moveEvent => {
      const left = Math.max(0, Math.min(moveEvent.clientX - offsetX, window.innerWidth - root.offsetWidth));
      const top = Math.max(0, Math.min(moveEvent.clientY - offsetY, window.innerHeight - 50));
      root.style.left = `${left}px`;
      root.style.top = `${top}px`;
    };
    const end = endEvent => {
      dragHandle.releasePointerCapture(endEvent.pointerId);
      dragHandle.removeEventListener("pointermove", move);
      dragHandle.removeEventListener("pointerup", end);
      dragHandle.removeEventListener("pointercancel", end);
      root.classList.remove("dragging");
      const finalRect = root.getBoundingClientRect();
      localStorage.setItem("nothic-gm-console-position", JSON.stringify({left:finalRect.left, top:finalRect.top}));
    };
    dragHandle.addEventListener("pointermove", move);
    dragHandle.addEventListener("pointerup", end);
    dragHandle.addEventListener("pointercancel", end);
  });
  dragHandle.addEventListener("dblclick", event => {
    if (event.target.closest("button")) return;
    localStorage.removeItem("nothic-gm-console-position");
    root.style.removeProperty("left");
    root.style.removeProperty("top");
    root.style.removeProperty("right");
  });
  root.querySelector(".nothic-gm-toggle").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) updateGmConsoleState();
  });
  root.querySelector("[data-close]").addEventListener("click", () => panel.hidden = true);
  root.addEventListener("click", event => {
    const audioButton = event.target.closest("[data-playlist][data-sound]");
    if (audioButton) return void toggleGmSound(audioButton);
    const stopButton = event.target.closest("[data-stop]");
    if (stopButton) return void stopGmAudio(stopButton.dataset.stop);
    const journalButton = event.target.closest("[data-journal]");
    if (journalButton) return void openGmJournal(journalButton.dataset.journal);
  });
  updateGmConsoleState();
}

Hooks.once("ready", async () => {
  if (!nothicContentImported()) {
    await openNothicAdventureImporter();
    return;
  }
  if (game.system.id !== "dnd5e") return;

  for (const [key, [label]] of Object.entries(SKILLS)) {
    const skill = CONFIG.DND5E.skills[key];
    if (!skill) continue;
    skill.label = label;
    skill.reference = `nothic-skill:${key}`;
  }

  patchSkillTooltips(document);
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) patchSkillTooltips(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  createGmConsole();
});

Hooks.on("renderApplicationV2", (_application, element) => {
  queueMicrotask(() => patchSkillTooltips(element));
});

Hooks.on("renderActorSheet", (_application, html) => {
  const element = html?.[0] ?? html;
  queueMicrotask(() => patchSkillTooltips(element));
});

Hooks.on("updatePlaylist", updateGmConsoleState);
Hooks.on("updatePlaylistSound", updateGmConsoleState);


Hooks.on("importAdventure", async adventure => {
  if (adventure.pack !== NOTHIC_PACK_ID) return;
  await new Promise(resolve => setTimeout(resolve, 250));
  createGmConsole();
  const start = game.scenes.get("WQI8kLWhiPoHY0W7");
  if (start && game.user.isGM) await start.activate();
  const journal = game.journal.get("NTHJOURNALGM0001");
  if (journal && game.user.isGM) journal.sheet.render(true, {pageId:"NTHPAGEGM0000002", position:{width:Math.min(1040, window.innerWidth-80), height:Math.min(820, window.innerHeight-80)}});
});
