async function getBaseUrl() {
  const stored = await chrome.storage.local.get({ ognBaseUrl: "http://localhost:3000" });
  return String(stored.ognBaseUrl || "").trim() || "http://localhost:3000";
}

async function setBaseUrl(value) {
  let v = String(value || "").trim();
  if (!v) v = "http://localhost:3000";
  v = v.replace(/\/+$/, "");
  await chrome.storage.local.set({ ognBaseUrl: v });
  return v;
}

function setStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
  if (!text) return;
  setTimeout(() => {
    el.textContent = "";
  }, 1800);
}

document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("baseUrl");
  input.value = await getBaseUrl();

  document.getElementById("save").addEventListener("click", async () => {
    const saved = await setBaseUrl(input.value);
    input.value = saved;
    setStatus("Saved.");
  });

  document.getElementById("reset").addEventListener("click", async () => {
    input.value = "http://localhost:3000";
    await setBaseUrl(input.value);
    setStatus("Reset.");
  });
});

