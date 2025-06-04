// alt1 base libs, provides all the commonly used methods for image matching and capture 
// also gives your editor info about the window.alt1 api
import * as a1lib from "alt1";
import ChatboxReader, { ChatLine } from "alt1/chatbox";

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import "./index.html";
import "./appconfig.json";
import "./style.css";
import "./icon.png";

const itemList = document.querySelector(".itemList");
const chatSelector = document.querySelector(".chat");
const exportButton = document.querySelector(".export");
const clearButton = document.querySelector(".clear");
const listHeader = document.querySelector(".header") as HTMLElement;
const itemTotal = document.getElementById("total");
const appColor = a1lib.mixColor(0, 255, 255);
const timestampRegex = /\[\d{2}:\d{2}:\d{2}\]/g;
const reader = new ChatboxReader();
const appName = "SerenTracker";

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

//check if we are running inside alt1 by checking if the alt1 global exists
if (window.alt1) {
  //tell alt1 about the app
  //this makes alt1 show the add app button when running inside the embedded browser
  //also updates app settings if they are changed
  alt1.identifyAppUrl("./appconfig.json");
} else {
  let addappurl = `alt1://addapp/${new URL("./appconfig.json", document.location.href).href}`;
  let newEle = `<li>Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1</li>`;
  itemList.insertAdjacentHTML("beforeend", newEle);
}

// Set Chat reader
reader.readargs = {
	colors: [
		a1lib.mixColor(0, 255, 255), //Seren text color
		a1lib.mixColor(245, 245, 0), //Broach text color
		a1lib.mixColor(255, 128, 0), //Uncommon Mats
		a1lib.mixColor(255, 165, 0), //Scavenging comps
		a1lib.mixColor(255, 0, 0), //Rare Mats
		a1lib.mixColor(67, 188, 188), //Ancient components
		a1lib.mixColor(255, 255, 255), // Normal Text White
   	 	a1lib.mixColor(159,255,159),   // Clan chat green
        a1lib.mixColor(147, 245, 148), //raksha idle messaging
        a1lib.mixColor(255, 255, 0) // wilderness flash events + guthix cache
	],
};

window.setTimeout(function () {
  //Find all visible chatboxes on screen
  let findChat = setInterval(function () {
    if (reader.pos === null) reader.find();
    else {
      clearInterval(findChat);
      reader.pos.boxes.map((box, i) => {
        chatSelector.insertAdjacentHTML("beforeend", `<option value=${i}>Chat ${i}</option>`);
      });

      // Add logic to switch chatboxes
      chatSelector.addEventListener("change", function () {
        reader.pos.mainbox = reader.pos.boxes[this.value];
        showSelectedChat(reader.pos);
        updateSaveData({ chat: this.value });
        this.value = "";
      });

      if (getSaveData("chat")) {
        reader.pos.mainbox = reader.pos.boxes[getSaveData("chat")];
      } else {
        //If multiple boxes are found, this will select the first, which should be the top-most chat box on the screen.
        reader.pos.mainbox = reader.pos.boxes[0];
        updateSaveData({ chat: "0" });
      }

      showSelectedChat(reader.pos);
      //build table from saved data, start tracking.
      showItems();
      setInterval(function () {
        readChatbox();
      }, 600);
    }
  }, 1000);
}, 50);

//Reading and parsing info from the chatbox.
function readChatbox() {
  var opts = reader.read() || [];
  var chatStr = "";
  var chatArr;

  if (opts.length != 0) {
    for (let line in opts) {
      //Filter out the first chat[line], if it has no timestamp.  This is probably from a screen reload.
      //Check if no timestamp exists, and it's the first line in the chatreader.
      if (!opts[line].text.match(timestampRegex) && line == "0") {
        continue;
      }
      // Beginning of chat line
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
  if (chatStr.trim() != "") {
    chatArr = chatStr.trim().split("\n");
  }
  for (let line in chatArr) {
    let chatLine = chatArr[line].trim();
    if (isInHistory(chatLine)) {
      continue;
    }
    messageParser(chatLine);
  }
}

function messageParser(chatLine)
{
  if (chatLine.indexOf("Seren spirit gifts you") > -1) {
    console.log("Detected Seren spirit message!");
    let item = chatLine.match(/\[\d+:\d+:\d+\] The Seren spirit gifts you: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
    updateDropData(chatLine, item);

  } else if (chatLine.indexOf("Materials gained") > -1) {
    console.log("Detected material message!");
    let item = chatLine.match(/\[\d+:\d+:\d+\] Materials gained: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
    updateDropData(chatLine, item);
  }
  else if(chatLine.indexOf("Welcome to your session against") > -1) {
    console.log("Detected boss instance!");
    console.log("Message is: " + chatLine);
    let str = chatLine;
    for(let i = 0; i < 3; i++)
    {
      str = str.substring(chatLine.indexOf(':') + 1)
    }
    console.log("Boss is: " + str);

    // let item = chatLine.match(/\[\d+:\d+:\d+\] Welcome to your session against: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
    // console.log("Detected message: " + item);
    handleBossParsing(chatLine, str);
  }
  else {
    console.log(chatLine);
    if (chatLine.indexOf("EternalSong") > -1) {
      console.log("Detected EternalSong");
      let item = chatLine.match(/\[\d+:\d+:\d+\] EternalSong: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
      updateDropData(chatLine, item);
    } else if (chatLine.indexOf("Awwnie") > -1) {
      console.log("Detected Awwnie");
      let item = chatLine.match(/\[\d+:\d+:\d+\] Awwnie: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
      updateDropData(chatLine, item);
    } else if (chatLine.indexOf("Awwni") > -1) {
      console.log("Detected Awwni");
      let item = chatLine.match(/\[\d+:\d+:\d+\] Awwni: (\d+ x [A-Za-z\s-&+'()1-4]+)/);
      updateDropData(chatLine, item);
    }
  }
}

function updateDropData(chatLine, item)
{
  console.log("Logging chatline: " + chatLine);
  console.log("Logging item: " + item);

  let getItem = {
    item: item[1].trim(),
    time: new Date(),
  };
  console.log("Logging getItem: " + getItem);
  updateSaveData({ data: getItem });
  updateChatHistory(chatLine);
  checkAnnounce(getItem);
  showItems();
}

function handleBossParsing(chatLine, bossName)
{
  bossName = bossName.replace(/[.,;:]+$/, "");
  console.log("Parsed boss name:" + bossName);
  updateChatHistory(chatLine);
  updateBossInfo(bossName);
}

function updateBossInfo(chatLine)
{
  localStorage.setItem("bossName", JSON.stringify(chatLine));
}

function getCurrentBoss()
{
  JSON.parse(localStorage.getItem("bossName") || '"No boss"')
}

// Make sure it’s exposed globally so our inline HTML script can see it:
(window as any).getCurrentBoss = getCurrentBoss;

function updateChatHistory(chatLine) {
  if (!sessionStorage.getItem(`${appName}chatHistory`)) {
    sessionStorage.setItem(`${appName}chatHistory`, `${chatLine}\n`);
    return;
  }
  var history = sessionStorage.getItem(`${appName}chatHistory`).split("\n");
  while (history.length > 100) {
    history.splice(0, 1);
  }
  history.push(chatLine.trim());
  sessionStorage.setItem(`${appName}chatHistory`, history.join("\n"));
}

function isInHistory(chatLine) {
  if (sessionStorage.getItem(`${appName}chatHistory`)) {
    for (let historyLine of sessionStorage.getItem(`${appName}chatHistory`).split("\n")) {
      if (historyLine.trim() == chatLine) {
        return true;
      }
    }
  }
  return false;
}



function extractItemName(str) {
  const s = str.trim();
  const m = s.match(/^\s*\d+\s*x\s+(.+)$/i);
  return m ? m[1].trim() : s;
}

function normalizeAndCapitalize(itemName) {
  // 1) Trim whitespace and convert all characters to lowercase,
  //    then replace one‐or‐more spaces/tabs/etc. with a single underscore.
  const lowerWithUnderscores = itemName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  // 2) Uppercase only the first letter, keep the rest exactly as-is (lowercase + underscores).
  if (lowerWithUnderscores.length === 0) {
    return "";
  }
  return (
    lowerWithUnderscores.charAt(0).toUpperCase() +
    lowerWithUnderscores.slice(1)
  );
}

function removeUnderscores(input: string): string {
  return input.replace(/_/g, " ");
}

/**
 * Fetches the latest GE price + thumbnail URL for any given item name.
 */
async function fetchLatestPriceAndThumbnail(itemName: string): Promise<{
  price: number;
  thumbnailUrl: string;
}> {
  // Normalize name → underscores
  const normalized = normalizeAndCapitalize(itemName);
  const url = `https://api.weirdgloop.org/exchange/history/rs/latest?name=${normalized}`;
  const nonNormalized = removeUnderscores(normalized)
	
  const resp = await fetch(url, {
    headers: {
      // Descriptive UA for WeirdGloop
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

function showItems() {
  itemList.querySelectorAll("li.item").forEach((el) => el.remove());
  itemTotal.innerHTML = getSaveData("data").length;

  if (getSaveData("mode") == "total") {
    listHeader.dataset.show = "history";
    listHeader.title = "Click to show History";
    listHeader.innerHTML = "Item Totals";
    let total = getTotal();
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
      .map((item) => {
        itemList.insertAdjacentHTML(
          "beforeend",
          `<li class="list-group-item item" title="${new Date(item.time).toLocaleString()}">${item.item}</li>`
        );
      });
  }
}

/**
 * ─── UPDATED checkAnnounce ───
 *
 * Instead of sending a plain-text content to Discord, we now build a proper "embed" payload.
 * Make sure your webhook has permission to post embeds (it should, by default).
 * 
 * In this example, we use:
 *   • author.name:  "Runescape Drop Tracker"
 *   • author.icon_url:  (same icon URL that you had in your original EmbedBuilder snippet)
 *   • description:  "You have received {Drop Name}!"
 *   • fields:  
 *       • { name: "{Drop Name}", value: "{price}", inline: true }
 *       • { name: "Kill Count",    value: "{kill count}", inline: true }
 *   • thumbnail: (unchanged URL you provided)
 *   • color:   0x8c00ff   (decimal 9175295)
 *   • footer.text:   "Obtained"
 *   • timestamp:     ISO string for getItem.time 
 *
 * NOTE: Because this is running *inside Alt1 (a browser-like environment), we simply
 *       construct the JSON object manually and POST it to the webhook URL. 
 */
async function checkAnnounce(getItem: { item: string; time: Date}) {
  const webhook = getSaveData("discordWebhook");
  const userId = getSaveData("discordID");

  if (!webhook) {
    return;
  }

  // If a Discord ID is stored, format it as a mention; otherwise, leave it blank.
  const mention = userId ? `<@${userId}> ` : "";

  // Build the embed fields—price/thumbnail require awaiting the async function:
  let price: number | null = null;
  let thumbnailUrl: string | null = null;

  try {
    const result = await fetchLatestPriceAndThumbnail(extractItemName(getItem.item));
    price = result.price;
    thumbnailUrl = result.thumbnailUrl;
  } catch (err) {
    console.error("Failed to fetch price/thumbnail:", err);
    // If you want to fall back to a placeholder (or simply omit fields), you can do so here.
    // For now, we’ll leave price & thumbnailUrl as null if it fails.
  }

  // Fill in killCount however you track it:
  const killCount = " kill count goes here ";

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
        // If price lookup failed, show “Unavailable” instead of “null”
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

  // Only add thumbnail section if we successfully fetched one:
  if (thumbnailUrl) {
    embedPayload.thumbnail = { url: thumbnailUrl };
  }

  // ─── POST to Discord webhook ───────────────────────────────────────────────────
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Drop Tracker",
      content: mention, // mention will be “<@ID> ” or empty string
      embeds: [embedPayload],
    }),
  });
}

//Function to determine the total of all items recorded.
function getTotal() {
  let total = {};
  getSaveData("data").forEach((item) => {
    let data = item.item.split(" x ");
    total[data[1]] = parseInt(total[data[1]]) + parseInt(data[0]) || parseInt(data[0]);
  });
  return total;
}

exportButton.addEventListener("click", function () {
  var str, fileName;
  //If totals is checked, export totals
  if (getSaveData("mode") == "total") {
    str = "Qty,Item\n";
    let total = getTotal();
    Object.keys(total)
      .sort()
      .forEach((item) => (str = `${str}${total[item]},${item}\n`));
    fileName = "itemTotalExport.csv";

    //Otherwise, export list by item and time received.
  } else {
    str = "Item,Time\n"; // column headers
    getSaveData("data").forEach((item) => {
      str = `${str}${item.item},${new Date(item.time).toLocaleString()}\n`;
    });
    fileName = "serenHistoryExport.csv";
  }
  var blob = new Blob([str], { type: "text/csv;charset=utf-8;" });
  var link = document.createElement("a");
  if (link.download !== undefined) {
    // feature detection
    // Browsers that support HTML5 download attribute
    var url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});

// Factory Reset logic
clearButton.addEventListener("click", function () {
  localStorage.removeItem(appName);
  localStorage.setItem(appName, JSON.stringify({ chat: 0, data: [], mode: "history" }));
  location.reload();
});

// "View" logic
listHeader.addEventListener("click", function () {
  updateSaveData({ mode: this.dataset.show });
  showItems();
});

function showSelectedChat(chat) {
  //Attempt to show a temporary rectangle around the chatbox.  skip if overlay is not enabled.
  try {
    alt1.overLayRect(
      appColor,
      chat.mainbox.rect.x,
      chat.mainbox.rect.y,
      chat.mainbox.rect.width,
      chat.mainbox.rect.height,
      2000,
      5
    );
  } catch {}
}

/*
TODO:
- New Save Data format - DONE
  - appName - Object that contains all specific values for app
    - data - Tracked Items
    - chat - Selected Chat Window
    - total - Rename to mode - Selected data display mode.
- Convert existing data into new format - DONE
- Continue to tidy code, create pure functions, etc.
- Look into only keeping the relavent SerenSpirit line in chatHistory. - DONE
*/

(function () {
  // Fresh install, initialize Save Data
  if (
    !localStorage.getItem("itemData") &&
    !localStorage.getItem("itemTotal") &&
    !localStorage.getItem("itemChat") &&
    !localStorage.getItem("bossName") &&
    !localStorage.getItem(appName)
  ) {
    localStorage.setItem(appName, JSON.stringify({ chat: 0, data: [], mode: "history" }));
    location.reload();
  }

  // Convert old localStorage save data to new format.  Keep itemData entry just in case.
  if (localStorage.getItem("itemData")) {
    updateSaveData({ data: JSON.parse(localStorage.getItem("itemData")) });
    localStorage.setItem("itemDataBackup", localStorage.getItem("itemData"));
    localStorage.removeItem("itemData");
  }
  if (localStorage.getItem("itemTotal")) {
    updateSaveData({ mode: localStorage.getItem("itemTotal") });
    localStorage.removeItem("itemTotal");
  }
  if (localStorage.getItem("itemChat")) {
    updateSaveData({ chat: localStorage.getItem("itemChat") });
    localStorage.removeItem("itemChat");
  }
  if (localStorage.getItem("bossName")) {
    updateSaveData({ chat: localStorage.getItem("bossName") });
    localStorage.removeItem("bossName");
  }
})();

function updateSaveData(...dataset) {
  const lsData = JSON.parse(localStorage.getItem(appName)) || {};
  for (let data of dataset) {
    const name = Object.keys(data)[0];
    const value = Object.values(data)[0];
    // Data property exists, push to array
    if (name == "data") {
      // If data exists, append to array
      if (lsData[name] && value != localStorage.getItem("itemData")) {
        lsData[name].push(value);
        continue;
      }
      // data doesn't exist, if importing from old data (passed in array), set data to array
      else if (Array.isArray(value)) {
        lsData[name] = value;
        continue;
      }
      // data doesn't exist, initialize data with array, append new value to data.
      lsData[name] = [];
      lsData[name].push(value);
      continue;
    }
    lsData[name] = value;
  }
  localStorage.setItem(appName, JSON.stringify(lsData));
}

function getSaveData(name: string) {
  const lsData = JSON.parse(localStorage.getItem(appName));
  return lsData[name] || false;
}

// ─── ADD THESE LINES ───
// Expose these functions globally so index.html’s inline script can call them:
;(window as any).updateSaveData = updateSaveData;
;(window as any).getSaveData = getSaveData;
