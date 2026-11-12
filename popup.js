const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnView = document.getElementById("btn-view");
const counter = document.getElementById("counter");

function updateUI() {
  chrome.storage.local.get(["isRecording", "steps"], (data) => {
    const isRecording = !!data.isRecording;
    const count = (data.steps || []).length;

    btnStart.style.display = isRecording ? "none" : "block";
    btnStop.style.display = isRecording ? "block" : "none";
    counter.textContent = `${count} étape(s) enregistrée(s)`;
  });
}

btnStart.addEventListener("click", () => {
  chrome.storage.local.set({ isRecording: true, steps: [] }, () => {
    updateUI();
  });
});

btnStop.addEventListener("click", () => {
  chrome.storage.local.set({ isRecording: false }, () => {
    updateUI();
    chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
  });
});

btnView.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("viewer.html") });
});

updateUI();