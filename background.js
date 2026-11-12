let captureQueue = Promise.resolve();

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "RECORD_CLICK") {
    const { x, y, viewportWidth, viewportHeight, description, url, timestamp } = request.payload;
    const windowId = sender.tab ? sender.tab.windowId : null;

    captureQueue = captureQueue.then(() => new Promise((resolve) => {
      // 1. Capture immédiate au moment exact du clic (t = 0s)
      chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 85 }, async (beforeDataUrl) => {
        if (chrome.runtime.lastError || !beforeDataUrl) {
          resolve();
          return;
        }

        // Attendre 500 ms (0.5s) pour capturer l'ouverture du menu déroulant / réaction UI
        await new Promise((r) => setTimeout(r, 500));

        chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 80 }, async (afterDataUrl) => {
          const data = await chrome.storage.local.get(["steps"]);
          const steps = data.steps || [];
          const stepNumber = steps.length + 1;

          const percentX = ((x / viewportWidth) * 100).toFixed(2);
          const percentY = ((y / viewportHeight) * 100).toFixed(2);

          const annotatedImage = await drawClickMarker(
            beforeDataUrl,
            x,
            y,
            viewportWidth,
            viewportHeight,
            stepNumber
          );

          steps.push({
            stepNumber,
            description,
            url,
            timestamp,
            percentX,
            percentY,
            image: annotatedImage,
            afterImage: afterDataUrl || annotatedImage // État +0.5s après le clic
          });

          await chrome.storage.local.set({ steps });
          resolve();
        });
      });
    }));
  }
});

async function drawClickMarker(dataUrl, x, y, vw, vh, stepNumber) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const scaleX = bitmap.width / vw;
    const scaleY = bitmap.height / vh;
    const realX = x * scaleX;
    const realY = y * scaleY;

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bitmap, 0, 0);

    // Halo léger Bleu Pro
    ctx.beginPath();
    ctx.arc(realX, realY, 15 * scaleX, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(37, 99, 235, 0.22)";
    ctx.fill();

    // Pastille compacte Bleu Pro avec ombre
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
    ctx.shadowBlur = 6 * scaleX;
    ctx.shadowOffsetY = 2 * scaleY;

    ctx.beginPath();
    ctx.arc(realX, realY, 10 * scaleX, 0, 2 * Math.PI);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 2 * scaleX;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Numéro
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(10.5 * scaleX)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(stepNumber), realX, realY);

    const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
    return await blobToDataURL(outBlob);
  } catch (err) {
    return dataUrl;
  }
}

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}