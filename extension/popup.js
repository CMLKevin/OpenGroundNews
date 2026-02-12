async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function getBaseUrl() {
  const stored = await chrome.storage.local.get({ ognBaseUrl: "http://localhost:3000" });
  let base = String(stored.ognBaseUrl || "").trim();
  if (!base) base = "http://localhost:3000";
  base = base.replace(/\/+$/, "");
  return base;
}

function openUrl(url) {
  chrome.tabs.create({ url });
  window.close();
}

document.addEventListener("DOMContentLoaded", async () => {
  const tab = await getActiveTab();
  const base = await getBaseUrl();

  document.getElementById("baseTag").textContent = `Base: ${base.replace(/^https?:\/\//, "")}`;
  const tabUrl = tab && tab.url ? tab.url : "";
  document.getElementById("tabUrl").textContent = tabUrl || "(no URL)";

  document.getElementById("openReader").addEventListener("click", () => {
    if (!tabUrl) return;
    openUrl(`${base}/reader?url=${encodeURIComponent(tabUrl)}`);
  });

  document.getElementById("openSearch").addEventListener("click", () => {
    if (!tabUrl) return;
    openUrl(`${base}/search?q=${encodeURIComponent(tabUrl)}`);
  });

  document.getElementById("openHome").addEventListener("click", () => openUrl(`${base}/`));

  document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
});

