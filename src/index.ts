// ─── Base imports & Setup ─────────────────────────────────────────────
import * as a1lib from "alt1";
import ChatboxReader, { ChatLine } from "alt1/chatbox";

// Tell webpack that this file relies on index.html, appconfig.json, icon.png, style.css.
// This makes sure those assets are emitted alongside main.js.
import "./index.html";
import "./appconfig.json";
import "./style.css";
import "./icon.png";

// ─── DOM References (moved here from index.html inline script) ───────────
const discordFormContainer = document.getElementById("discordFormContainer")!;
const discordFormFields = document.getElementById("discordFormFields")!;
const saveStatusContainer = document.getElementById("saveStatusContainer")!;
const mainContent = document.getElementById("mainContent")!;
const discordIdInput = document.getElementById("discordIdInput") as HTMLInputElement;
const discordWebhookInput = document.getElementById("discordWebhookInput") as HTMLInputElement;
const saveBtn = document.getElementById("saveDiscordBtn")!;
const loadSavedBtn = document.getElementById("loadSavedBtn")!;
const skipBtn = document.getElementById("skipDiscordBtn")!;
const bossNameSpan = document.getElementById("currentBossName")!;

// ─── Re‐export/updateSaveData & getSaveData (already existed) ────────────
const appName = "SerenTracker";

function updateSaveData(...dataset: any[]) {
  const lsData = JSON.parse(localStorage.getItem(appName) || "{}");
  for (let data of dataset) {
    const name = Object.keys(data)[0];
    const value = Object.values(data)[0];
    if (name === "data") {
      if (lsData[name] && value != localStorage.getItem("itemData")) {
        lsData[name].push(value);
        continue;
      } else if (Array.isArray(value)) {
        lsData[name] = value;
        continue;
      } else {
        lsData[name] = [];
        lsData[name].push(value);
        continue;
      }
    }
    lsData[name] = value;
  }
  localStorage.setItem(appName, JSON.stringify(lsData));
}

function getSaveData(name: string) {
  const lsData = JSON.parse(localStorage.getItem(appName) || "{}");
  return lsData[name] || false;
}

// Expose so other code (e.g. compiled inline or tests) can call them:
;(window as any).updateSaveData = updateSaveData;
;(window as any).getSaveData = getSaveData;

// ─── Chatbot + Reader setup (unchanged) ─────────────────────────────────
const itemList = document.querySelector(".itemList") as HTMLUListElement;
const chatSelector = document.querySelector(".chat") as HTMLSelectElement;
const exportButton = document.querySelector(".export") as HTMLButtonElement;
const clearButton = document.querySelector(".clear") as HTMLButtonElement;
const listHeader = document.querySelector(".header") as HTMLElement;
const itemTotal = document.getElementById("total")!;
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;
const reader = new ChatboxReader();

// Define the rare‐drop lists (unchanged) :contentReference[oaicite:1]{index=1}
const rareDropList = {
  Rasial: {
    items: [
      "Omni guard",
      "Soulbound lantern",
      "Crown of the First Necromancer",
      "Robe top of the First Necromancer",
      "Robe bottom of the First Necromancer",
      "Hand wrap of the First Necromancer",
      "Foot wraps of the First Necromancer"
    ]
  },
  Raksha: {
    items: [
      "Laceration boots",
      "Blast diffusion boots",
      "Fleeting boots",
      "Shadow spike",
      "Greater Ricochet ability codex",
      "Greater Chain ability codex",
      "Divert ability codex"
    ]
  }
};

// If inside Alt1, identify the app; otherwise, show a “click to install” li
if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const addappurl = `alt1://addapp/${new URL("./appconfig.json", document.location.href).href}`;
  const newEle = `<li>Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1</li>`;
  itemList.insertAdjacentHTML("beforeend", newEle);
}

// ─── showItems / getTotal / other core functions (unchanged) ────────────

// Function to determine the total of all items recorded.
function getTotal() {
  let total: Record<string, integer> = {};
  getSaveData("data").forEach((item: any) => {
    const data = item.item.split(" x ");
    total[data[1]] = parseInt(total[data[1]]) + parseInt(data[0]) || parseInt(data[0]);
  });
  return total;
}

function showItems() {
  itemList.querySelectorAll("li.item").forEach((el) => el.remove());
  itemTotal.innerHTML = String(getSaveData("data").length);

  if (getSaveData("mode") === "total") {
    listHeader.dataset.show = "history";
    listHeader.title = "Click to show History";
    listHeader.innerHTML = "Item Totals";
    const total = getTotal();
    Object.keys(total)
      .sort()
      .forEach((item) =>
        itemList.insertAdjacentHTML("beforeend", `<li class="list-group-item item">${item}: ${total[item]}</li>`)
      );
  } else {
    listHeader.dataset.show = "total";
    listHeader.title = "Click to show Totals";
    listHeader.innerHTML = "Item History";
    getSaveData("data")
      .slice()
      .reverse()
      .map((item: any) => {
        itemList.insertAdjacentHTML(
          "beforeend",
          `<li class="list-group-item item" title="${new Date(item.time).toLocaleString()}">${item.item}</li>`
        );
      });
  }
}

// ─── Extract / Normalize / Fetch GE Price & Thumbnail (unchanged) ────────
function extractItemName(str: string): string {
  const s = str.trim();
  const m = s.match(/^\s*\d+\s*x\s+(.+)$/i);
  return m ? m[1].trim() : s;
}

function normalizeAndCapitalize(itemName: string) {
  const lowerWithUnderscores = itemName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (lowerWithUnderscores.length === 0) {
    return "";
  }
  return lowerWithUnderscores.charAt(0).toUpperCase() + lowerWithUnderscores.slice(1);
}

function removeUnderscores(input: string): string {
  return input.replace(/_/g, " ");
}

async function fetchLatestPriceAndThumbnail(itemName: string): Promise<{
  price: number;
  thumbnailUrl: string;
}> {
  const normalized = normalizeAndCapitalize(itemName);
  const url = `https://api.weirdgloop.org/exchange/history/rs/latest?name=${normalized}`;
  const nonNormalized = removeUnderscores(normalized);

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "MyRS3App/Drop Tracker (Alt1)",
    },
  });

  if (!resp.ok) {
    throw new Error(`Error fetching GE data: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const id = data[nonNormalized]["id"];
  const price = data[nonNormalized]["price"];
  const thumbnailUrl = `https://secure.runescape.com/m=itemdb_rs/1748957839452_obj_big.gif?id=${id}`;
  return { price, thumbnailUrl };
}

// ─── Discord‐Announcement logic (unchanged) ──────────────────────────────
async function checkAnnounce(getItem: { item: string; time: Date }) {
  const webhook = getSaveData("discordWebhook");
  const userId = getSaveData("discordID");

  if (!webhook) {
    return;
  }

  const mention = userId ? `<@${userId}> ` : "";
  let price: number | null = null;
  let thumbnailUrl: string | null = null;

  try {
    const result = await fetchLatestPriceAndThumbnail(extractItemName(getItem.item));
    price = result.price;
    thumbnailUrl = result.thumbnailUrl;
  } catch (err) {
    console.error("Failed to fetch price/thumbnail:", err);
  }

  const killCount = " kill count goes here "; // Adjust as needed

  const embedPayload: any = {
    author: {
      name: "Runescape Drop Tracker",
      icon_url:
        "https://raw.githubusercontent.com/AWWNIE/ComponentCounter/refs/heads/main/readme-assets/embed_icon.png",
    },
    description: `You have received **${getItem.item}**!`,
    fields: [
      {
        name: getItem.item,
        value: price != null ? `${price} gp` : "Price unavailable",
        inline: true,
      },
      {
        name: "Kill Count",
        value: `${killCount}`,
        inline: true,
      },
    ],
    color: 0x8c00ff, // decimal 9175295
    footer: {
      text: "Obtained",
    },
    timestamp: getItem.time.toISOString(),
  };

  if (thumbnailUrl) {
    embedPayload.thumbnail = { url: thumbnailUrl };
  }

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Drop Tracker",
      content: mention,
      embeds: [embedPayload],
    }),
  });
}

// ─── Chat History / Boss‐Parsing logic (unchanged) ───────────────────────
function updateChatHistory(chatLine: string) {
  if (!sessionStorage.getItem(`${appName}chatHistory`)) {
    sessionStorage.setItem(`${appName}chatHistory`, `${chatLine}\n`);
    return;
  }
  const history = sessionStorage
    .getItem(`${appName}chatHistory` )!
    .split("\n");
  while (history.length > 100) {
    history.splice(0, 1);
  }
  history.push(chatLine.trim());
  sessionStorage.setItem(`${appName}chatHistory`, history.join("\n"));
}

function isInHistory(chatLine: string) {
  if (sessionStorage.getItem(`${appName}chatHistory`)) {
    for (const historyLine of sessionStorage
      .getItem(`${appName}chatHistory`)!
      .split("\n")) {
      if (historyLine.trim() === chatLine) {
        return true;
      }
    }
  }
  return false;
}

function handleBossNameParsing(chatLine: string) {
  let bossName = chatLine.substring(chatLine.indexOf(":") + 1);
  bossName = bossName.substring(bossName.indexOf(":") + 5);

  if (bossName.startsWith("Welcome to your session against")) {
    bossName = bossName.substring(bossName.indexOf(":") + 2);
    bossName = bossName.replace(/[.,;:]+$/, "");
    updateBossInfo(bossName, "N/A");
    updateChatHistory(chatLine);
  }
}

function handleBossKcParsing(chatLine: string) {
  let bossKc = chatLine.substring(chatLine.indexOf(":") + 1);
  bossKc = bossKc.substring(bossKc.indexOf(":") + 5);

  if (bossKc.startsWith("You have killed")) {
    bossKc = bossKc.replace("You have killed ", "");
    bossKc = bossKc.split(" ")[0];
    updateBossInfo(JSON.parse(localStorage.getItem("bossName") || '"No boss"'), bossKc);
    updateChatHistory(chatLine);
  }
}

function updateBossInfo(bossName: string, bossKc: string) {
  if (JSON.parse(localStorage.getItem("bossName") || '"No boss"') === bossName) {
    localStorage.setItem("bossKc", JSON.stringify(bossKc));
    return;
  }
  localStorage.setItem("bossName", JSON.stringify(bossName));
  localStorage.setItem("bossKc", JSON.stringify("N/A"));
}

function getCurrentBoss(): string {
  return JSON.parse(localStorage.getItem("bossName") || '"No boss"');
}

function getCurrentKc(): string {
  return JSON.parse(localStorage.getItem("bossKc") || '"N/A"');
}

// Expose globally, since the Boss‐polling interval uses it
;(window as any).getCurrentBoss = getCurrentBoss;

// ─── Factory Reset logic (unchanged) ────────────────────────────────────
clearButton.addEventListener("click", function () {
  localStorage.removeItem(appName);
  localStorage.setItem(appName, JSON.stringify({ chat: 0, data: [], mode: "history" }));
  location.reload();
});

// ─── "View" (history ↔ total toggle) logic (unchanged) ────────────────────
listHeader.addEventListener("click", function () {
  updateSaveData({ mode: this.dataset.show });
  showItems();
});

// ─── Initial Chatbox‐finding & polling loop (unchanged) ──────────────────
window.setTimeout(function () {
  const findChat = setInterval(function () {
    if (reader.pos === null) {
      reader.find();
    } else {
      clearInterval(findChat);
      reader.pos.boxes.map((box, i) => {
        chatSelector.insertAdjacentHTML("beforeend", `<option value=${i}>Chat ${i}</option>`);
      });

      chatSelector.addEventListener("change", function () {
        reader.pos.mainbox = reader.pos.boxes[this.value];
        showSelectedChat(reader.pos);
        updateSaveData({ chat: this.value });
        this.value = "";
      });

      if (getSaveData("chat")) {
        reader.pos.mainbox = reader.pos.boxes[getSaveData("chat")];
      } else {
        reader.pos.mainbox = reader.pos.boxes[0];
        updateSaveData({ chat: "0" });
      }

      showSelectedChat(reader.pos);
      showItems();
      setInterval(() => {
        readChatbox();
      }, 600);
    }
  }, 1000);
}, 50);

function readChatbox() {
  const opts = reader.read() || [];
  let chatStr = "";
  let chatArr: string[] = [];

  if (opts.length !== 0) {
    for (const line in opts) {
      if (!opts[line].text.match(timestampRegex) && line === "0") {
        continue;
      }
      if (opts[line].text.match(timestampRegex)) {
        if (Number(line) > 0) {
          chatStr += "\n";
        }
        chatStr += opts[line].text + " ";
        continue;
      }
      chatStr += opts[line].text;
    }
  }
  if (chatStr.trim() !== "") {
    chatArr = chatStr.trim().split("\n");
  }
  for (const line in chatArr) {
    const chatLine = chatArr[line].trim();
    if (isInHistory(chatLine)) {
      continue;
    }
    messageParser(chatLine);
  }
}

function messageParser(chatLine: string) {
  if (chatLine.indexOf("Seren spirit gifts you") > -1) {
    const item = chatLine.match(/\[\d+:\d+:\d+\] The Seren spirit gifts you: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
    if (item) updateDropData(chatLine, item);
  } else if (chatLine.indexOf("Materials gained") > -1) {
    const item = chatLine.match(/\[\d+:\d+:\d+\] Materials gained: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
    if (item) updateDropData(chatLine, item);
  } else if (chatLine.indexOf("Welcome to your session against") > -1) {
    handleBossNameParsing(chatLine);
  } else if (chatLine.indexOf("You have killed") > -1) {
    handleBossKcParsing(chatLine);
  } else {
    // Other special user drops
    if (chatLine.indexOf("EternalSong") > -1) {
      const item = chatLine.match(/\[\d+:\d+:\d+\] EternalSong: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
      if (item) updateDropData(chatLine, item);
    } else if (chatLine.indexOf("Awwnie") > -1) {
      const item = chatLine.match(/\[\d+:\d+:\d+\] Awwnie: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
      if (item) updateDropData(chatLine, item);
    } else if (chatLine.indexOf("Awwni") > -1) {
      const item = chatLine.match(/\[\d+:\d+:\d+\] Awwni: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
      if (item) updateDropData(chatLine, item);
    }
  }
}

function updateDropData(chatLine: string, itemMatch: RegExpMatchArray) {
  const getItem = {
    item: itemMatch[1].trim(),
    time: new Date(),
  };
  updateSaveData({ data: getItem });
  updateChatHistory(chatLine);
  checkAnnounce(getItem);
  showItems();
}

// ─── SHOW SELECTED CHAT (unchanged) ────────────────────────────────────
function showSelectedChat(chat: any) {
  try {
    alt1.overLayRect(
      a1lib.mixColor(0, 255, 255),
      chat.mainbox.rect.x,
      chat.mainbox.rect.y,
      chat.mainbox.rect.width,
      chat.mainbox.rect.height,
      2000,
      5
    );
  } catch {
    // ignore if overlay is not available
  }
}

// ─── Inline‐script logic (moved from index.html) ────────────────────────

const APP_INSTALL_URL = "https://awwnie.github.io/ComponentCounter/appconfig.json";

function bindInstallButton() {
  const installBtn = document.getElementById("installBtn");
  if (!installBtn) return;

  installBtn.addEventListener("click", () => {
    if (typeof alt1 !== "undefined" && typeof alt1.installApp === "function") {
      alt1.installApp(APP_INSTALL_URL).catch((err) => {
        console.error("alt1.installApp failed:", err);
        saveStatusContainer.textContent = "Failed to install via Alt1 API.";
      });
      return;
    }
    window.location.href = `alt1://addapp/${APP_INSTALL_URL}`;
  });
}

function showAlt1Error(type: "notInstalled" | "noPermission") {
  discordFormFields.style.display = "none";

  let messageText: string;
  if (type === "notInstalled") {
    messageText = "App is not installed through Alt1.";
  } else {
    messageText =
      "Required permissions not granted. Ensure gamestate, overlay, and pixel permissions are all enabled.";
  }

  saveStatusContainer.innerHTML = `
    <div class="fs-1 text-danger">❌</div>
    <div class="mt-2 text-white">${messageText}</div>
    <div class="mt-3">
      <button id="installBtn" class="btn btn-primary">Install</button>
    </div>
  `;
  saveStatusContainer.style.display = "block";
  bindInstallButton();
}

function showAlt1Success(callback: () => void) {
  discordFormFields.style.display = "none";
  saveStatusContainer.innerHTML = `
    <div class="fs-1 text-success">✅</div>
    <div class="mt-2 text-white">Alt1 is installed and all permissions granted:</div>
    <div class="text-start mt-2">
      <div class="text-white">✅ Alt1 installed</div>
      <div class="text-white">✅ Gamestate</div>
      <div class="text-white">✅ Overlay</div>
      <div class="text-white">✅ Pixel</div>
    </div>
  `;
  saveStatusContainer.style.display = "block";

  setTimeout(() => {
    saveStatusContainer.style.display = "none";
    callback();
  }, 2000);
}

function checkAlt1AndProceed(callback: () => void) {
  if (!window.alt1 || !alt1.permissionInstalled) {
    showAlt1Error("notInstalled");
    return;
  }
  if (!alt1.permissionGameState || !alt1.permissionOverlay || !alt1.permissionPixel) {
    showAlt1Error("noPermission");
    return;
  }
  showAlt1Success(callback);
}

// ─── On DOMContentLoaded: set up Discord‐form logic, Alt1 checks, polling ───
document.addEventListener("DOMContentLoaded", () => {
  // 1) Hide main content initially (CSS rule already did this).
  mainContent.style.display = "none";

  // 2) Show or hide “Load Saved” based on localStorage
  const storedId = localStorage.getItem("discordID");
  const storedWebhook = localStorage.getItem("discordWebhook");
  saveBtn.style.display = "block";
  loadSavedBtn.style.display = storedId && storedWebhook ? "block" : "none";

  // 3) Show “None” until getCurrentBoss returns something else
  bossNameSpan.textContent = "None";

  // 4) Alt1 sanity check on page load
  if (!window.alt1 || !alt1.permissionInstalled) {
    showAlt1Error("notInstalled");
    return;
  }
  if (!alt1.permissionGameState || !alt1.permissionOverlay || !alt1.permissionPixel) {
    showAlt1Error("noPermission");
    return;
  }
  // If we reach here, Alt1 is installed + all perms – keep Discord form visible

  // 5) Bind Load Saved
  loadSavedBtn.addEventListener("click", () => {
    checkAlt1AndProceed(() => {
      const storedId = localStorage.getItem("discordID") || "";
      const storedWebhook = localStorage.getItem("discordWebhook") || "";

      discordFormFields.style.display = "none";
      saveStatusContainer.innerHTML = `
        <div class="spinner-border text-white" role="status">
          <span class="visually-hidden">Loading…</span>
        </div>
      `;
      saveStatusContainer.style.display = "block";

      setTimeout(() => {
        const idValid = /^\d{18}$/.test(storedId);
        const webhookValid = storedWebhook.startsWith("https://discord.com/api/webhooks/");

        if (!idValid || !webhookValid) {
          let errorMessage = "";
          if (!idValid && !webhookValid) {
            errorMessage = "Invalid Discord ID and Discord Webhook.";
          } else if (!idValid) {
            errorMessage = "A valid Discord ID was not entered.";
          } else {
            errorMessage = "A valid Discord Webhook was not entered.";
          }

          saveStatusContainer.innerHTML = `
            <div class="fs-1 text-danger">❌</div>
            <div class="mt-2 text-white">${errorMessage}</div>
          `;

          setTimeout(() => {
            saveStatusContainer.style.display = "none";
            discordFormFields.style.display = "block";
          }, 2000);
        } else {
          updateSaveData({ discordID: storedId });
          updateSaveData({ discordWebhook: storedWebhook });

          saveStatusContainer.innerHTML = `
            <div class="fs-1 text-success">✅</div>
            <div class="mt-2 text-white">Loaded successfully</div>
          `;

          setTimeout(() => {
            discordFormContainer.style.display = "none";
            mainContent.style.display = "block";
          }, 2000);
        }
      }, 2000);
    });
  });

  // 6) Bind Save New Info
  saveBtn.addEventListener("click", () => {
    checkAlt1AndProceed(() => {
      const idValue = discordIdInput.value.trim();
      const webhookValue = discordWebhookInput.value.trim();

      const idValid = /^\d{18}$/.test(idValue);
      const webhookValid = webhookValue.startsWith("https://discord.com/api/webhooks/");

      if (!idValid || !webhookValid) {
        discordFormFields.style.display = "none";

        let errorMessage = "";
        if (!idValid && !webhookValid) {
          errorMessage = "Invalid Discord ID and Discord Webhook.";
        } else if (!idValid) {
          errorMessage = "A valid Discord ID was not entered.";
        } else {
          errorMessage = "A valid Discord Webhook was not entered.";
        }

        saveStatusContainer.innerHTML = `
          <div class="fs-1 text-danger">❌</div>
          <div class="mt-2 text-white">${errorMessage}</div>
        `;
        saveStatusContainer.style.display = "block";

        setTimeout(() => {
          saveStatusContainer.style.display = "none";
          discordFormFields.style.display = "block";
        }, 2000);
        return;
      }

      localStorage.setItem("discordID", idValue);
      localStorage.setItem("discordWebhook", webhookValue);
      loadSavedBtn.style.display = "block";
      updateSaveData({ discordID: idValue });
      updateSaveData({ discordWebhook: webhookValue });

      discordFormFields.style.display = "none";
      saveStatusContainer.innerHTML = `
        <div class="spinner-border text-white" role="status">
          <span class="visually-hidden">Saving…</span>
        </div>
      `;
      saveStatusContainer.style.display = "block";

      setTimeout(() => {
        const savedId = getSaveData("discordID");
        const savedWebhook = getSaveData("discordWebhook");
        const success = savedId && savedWebhook;

        if (success) {
          saveStatusContainer.innerHTML = `
            <div class="fs-1 text-success">✅</div>
            <div class="mt-2 text-white">Saved successfully</div>
          `;
        } else {
          saveStatusContainer.innerHTML = `
            <div class="fs-1 text-danger">❌</div>
            <div class="mt-2 text-white">Save failed</div>
          `;
        }

        setTimeout(() => {
          discordFormContainer.style.display = "none";
          mainContent.style.display = "block";
        }, 2000);
      }, 2000);
    });
  });

  // 7) Bind Skip Discord Integration
  skipBtn.addEventListener("click", () => {
    updateSaveData({ discordID: "" });
    updateSaveData({ discordWebhook: "" });
    discordFormContainer.style.display = "none";
    mainContent.style.display = "block";
  });

  // 8) Poll getCurrentBoss() every 600ms and update #currentBossName
  setInterval(() => {
    if (typeof getCurrentBoss === "function") {
      const boss = getCurrentBoss();
      if (boss && boss !== bossNameSpan.textContent) {
        bossNameSpan.textContent = boss;
      }
    }
  }, 600);
});
