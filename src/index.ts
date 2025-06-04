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
import "./css/style.css";
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
        a1lib.mixColor(8, 252, 4), // FC color
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
    if (chatLine.indexOf("Seren spirit gifts you") > -1) {
      let item = chatLine.match(/\[\d+:\d+:\d+\] The Seren spirit gifts you: (\d+ x [A-Za-z\s-&+'()1-4]+)/);

      let getItem = {
        item: item[1].trim(),
        time: new Date(),
      };
      console.log(getItem);
      updateSaveData({ data: getItem });
      updateChatHistory(chatLine);
      checkAnnounce(getItem);
      showItems();
    } else if (chatLine.indexOf("Materials Gained") > -1) {
      let item = chatLine.match(/\[\d+:\d+:\d+\] Materials Gained: (\d+ x [A-Za-z\s-&+'()1-4]+)/);

      let getItem = {
        item: item[1].trim(),
        time: new Date(),
      };
      console.log(getItem);
      updateSaveData({ data: getItem });
      updateChatHistory(chatLine);
      checkAnnounce(getItem);
      showItems();
    }
    else
    {
      let getItem = {
        item: chatLine[1].trim(),
        time: new Date(),
      };
      console.log(getItem);
      updateSaveData({ data: getItem });
      updateChatHistory(chatLine);
      checkAnnounce(getItem);
      showItems();
    }
  }
}

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
function checkAnnounce(getItem: { item: string; time: Date }) {
  const webhook = getSaveData("discordWebhook");
  const userId = getSaveData("discordID");

  if (!webhook) {
    return;
  }

  // If a Discord ID is stored, format it as a mention; otherwise, leave it blank.
  const mention = userId ? `<@${userId}> ` : "";

  // ─── Build the embed object ───────────────────────────────────────────────────
  // ** Replace `YOUR_PRICE_HERE` and `YOUR_KILLCOUNT_HERE` with real values if you have them.
  //    For now, those remain placeholders in the embed. **
  const dropName = getItem.item;        // e.g. "10 x Rune Essence"
  const price = "price";              // ← fill in dynamically if you track price somewhere
  const killCount = "kill count";     // ← fill in dynamically if you track kill count somewhere
  const discordThumbnailUrl =  "https://runescape.wiki/images/thumb/Uncharted_island_map_%28Deep_Sea_Fishing%29_detail.png/100px-Uncharted_island_map_%28Deep_Sea_Fishing%29_detail.png?ac6b0";

  const embedPayload = {
    author: {
      name: "Runescape Drop Tracker",
      icon_url:
        "https://raw.githubusercontent.com/AWWNIE/ComponentCounter/refs/heads/main/readme-assets/embed_icon.png",
    },
    description: `You have received **${dropName}**!`,
    fields: [
      {
        name: `${dropName}`,
        value: `${price}`,
        inline: true,
      },
      {
        name: "Kill Count",
        value: `${killCount}`,
        inline: true,
      },
    ],
    thumbnail: {
      url: discordThumbnailUrl,
    },
    color: 9175295, // 0x8c00ff in decimal
    footer: {
      text: "Obtained",
    },
    timestamp: getItem.time.toISOString(),
  };

  // ─── POST to Discord webhook ───────────────────────────────────────────────────
  fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "Drop Tracker",
      content: mention,          // if mention is empty, it just posts no extra text
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
