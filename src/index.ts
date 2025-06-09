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
const listHeader = document.getElementById("listHeader")!;

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
        // Following items are for beta purposes
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
  },
  ArchGlacor: {
    items: [
        // Following items are for beta purposes
        "Crystal key",
        "Crystal triskelion",
        "Crushed nest",
        "Water battlestaff",
        "Water talisman"
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

// Set Chat reader

reader.readargs = {
  colors: [
    a1lib.mixColor(0,   255, 255),  // Seren text color / [0, 255, 255]
    a1lib.mixColor(0,   255,   0),  // [0, 255, 0]
    a1lib.mixColor(0,   175, 255),  // [0, 175, 255]
    a1lib.mixColor(0,     0, 255),  // [0, 0, 255]
    a1lib.mixColor(255,  82,  86),  // [255, 82, 86]
    a1lib.mixColor(159, 255, 159),  // Clan chat green / [159, 255, 159]
    a1lib.mixColor(0,   111,   0),  // [0, 111, 0]
    a1lib.mixColor(255, 143, 143),  // [255, 143, 143]
    a1lib.mixColor(255, 152,  31),  // [255, 152, 31]
    a1lib.mixColor(255, 111,   0),  // [255, 111, 0]
    a1lib.mixColor(255, 255,   0),  // [255, 255, 0]
    a1lib.mixColor(239,   0, 175),  // [239, 0, 175]
    a1lib.mixColor(255,  79, 255),  // [255, 79, 255]
    a1lib.mixColor(175, 127, 255),  // [175, 127, 255]
    a1lib.mixColor(191, 191, 191),  // [191, 191, 191]
    a1lib.mixColor(127, 255, 255),  // [127, 255, 255]
    a1lib.mixColor(128,   0,   0),  // [128, 0, 0]
    a1lib.mixColor(255, 255, 255),  // Normal Text White / [255, 255, 255]
    a1lib.mixColor(127, 169, 255),  // [127, 169, 255]
    a1lib.mixColor(255, 140,  56),  // [255, 140, 56] (orange drop received text)
    a1lib.mixColor(255,   0,   0),  // Rare Mats / [255, 0, 0] (red achievement/world message)
    a1lib.mixColor( 69, 178,  71),  // [69, 178, 71] (blueish‐green friend broadcast)
    a1lib.mixColor(164, 153, 125),  // [164, 153, 125] (brownish‐gray friends/fc/cc list name)
    a1lib.mixColor(215, 195, 119),  // [215, 195, 119] (interface preset color)
    a1lib.mixColor(255, 255, 176),  // [255, 255, 176] (GIM exclusive?)
    a1lib.mixColor(245, 245,   0),  // Broach text colorMore actions
    a1lib.mixColor(255, 128,   0),  // Uncommon Mats
    a1lib.mixColor(255, 165,   0),  // Scavenging comps
    a1lib.mixColor(67, 188, 188),   // Ancient components
    a1lib.mixColor(0, 255, 0),
    a1lib.mixColor(0, 255, 255),
    a1lib.mixColor(0, 175, 255),
    a1lib.mixColor(0, 0, 255),
    a1lib.mixColor(255, 82, 86),
    a1lib.mixColor(159, 255, 159),
    a1lib.mixColor(0, 111, 0),
    a1lib.mixColor(255, 143, 143),
    a1lib.mixColor(255, 152, 31),
    a1lib.mixColor(255, 111, 0),
    a1lib.mixColor(255, 255, 0),
    a1lib.mixColor(239, 0, 175),
    a1lib.mixColor(255, 79, 255),
    a1lib.mixColor(175, 127, 255),
    a1lib.mixColor(191, 191, 191),
    a1lib.mixColor(127, 255, 255),
    a1lib.mixColor(128, 0, 0),
    a1lib.mixColor(255, 255, 255),
    a1lib.mixColor(127, 169, 255),
    a1lib.mixColor(255, 140, 56), //orange drop received text
    a1lib.mixColor(255, 0, 0), //red achievement world message
    a1lib.mixColor(69, 178, 71), //blueish green friend broadcast
    a1lib.mixColor(164, 153, 125), //brownish gray friends/fc/cc list name
    a1lib.mixColor(215, 195, 119), //interface preset color
    a1lib.mixColor(255, 255, 176), //gim exclusive?
    a1lib.mixColor(234, 145, 1),
    a1lib.mixColor(255, 255, 255), // Normal Text White
    a1lib.mixColor(130, 70, 184),  // Gorvek Purple
    a1lib.mixColor(159,255,159),   // Clan chat green
    a1lib.mixColor(255, 82, 86),   // PM Red
    a1lib.mixColor(255, 0, 0),     // Very Red Red
    a1lib.mixColor(0, 174, 0),     // Crystal Mask Green
    a1lib.mixColor(45, 184, 20),   // Completion Time Green
    a1lib.mixColor(67, 188, 188),  // Contribution Score Green
    a1lib.mixColor(102, 152, 255), // Notable Drops Blue
    a1lib.mixColor(235, 47, 47),   // Rot Mistake Red
    a1lib.mixColor(255, 255, 0),   // Blessing From The Gods Yellow
    a1lib.mixColor(0, 255, 255),   // Seren Spirit Cyan
    a1lib.mixColor(30, 255, 0),    // Catalyst Of Alteration Green
    a1lib.mixColor(127, 169, 255), // Public Chat Blue
    a1lib.mixColor(0, 255, 0),     // Artificer's Measure Green
    a1lib.mixColor(255, 112, 0),   // Luck Ring Orange
    a1lib.mixColor(163, 53, 238)   // Rare Drop Purple
  ],
};

// ─── showItems / getTotal / other core functions (unchanged) ────────────

// Function to determine the total of all items recorded.
function getTotal() {
  const total: Record<string, number> = {};

  getSaveData("data").forEach((item: any) => {
    // item.item is something like “3 x SomeRareDrop”
    const [qtyStr, name] = item.item.split(" x ");
    const qty = parseInt(qtyStr, 10);

    // If we’ve never seen this drop before, treat its current total as 0
    const prev = total[name] || 0;
    total[name] = prev + qty;
  });

  return total;
}

async function showItems() {
  // Remove any existing “item” lines
  itemList.querySelectorAll("li.item").forEach(el => el.remove());

  // Update the total-count display
  itemTotal.innerHTML = String(getSaveData("data").length);

  // “Total” mode: list aggregated totals by item name
  if (getSaveData("mode") === "total") {
    listHeader.dataset.show = "history";
    listHeader.title = "Click to show History";
    listHeader.innerHTML = "Item Totals";

    const totalCounts = getTotal();
    Object.keys(totalCounts)
      .sort()
      .forEach(itemName => {
        itemList.insertAdjacentHTML(
          "beforeend",
          `<li class="list-group-item item">${itemName}: ${totalCounts[itemName]}</li>`
        );
      });
  }
  // “History” mode: show each drop in reverse chronological order, including time & price
  else {
    listHeader.dataset.show = "total";
    listHeader.title = "Click to show Totals";
    listHeader.innerHTML = "Recent History";

    // We take a snapshot of saved data, reverse it, then iterate
    const allDrops = getSaveData("data").slice().reverse();

    for (const entry of allDrops) {
      const rawName = extractItemName(entry.item);
      let priceText = "--";
      try {
        // Fetch the latest GE price for this item (gp)
        console.log(rawName);
        const { price } = await fetchLatestPriceAndThumbnail(rawName);
        priceText = `${price.toLocaleString()} gp`;
      } catch {
        // If fetch fails, we simply leave “--”
      }

      // Format time as HH:MM:SS (e.g. “14:23:05”)
      const foundTime = new Date(entry.time).toLocaleTimeString();

      // Insert a single <li> with item name, price, and time (aligned right)
      itemList.insertAdjacentHTML(
        "beforeend",
        `<li class="list-group-item item d-flex justify-content-between align-items-center">
           <span>${entry.item}</span>
           <span style="font-size:0.85rem; color:#aaaaaa;">
             ${priceText} @ ${foundTime}
           </span>
         </li>`
      );
    }
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
/*
async function updateCacheBuster()
{
  fetch("https://runeapps.org/apps/ge/browse.php")
      .then(res => res.text())
      .then(html => {
        // Define a regex that looks for "a=12/" followed by any characters up to "_obj"
        const firstMatch = html.match(/a=12\/(.*?)_obj/);
        if (firstMatch && firstMatch[1]) {
          console.log("Cache buster fetched: " + firstMatch[1]);
          localStorage.setItem("cacheBuster", JSON.stringify(firstMatch[1]));
          // → e.g. "1749130146243" (whatever the first found ID is)
        } else {
          console.log("No 'a=12/..._obj' pattern found in page.");
          return null;
        }
      })
      .catch(err => {
        console.error("Failed to fetch page:", err);
      });
}
*/
function fetchCurrentCacheBuster()
{
  return JSON.parse(localStorage.getItem("cacheBuster") || '"NULL"');
}

async function fetchLatestPriceAndThumbnail(itemName: string): Promise<{
  price: number;
  thumbnailUrl: string;
}> {
  const normalized = normalizeAndCapitalize(itemName);
  const url = `https://api.weirdgloop.org/exchange/history/rs/latest?name=${normalized}`;
  const nonNormalized = removeUnderscores(normalized);
  const cacheBuster = fetchCurrentCacheBuster();

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "MyRS3App/Drop Tracker (Alt1)",
    },
  });

  if (!resp.ok) {
    throw new Error(`Error fetching GE data from WeirdGloop: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  console.log(data);
  const id = data[nonNormalized]["id"];
  console.log(id);
  const price = data[nonNormalized]["price"];
  /*
  const url2 = `https://secure.runescape.com/m=itemdb_rs/api/catalogue/detail.json?item=${id}`;
  const response = await fetch(url2);
  if (!response.ok) {
    throw new Error(`Failed to fetch item data from RS API: (status ${response.status})`);
  }
  const data2: {
    item: {
      icon_large: string;
    };
  } = await response.json();
  const thumbnailUrl = data2.item.icon_large;
  */
  const thumbnailUrl = `https://raw.githubusercontent.com/AWWNIE/awwnie.github.io/refs/heads/main/${id}.png`;
  console.log(thumbnailUrl);
  
  return { price, thumbnailUrl };
}

// ─── Discord‐Announcement logic (unchanged) ──────────────────────────────
async function checkAnnounce(getItem: { item: string; time: Date }, bossDrop: boolean = false) {
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

  let killCount = "N/A";

  if(bossDrop)
  {
    killCount = getCurrentKc();
  }


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

function handleBossDrops(chatLine) {
  console.log(chatLine);
  const indexOfFirst = chatLine.indexOf("You receive:");
  console.log(indexOfFirst);
  // 13 is the length of "You receive: "
  const bossitem = chatLine.slice(indexOfFirst + 13, chatLine.lastIndexOf());
  console.log(("Drop item string: " + bossitem));
  const getItem = {
    item: bossitem,
    time: new Date(),
  };

  updateSaveData({ data: getItem });
  updateChatHistory(chatLine);

  Object.entries(rareDropList).forEach(([boss, data]) => {
    data.items.forEach(item => {
      if(bossitem.includes(item))
        console.log("Item found: " + bossitem)
        checkAnnounce(getItem, true);
    });
  });

  // showItems now is async, but we don’t need to await it here;
  // it will update the list once the price fetches complete.
  showItems();
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

  for (const line in opts) {
    console.log(opts[line].text);
  }

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
  } else if (chatLine.indexOf("You receive") > -1) {
    console.log("Boss drop detected");
    handleBossDrops(chatLine);
  } else if (chatLine.indexOf("Welcome to your session against") > -1) {
    handleBossNameParsing(chatLine);
  } else if (chatLine.indexOf("You have killed") > -1) {
    handleBossKcParsing(chatLine);
  } else {
    // Just log everything. Could be useful for debugging.
    console.log(chatLine);
    /*
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
     */
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

  // showItems now is async, but we don’t need to await it here;
  // it will update the list once the price fetches complete.
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
    if (
      typeof alt1 !== "undefined" &&
      typeof (alt1 as any).installApp === "function"
    ) {
      (alt1 as any)
        .installApp(APP_INSTALL_URL)
        .catch((err: any) => {
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

  // Update cachebuster to be used
  // updateCacheBuster();

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

            // ─── Once mainContent is visible, populate the list for the first time ──────────────────
            showItems();
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

          // ─── Once mainContent is visible, populate the list for the first time ──────────────────
          showItems();
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

    // ─── Once mainContent is visible (after skip), populate the list initially ────────────────
    showItems();
  });

  // ─── NEW / ADDED: Bind “#listHeader” click to toggle between “total” & “history” ───────────────
  if (listHeader) {
    listHeader.addEventListener("click", () => {
      const newMode = getSaveData("mode") === "total" ? "history" : "total";
      updateSaveData({ mode: newMode });
      showItems();
    });
  } else {
    console.warn("⚠️ Could not find listHeader in the DOM!");
  }

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
