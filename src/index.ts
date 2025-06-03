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

/**
 * --------------------------------------------------------------
 * Add Discord Webhook & ID input fields at the VERY TOP of the page,
 * before any other content is shown. When the user clicks "Save",
 * we run updateSaveData({ discordWebhook: ... }) and
 * updateSaveData({ discordId: ... }) and then remove the inputs.
 * --------------------------------------------------------------
 */

// ------------------------------------------------------------------------------------
// The rest of your existing code remains exactly as it was below this point.
// ------------------------------------------------------------------------------------

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
			if (getSaveData("discordWebhook")) {
				// discordWebhook already set
			} else {
				// add user input box 
				updateSaveData({ discordWebhook: "https://discord.com/api/webhooks/1379298168042160168/20HTHbg5K5uNLpuw_RCPoBMnHBEGjUAlqITpD02Qy0l8VCpWMs3U5Q6cBdrPt07aHyRP" });
			}
			if (getSaveData("discordID")) {
				// discordID already set
			} else {
				// add user input box 
				updateSaveData({ discordID: "600408294003048450" });
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
