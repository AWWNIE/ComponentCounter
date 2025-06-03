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

// Helper functions for Save Data
function updateSaveData(...dataset) {
	const lsData = JSON.parse(localStorage.getItem(appName)) || {};
	for (let data of dataset) {
		const name = Object.keys(data)[0];
		const value = Object.values(data)[0];
		// Data property exists, push to array
		if (name == "data") {
			// If data exists, append to array
			if (lsData[name] && value != localStorage.getItem("serenData")) {
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

function getSaveData(name) {
	const lsData = JSON.parse(localStorage.getItem(appName));
	return lsData ? lsData[name] : false;
}

// ----------
// BEGIN: Show input fields for Discord webhook and ID, if not already set
// ----------

function showDiscordConfigInputs() {
	// Create a container to hold both input fields and the save button
	const container = document.createElement("div");
	container.id = "discord-config-container";
	container.style.padding = "10px";
	container.style.backgroundColor = "#f9f9f9";
	container.style.borderBottom = "1px solid #ccc";

	// Webhook URL input
	const webhookLabel = document.createElement("label");
	webhookLabel.setAttribute("for", "discordWebhookInput");
	webhookLabel.textContent = "Discord Webhook URL:";
	webhookLabel.style.display = "block";
	webhookLabel.style.marginBottom = "4px";

	const webhookInput = document.createElement("input");
	webhookInput.type = "text";
	webhookInput.id = "discordWebhookInput";
	webhookInput.placeholder = "https://discord.com/api/webhooks/...";
	webhookInput.style.width = "100%";
	webhookInput.style.marginBottom = "10px";

	// Discord ID input
	const idLabel = document.createElement("label");
	idLabel.setAttribute("for", "discordIdInput");
	idLabel.textContent = "Discord User ID:";
	idLabel.style.display = "block";
	idLabel.style.marginBottom = "4px";

	const idInput = document.createElement("input");
	idInput.type = "text";
	idInput.id = "discordIdInput";
	idInput.placeholder = "Enter your Discord User ID";
	idInput.style.width = "100%";
	idInput.style.marginBottom = "10px";

	// Save button
	const saveButton = document.createElement("button");
	saveButton.textContent = "Save Settings";
	saveButton.style.padding = "8px 16px";
	saveButton.style.cursor = "pointer";
	saveButton.addEventListener("click", () => {
		const webhookValue = (document.getElementById("discordWebhookInput") as HTMLInputElement).value.trim();
		const idValue = (document.getElementById("discordIdInput") as HTMLInputElement).value.trim();

		if (!webhookValue || !idValue) {
			alert("Please enter both the Webhook URL and your Discord ID before saving.");
			return;
		}

		// Save to localStorage
		updateSaveData({ discordWebhook: webhookValue });
		updateSaveData({ discordId: idValue });

		// Remove the config inputs and re-initialize the app
		container.remove();
		initializeApp(); 
	});

	// Append elements to the container
	container.appendChild(webhookLabel);
	container.appendChild(webhookInput);
	container.appendChild(idLabel);
	container.appendChild(idInput);
	container.appendChild(saveButton);

	// Insert the container at the top of the body (before any other content)
	document.body.insertAdjacentElement("afterbegin", container);
}

function checkDiscordConfigAndStart() {
	const savedWebhook = getSaveData("discordWebhook");
	const savedId = getSaveData("discordId");

	if (!savedWebhook || !savedId) {
		// If either value is missing, show the input fields
		showDiscordConfigInputs();
	} else {
		// Both values exist, proceed with normal initialization
		initializeApp();
	}
// ----------
// END: Show input fields for Discord webhook and ID
// ----------
}

// Main initialization logic, runs only after Discord config is ensured
function initializeApp() {
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

				showSelectedChat(reader.pos);
				//build table from saved data, start tracking.
				showItems();
				setInterval(function () {
					readChatbox();
				}, 600);
			}
		}, 1000);
	}, 50);
}

// Reading and parsing info from the chatbox.
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
	return false;
}

function showItems() {
	itemList.querySelectorAll("li.item").forEach((el) => el.remove());
	itemTotal.innerHTML = getSaveData("data").length;

	if (getSaveData("mode") == "total") {
		listHeader.dataset.show = "history";
		listHeader.title = "Click to show History";
		listHeader.innerHTML = "Seren Item Totals";
		let total = getTotal();
		Object.keys(total)
			.sort()
			.forEach((item) => itemList.insertAdjacentHTML("beforeend", `<li class="list-group-item item">${item}: ${total[item]}</li>`));
	} else {
		listHeader.dataset.show = "total";
		listHeader.title = "Click to show Totals";
		listHeader.innerHTML = "Seren Item History";
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

function checkAnnounce(getItem) {
	// Use the saved webhook URL
	const webhookUrl = getSaveData("discordWebhook");
	if (webhookUrl) {
		fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				username: "Drop Tracker",
				content: `[${new Date(getItem.time).toLocaleString()}] Received - ${getItem.item}`,
			}),
		});
	}
}

// Function to determine the total of all items recorded.
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
		fileName = "serenTotalExport.csv";

		//Otherwise, export list by item and time received.
	} else {
		str = "Item,Time\n"; // column headers
		getSaveData("data").forEach((item) => {
			str = `${str}${item.item},${new Date(item.time).toLocaleString()}\n`;
		});
		fileName = "serenHistoryExport.csv";
	}
	var blob = new Blob([str], { type: "text/csv;charset=utf-8;" });
	var link
