let currentSteps = [];

chrome.storage.local.get(["steps"], (data) => {
  currentSteps = data.steps || [];
  const container = document.getElementById("steps-container");

  if (currentSteps.length === 0) {
    container.innerHTML = "<p>Aucune étape enregistrée. Lancez un enregistrement depuis l'icône de l'extension.</p>";
    return;
  }

  currentSteps.forEach((step, index) => {
    const card = document.createElement("div");
    card.className = "step-card";
    card.innerHTML = `
      <div class="step-header">
        <div class="badge" style="background:#2563eb;">${step.stepNumber}</div>
        <strong style="white-space:nowrap; color:#2563eb;">Clic #${step.stepNumber} :</strong>
        <input type="text" class="step-desc" data-index="${index}" value="${step.description.replace(/"/g, '&quot;')}">
      </div>
      <div class="step-url">Page : ${step.url} • ${step.timestamp}</div>
      <img src="${step.image}" alt="Clic #${step.stepNumber}">
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".step-desc").forEach((input) => {
    input.addEventListener("input", (e) => {
      currentSteps[e.target.dataset.index].description = e.target.value;
    });
  });
});

document.getElementById("btn-download").addEventListener("click", () => {
  if (currentSteps.length === 0) {
    alert("Aucune étape à exporter.");
    return;
  }

  const titleInput = document.getElementById("guide-title").value.trim();
  const title = titleInput || "tutoriel-interactif";
  const safeStepsJson = JSON.stringify(currentSteps).replace(/<\/script>/gi, "<\\/script>");

  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Démo Interactive</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
    .topbar { width: 100%; max-width: 1280px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
    h1 { font-size: 20px; margin: 0; color: #ffffff; }
    .mode-switch { display: flex; gap: 8px; }
    .mode-switch button { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .mode-switch button.active { background: #2563eb; border-color: #2563eb; color: #fff; }
    
    .workspace { width: 100%; max-width: 1280px; display: grid; grid-template-columns: 280px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .workspace { grid-template-columns: 1fr; } }

    .sidebar { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; max-height: 84vh; overflow-y: auto; }
    .sidebar h3 { margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
    .nav-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; margin-bottom: 6px; border: 1px solid transparent; transition: background 0.15s; }
    .nav-item:hover { background: #334155; }
    .nav-item.active { background: rgba(37, 99, 235, 0.25); border-color: #3b82f6; }
    .nav-num { background: #2563eb; color: #fff; min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-top: 2px; }
    .nav-label { font-size: 13px; line-height: 1.4; color: #e2e8f0; }
    .nav-label strong { color: #93c5fd; display: block; font-size: 12px; }

    /* Lecteur Interactif + Plein écran */
    .player-card { width: 100%; background: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4); border: 1px solid #334155; display: flex; flex-direction: column; }
    .player-card:fullscreen { border-radius: 0; border: none; background: #020617; justify-content: space-between; }
    .player-card:fullscreen .stage { flex: 1; height: calc(100vh - 76px); }
    .player-card:fullscreen .img-wrapper { width: auto; max-width: 100%; max-height: 100%; }
    .player-card:fullscreen .img-wrapper img { width: auto; max-width: 100vw; max-height: calc(100vh - 82px); object-fit: contain; }

    .progress-bar { height: 5px; background: #334155; width: 100%; flex-shrink: 0; }
    .progress-fill { height: 100%; background: #2563eb; transition: width 0.35s ease; }

    .instruction-banner {
      padding: 14px 20px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .instruction-main { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 240px; }
    .step-badge { background: #2563eb; color: #fff; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: bold; flex-shrink: 0; }
    .step-details { display: flex; flex-direction: column; gap: 2px; }
    .step-text { font-size: 16px; font-weight: 700; color: #ffffff; }
    .step-submeta { font-size: 11.5px; color: #94a3b8; word-break: break-all; }

    .controls { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
    .controls button { background: #334155; color: #fff; border: none; padding: 8px 13px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; display: inline-flex; align-items: center; gap: 5px; }
    .controls button:hover:not(:disabled) { background: #475569; }
    .controls button:disabled { opacity: 0.4; cursor: not-allowed; }
    .controls button.primary { background: #2563eb; }
    .controls button.primary:hover:not(:disabled) { background: #1d4ed8; }
    
    /* Scène avec double couche image (Avant + Après 0.5s) et curseur animé */
    .stage { position: relative; width: 100%; background: #020617; display: flex; justify-content: center; align-items: center; overflow: hidden; }
    .img-wrapper { position: relative; display: inline-block; width: 100%; overflow: hidden; }
    .img-wrapper img { width: 100%; display: block; user-select: none; transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease; }

    /* Calque de transition (+0.5s après clic) */
    #after-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0;
      pointer-events: none;
      z-index: 5;
      transition: opacity 0.28s ease-out, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    }

    /* Curseur vidéo simulé lors de la transition de 0.5s */
    .sim-cursor {
      position: absolute;
      width: 24px;
      height: 24px;
      pointer-events: none;
      z-index: 30;
      opacity: 0;
      transform: translate(-4px, -4px);
      transition: left 0.25s cubic-bezier(0.22, 1, 0.36, 1), top 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease, transform 0.15s ease;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));
    }
    .sim-cursor.clicking {
      transform: translate(-4px, -4px) scale(0.78);
    }

    .click-anchor {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 20;
      display: flex;
      align-items: center;
      transition: opacity 0.2s ease;
    }

    .hotspot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.14);
      border: 2px solid #2563eb;
      cursor: pointer;
      flex-shrink: 0;
      animation: pulse-blue 1.8s infinite;
    }
    .hotspot:hover { background: rgba(37, 99, 235, 0.3); transform: scale(1.1); }

    .pin-tooltip {
      position: absolute;
      left: 32px;
      top: 50%;
      transform: translateY(-50%);
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #2563eb;
      border-radius: 7px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.35), 0 4px 8px -2px rgba(15, 23, 42, 0.18);
      cursor: pointer;
    }
    .pin-tooltip::before {
      content: "";
      position: absolute;
      left: -9px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 5px;
      border-style: solid;
      border-color: transparent #2563eb transparent transparent;
    }
    .pin-tooltip.align-left {
      left: auto;
      right: 32px;
      border-left: 1px solid #cbd5e1;
      border-right: 4px solid #2563eb;
    }
    .pin-tooltip.align-left::before {
      left: auto;
      right: -9px;
      border-color: transparent transparent transparent #2563eb;
    }

    @keyframes pulse-blue {
      0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.65); }
      70% { box-shadow: 0 0 0 11px rgba(37, 99, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
    }
    .finish-banner { display: none; text-align: center; padding: 48px 20px; }
    .finish-banner h2 { color: #38bdf8; margin-top: 0; }

    .list-view { display: none; width: 100%; max-width: 950px; }
    .list-step { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
    .list-img-box { position: relative; margin-top: 12px; }
    .list-img-box img { width: 100%; border-radius: 6px; display: block; }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>${title}</h1>
    <div class="mode-switch">
      <button id="btn-mode-interactive" class="active">Mode Démo Interactive</button>
      <button id="btn-mode-list">Vue Liste Complète</button>
    </div>
  </div>

  <div id="interactive-view" class="workspace">
    <aside class="sidebar">
      <h3>Index des clics (${currentSteps.length})</h3>
      <div id="clicks-nav"></div>
    </aside>

    <div id="player-card" class="player-card">
      <div class="progress-bar"><div id="progress-fill" class="progress-fill"></div></div>
      
      <div class="instruction-banner">
        <div class="instruction-main">
          <div id="step-badge" class="step-badge">Clic #1</div>
          <div class="step-details">
            <div id="step-text" class="step-text"></div>
            <div id="step-meta" class="step-submeta"></div>
          </div>
        </div>
        <div class="controls">
          <button id="btn-prev">← Précédent</button>
          <span id="step-counter" style="font-size:13px; color:#94a3b8; padding:0 4px;"></span>
          <button id="btn-next" class="primary">Suivant →</button>
          <button id="btn-fullscreen" title="Afficher en plein écran">⛶ Plein écran</button>
        </div>
      </div>

      <div class="stage" id="stage">
        <div class="img-wrapper" id="img-wrapper">
          <img id="step-img" src="" alt="Capture étape">
          <img id="after-img" src="" alt="Réaction après clic">
          
          <!-- Curseur vectoriel pour la micro-vidéo de 0.5s -->
          <svg id="sim-cursor" class="sim-cursor" viewBox="0 0 24 24">
            <path fill="#ffffff" stroke="#0f172a" stroke-width="1.8" d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.53.35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"/>
          </svg>

          <div id="click-anchor" class="click-anchor">
            <div id="hotspot" class="hotspot" title="Cliquez ici pour continuer"></div>
            <div id="pin-tooltip" class="pin-tooltip" title="Cliquez pour continuer"></div>
          </div>
        </div>

        <div id="finish-banner" class="finish-banner">
          <h2>Tutoriel terminé !</h2>
          <p style="color:#cbd5e1; margin-bottom:20px;">Vous avez parcouru l'ensemble des ${currentSteps.length} clics de cette procédure.</p>
          <button id="btn-restart" style="background:#2563eb; color:#fff; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">Recommencer la démo</button>
        </div>
      </div>
    </div>
  </div>

  <div id="list-view" class="list-view"></div>

  <script>
    const steps = ${safeStepsJson};
    let currentIndex = 0;
    let isAnimating = false;

    const playerCard = document.getElementById("player-card");
    const btnFullscreen = document.getElementById("btn-fullscreen");
    const clicksNav = document.getElementById("clicks-nav");
    const stepBadge = document.getElementById("step-badge");
    const stepText = document.getElementById("step-text");
    const stepMeta = document.getElementById("step-meta");
    const stepImg = document.getElementById("step-img");
    const afterImg = document.getElementById("after-img");
    const simCursor = document.getElementById("sim-cursor");
    const clickAnchor = document.getElementById("click-anchor");
    const pinTooltip = document.getElementById("pin-tooltip");
    const stepCounter = document.getElementById("step-counter");
    const progressFill = document.getElementById("progress-fill");
    const imgWrapper = document.getElementById("img-wrapper");
    const finishBanner = document.getElementById("finish-banner");

    btnFullscreen.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        playerCard.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener("fullscreenchange", () => {
      btnFullscreen.textContent = document.fullscreenElement ? "✕ Quitter plein écran" : "⛶ Plein écran";
    });

    steps.forEach((s, idx) => {
      const item = document.createElement("div");
      item.className = "nav-item";
      item.dataset.idx = idx;
      item.innerHTML = \`
        <div class="nav-num">\${s.stepNumber}</div>
        <div class="nav-label">
          <strong>Clic #\${s.stepNumber}</strong>
          <span>\${s.description}</span>
        </div>
      \`;
      item.addEventListener("click", () => {
        if (isAnimating) return;
        currentIndex = idx;
        renderStep(currentIndex);
      });
      clicksNav.appendChild(item);
    });

    // Micro-animation vidéo fluide de 0.5s (500ms) entre l'action et l'étape suivante
    function playFluidTransitionAndNext() {
      if (isAnimating || currentIndex >= steps.length) return;
      isAnimating = true;

      const s = steps[currentIndex];
      const px = parseFloat(s.percentX || 50);
      const py = parseFloat(s.percentY || 50);

      // 1. Faire glisser le curseur vers le point de clic (0 -> 200ms)
      simCursor.style.left = Math.min(px + 6, 95) + "%";
      simCursor.style.top = Math.min(py + 6, 95) + "%";
      simCursor.style.opacity = "1";
      clickAnchor.style.opacity = "0.2";

      requestAnimationFrame(() => {
        simCursor.style.left = px + "%";
        simCursor.style.top = py + "%";
      });

      // 2. Effet de clic + affichage fluide de l'image +0.5s (ouverture menu/sélection)
      setTimeout(() => {
        simCursor.classList.add("clicking");
        if (s.afterImage) {
          afterImg.src = s.afterImage;
          afterImg.style.opacity = "1";
          afterImg.style.transform = "scale(1.015)";
        }
        stepImg.style.transform = "scale(1.015)";
      }, 200);

      // 3. À 500ms (0.5s), passage propre à l'étape suivante
      setTimeout(() => {
        simCursor.classList.remove("clicking");
        simCursor.style.opacity = "0";
        afterImg.style.opacity = "0";
        afterImg.style.transform = "scale(1)";
        stepImg.style.transform = "scale(1)";
        clickAnchor.style.opacity = "1";

        currentIndex++;
        renderStep(currentIndex);
        isAnimating = false;
      }, 520);
    }

    function renderStep(index) {
      document.querySelectorAll(".nav-item").forEach((el, idx) => {
        el.classList.toggle("active", idx === index);
      });

      if (index >= steps.length) {
        imgWrapper.style.display = "none";
        finishBanner.style.display = "block";
        progressFill.style.width = "100%";
        stepCounter.textContent = "Terminé";
        stepText.textContent = "Procédure complétée";
        stepMeta.textContent = "";
        document.getElementById("btn-next").disabled = true;
        return;
      }

      imgWrapper.style.display = "inline-block";
      finishBanner.style.display = "none";
      afterImg.style.opacity = "0";

      const s = steps[index];
      stepBadge.textContent = "Clic #" + s.stepNumber;
      stepText.textContent = s.description;
      stepMeta.textContent = "Page : " + s.url + (s.timestamp ? " • " + s.timestamp : "");
      stepImg.src = s.image;

      if (s.percentX && s.percentY) {
        const px = parseFloat(s.percentX);
        clickAnchor.style.display = "flex";
        clickAnchor.style.left = px + "%";
        clickAnchor.style.top = parseFloat(s.percentY) + "%";
        pinTooltip.textContent = s.description;

        if (px > 68) {
          pinTooltip.classList.add("align-left");
        } else {
          pinTooltip.classList.remove("align-left");
        }
      } else {
        clickAnchor.style.display = "none";
      }

      stepCounter.textContent = (index + 1) + " / " + steps.length;
      progressFill.style.width = (((index + 1) / steps.length) * 100) + "%";
      document.getElementById("btn-prev").disabled = index === 0;
      document.getElementById("btn-next").disabled = false;
    }

    clickAnchor.addEventListener("click", playFluidTransitionAndNext);
    document.getElementById("btn-next").addEventListener("click", playFluidTransitionAndNext);

    document.getElementById("btn-prev").addEventListener("click", () => {
      if (!isAnimating && currentIndex > 0) {
        currentIndex--;
        renderStep(currentIndex);
      }
    });

    document.getElementById("btn-restart").addEventListener("click", () => {
      currentIndex = 0;
      renderStep(0);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") playFluidTransitionAndNext();
      else if (e.key === "ArrowLeft" && !isAnimating && currentIndex > 0) {
        currentIndex--;
        renderStep(currentIndex);
      }
    });

    const btnInteractive = document.getElementById("btn-mode-interactive");
    const btnList = document.getElementById("btn-mode-list");
    const interactiveView = document.getElementById("interactive-view");
    const listView = document.getElementById("list-view");

    listView.innerHTML = steps.map(s => {
      const px = parseFloat(s.percentX || 0);
      const alignClass = px > 68 ? "align-left" : "";
      const pinHtml = (s.percentX && s.percentY) ? \`
        <div class="click-anchor" style="left:\${s.percentX}%; top:\${s.percentY}%;">
          <div class="hotspot" style="animation:none;"></div>
          <div class="pin-tooltip \${alignClass}">\${s.description}</div>
        </div>\` : "";
      return \`
        <div class="list-step">
          <div style="display:flex; align-items:center; gap:10px; font-weight:bold; font-size:17px;">
            <span class="step-badge">Clic #\${s.stepNumber}</span>
            <span>\${s.description}</span>
          </div>
          <div class="list-img-box">
            <img src="\${s.image}" alt="Clic #\${s.stepNumber}">
            \${pinHtml}
          </div>
        </div>
      \`;
    }).join("");

    btnInteractive.addEventListener("click", () => {
      interactiveView.style.display = "grid";
      listView.style.display = "none";
      btnInteractive.classList.add("active");
      btnList.classList.remove("active");
    });

    btnList.addEventListener("click", () => {
      interactiveView.style.display = "none";
      listView.style.display = "block";
      btnList.classList.add("active");
      btnInteractive.classList.remove("active");
    });

    renderStep(0);
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-interactif.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById("btn-send-api").addEventListener("click", async () => {
  const title = document.getElementById("guide-title").value;
  const endpoint = "https://votre-serveur.com/api/guides";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, steps: currentSteps })
    });
    if (!res.ok) throw new Error(`Erreur serveur HTTP ${res.status}`);
    alert("Tutoriel publié avec succès !");
  } catch (err) {
    alert("Configurez l'URL de votre API dans viewer.js (" + err.message + ")");
  }
});