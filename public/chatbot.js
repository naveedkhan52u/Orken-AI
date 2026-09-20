(() => {
  const script = document.currentScript;
  const businessId = script?.dataset?.businessId;
  if (!businessId) {
    console.error("[Orken AI] Missing data-business-id.");
    return;
  }

  const SUPABASE_URL = "https://dsvqneushvuunpjqookz.supabase.co";
  const SUPABASE_KEY = "sb_publishable_gWqkaP6kIQ331xxFb3RF_A_Vkw9JqSq";
  const FUNCTION_URL = SUPABASE_URL + "/functions/v1/chat-with-knowledge";

  const style = document.createElement("style");
  style.textContent = `
    .orken-chat{position:fixed;right:22px;bottom:22px;z-index:2147483647;font-family:Inter,Arial,sans-serif}
    .orken-launcher{width:54px;height:54px;border-radius:50%;border:1px solid #c7edff;background:#9edcff;color:#071015;cursor:pointer;box-shadow:0 8px 25px #0008;font-size:23px}
    .orken-window{position:absolute;right:0;bottom:64px;width:340px;height:min(440px,calc(100vh - 120px));background:#10130f;border:1px solid #30362d;border-radius:8px;box-shadow:0 20px 60px #0008;display:none;flex-direction:column;overflow:hidden}
    .orken-window.open{display:flex}
    .orken-head{padding:15px;border-bottom:1px solid #30362d;display:flex;justify-content:space-between;color:#f2f5ef}
    .orken-head span{font-size:8px;color:#9eff65}
    .orken-messages{padding:15px;overflow:auto;flex:1}
    .orken-msg{font-size:12px;line-height:1.5;padding:8px 10px;border-radius:10px;max-width:82%;width:fit-content;margin:7px 0;white-space:pre-wrap}
    .orken-ai{background:#1b2119;color:#d8ded5;border:1px solid #30382d;border-bottom-left-radius:3px}
    .orken-user{margin-left:auto;background:#9eff65;color:#071007;border-bottom-right-radius:3px}
    .orken-form{display:flex;border-top:1px solid #30362d}
    .orken-input{flex:1;background:transparent;border:0;padding:14px;color:#fff;outline:0;min-width:0}
    .orken-send{border:0;background:#9eff65;color:#071007;padding:0 14px;cursor:pointer}
    .orken-status{padding:7px 12px;color:#899187;font-size:10px;border-top:1px solid #252b22;display:none}
    @media(max-width:600px){.orken-chat{right:12px;bottom:12px}.orken-window{width:min(340px,calc(100vw - 24px))}}
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "orken-chat";
  root.innerHTML = `
    <div class="orken-window" role="dialog" aria-label="Orken AI chat">
      <div class="orken-head"><b>Orken AI</b><span>AI · LIVE</span></div>
      <div class="orken-messages"></div>
      <div class="orken-status"></div>
      <form class="orken-form">
        <input class="orken-input" placeholder="Ask Orken AI..." aria-label="Message" autocomplete="off">
        <button class="orken-send" aria-label="Send message" type="submit">➤</button>
      </form>
    </div>
    <button class="orken-launcher" aria-label="Open Orken AI chat">✦</button>
  `;
  document.body.appendChild(root);

  const windowEl = root.querySelector(".orken-window");
  const messagesEl = root.querySelector(".orken-messages");
  const statusEl = root.querySelector(".orken-status");
  const input = root.querySelector(".orken-input");

  function addMessage(text, role) {
    const el = document.createElement("div");
    el.className = "orken-msg " + (role === "user" ? "orken-user" : "orken-ai");
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  root.querySelector(".orken-launcher").addEventListener("click", () => {
    const opening = !windowEl.classList.contains("open");
    windowEl.classList.toggle("open");
    if (opening && !messagesEl.children.length) {
      addMessage("Hi, I'm Orken AI. How can I help?", "ai");
    }
    if (opening) input.focus();
  });

  const history = [];

  root.querySelector(".orken-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    addMessage(question, "user");
    history.push({ role: "user", text: question });
    input.value = "";
    statusEl.textContent = "Thinking...";
    statusEl.style.display = "block";

    try {
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        body: JSON.stringify({
          message: question,
          history: history.slice(-6),
          business_id: businessId
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI request failed");

      const answer = data?.answer || "I do not have that information in the business knowledge yet.";
      addMessage(answer, "ai");
      history.push({ role: "ai", text: answer });
    } catch (error) {
      console.error("[Orken AI]", error);
      addMessage("I’m unable to access the business knowledge right now.", "ai");
    } finally {
      statusEl.style.display = "none";
    }
  });
})();