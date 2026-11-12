function getElementDescription(el) {
  // Remonter au parent cliquable si l'utilisateur clique sur un span ou une icône interne
  const target = el.closest("button, a, [role='option'], [role='menuitem'], .ui-menu-item, .o-autocomplete--dropdown-item, li, input, textarea, select") || el;

  const text = (
    target.innerText ||
    target.value ||
    target.getAttribute("aria-label") ||
    target.getAttribute("placeholder") ||
    target.getAttribute("title") ||
    ""
  ).trim();
  const cleanText = text.replace(/\s+/g, " ").substring(0, 50);

  // Détection spécifique des éléments de liste déroulante (Odoo, Bootstrap, Select2, etc.)
  if (
    target.getAttribute("role") === "option" ||
    target.classList.contains("ui-menu-item") ||
    target.classList.contains("o-autocomplete--dropdown-item") ||
    target.closest(".dropdown-menu, .ui-autocomplete, .o-autocomplete--dropdown-menu")
  ) {
    return cleanText ? `Sélectionner « ${cleanText} »` : "Sélectionner une option dans la liste";
  }

  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    return cleanText ? `Saisir dans le champ « ${cleanText} »` : "Saisir une valeur dans le champ";
  }
  if (target.tagName === "SELECT") {
    return "Choisir une option dans le menu déroulant";
  }
  if (cleanText) {
    return `Cliquer sur « ${cleanText} »`;
  }
  return `Cliquer sur le champ (${target.tagName.toLowerCase()})`;
}

// Utilisation de 'mousedown' en phase de capture : capture le menu déroulant AVANT qu'il ne se ferme au clic
document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // Uniquement clic gauche

  chrome.storage.local.get(["isRecording"], (data) => {
    if (!data.isRecording) return;

    const description = getElementDescription(e.target);

    // Discret anneau bleu de confirmation (disparaît en 250ms pour ne pas polluer la capture +0.5s)
    const pulse = document.createElement("div");
    pulse.style.cssText = `
      position: fixed; left: ${e.clientX - 12}px; top: ${e.clientY - 12}px;
      width: 24px; height: 24px; border-radius: 50%;
      border: 2px solid #2563eb; background: rgba(37, 99, 235, 0.2);
      pointer-events: none; z-index: 2147483647;
    `;
    document.body.appendChild(pulse);
    setTimeout(() => pulse.remove(), 220);

    chrome.runtime.sendMessage({
      action: "RECORD_CLICK",
      payload: {
        x: e.clientX,
        y: e.clientY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        description: description,
        url: window.location.href,
        timestamp: new Date().toLocaleTimeString("fr-FR")
      }
    });
  });
}, true);