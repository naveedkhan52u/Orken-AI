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
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");

    .orken-chat {
      position: fixed;
      right: 22px;
      bottom: 22px;
      z-index: 2147483647;
      width: 340px;
      height: 52px;
      font-family: Inter, Arial, sans-serif;
    }

    .orken-chat * { box-sizing: border-box; }

    .orken-launcher {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #9edcff;
      color: #071015;
      border: 1px solid #c7edff;
      padding: 0;
      cursor: pointer;
      box-shadow: 0 8px 25px #0008;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: orkenServicePulse 2.2s ease-in-out infinite;
    }

    .orken-launcher::after {
      content: "✉";
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      color: #fff;
    }

    .orken-launcher:hover {
      transform: scale(1.06);
      animation-play-state: paused;
      box-shadow: 0 10px 30px #9edcff55;
    }

    @keyframes orkenServicePulse {
      0%, 100% { box-shadow: 0 8px 25px #0008, 0 0 0 0 #9edcff66; }
      50% { box-shadow: 0 8px 25px #0008, 0 0 0 8px #9edcff00; }
    }

    .orken-window {
      position: absolute;
      right: 0;
      bottom: 64px;
      border-radius: 8px;
      width: 340px;
      height: min(440px, calc(100vh - 120px));
      background: #10130f;
      border: 1px solid #30362d;
      box-shadow: 0 20px 60px #0008;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .orken-window.open { display: flex; }

    .orken-window header {
      padding: 15px;
      border-bottom: 1px solid #30362d;
      display: flex;
      justify-content: space-between;
      color: #f2f5ef;
    }

    .orken-window header span {
      font-size: 8px;
      color: #9eff65;
    }

    .orken-window main {
      padding: 15px;
      overflow: auto;
      flex: 1;
    }

    .orken-window main p {
      font-size: 12px;
      line-height: 1.5;
      color: #c8cec4;
      padding: 8px 10px;
      border-radius: 10px;
      max-width: 82%;
      width: fit-content;
      margin: 7px 0;
      white-space: pre-wrap;
    }

    .orken-window main .user-message {
      margin-left: auto;
      background: #9eff65;
      color: #071007;
      border-bottom-right-radius: 3px;
    }

    .orken-window main .ai-message {
      margin-right: auto;
      background: #1b2119;
      color: #d8ded5;
      border: 1px solid #30382d;
      border-bottom-left-radius: 3px;
    }

    .orken-suggest {
      display: flex;
      gap: 6px;
      padding: 8px;
      flex-wrap: wrap;
    }

    .orken-suggest button {
      background: #171b15;
      color: #aeb5aa;
      border: 1px solid #343a31;
      padding: 6px;
      font-size: 10px;
      cursor: pointer;
    }

    .orken-suggest button:hover { color: #9eff65; border-color: #9eff65; }

    .orken-contact{display:none;padding:10px 12px;border-top:1px solid #30362d;background:#0c0f0b}.orken-contact-title{color:#9eff65;font-size:11px;font-weight:600;margin-bottom:8px}.orken-contact input{width:100%;margin:3px 0;padding:8px;background:#10130f;border:1px solid #30362d;color:#fff;outline:0;font:10px Inter,Arial,sans-serif}.orken-contact-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:7px}.orken-contact-actions button{border:1px solid #3a4235;background:#171b15;color:#aeb5aa;padding:6px 9px;font-size:9px;cursor:pointer}.orken-contact-actions .submit{background:#9eff65;color:#071007;border-color:#9eff65}.contact-message{color:#9eff65;font-size:9px;margin-top:6px}.orken-window form {
      display: flex;
      border-top: 1px solid #30362d;
    }

    .orken-window input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: 0;
      padding: 14px;
      color: white;
      outline: 0;
      font: inherit;
    }

    .orken-window input::placeholder { color: #737970; }

    .orken-window form .mic-icon,
    .orken-window form .send-icon {
      margin-bottom: 4px;
      margin-top: 5px;
      margin-right: 6px;
      border-radius: 30%;
      cursor: pointer;
    }

    .orken-window form .mic-icon {
      background: transparent;
      border: 0;
      color: #fff;
      width: 42px;
      padding: 0 10px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .orken-window form .mic-icon:hover { color: #9eff65; }

    .orken-window form .send-icon {
      background: #9eff65;
      border: 0;
      padding: 13px;
      color: #071007;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mic-icon svg, .send-icon svg {
      width: 18px;
      height: 18px;
      display: block;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .orken-window form .mic-icon.listening {
      color: #9eff65;
      background: #172014;
      box-shadow: 0 0 0 3px #9eff6522;
      animation: orkenMicPulse 1.2s ease-in-out infinite;
    }

    .orken-window form .mic-icon:disabled { opacity: .6; }

    @keyframes orkenMicPulse {
      0%, 100% { box-shadow: 0 0 0 3px #9eff6522; }
      50% { box-shadow: 0 0 0 7px #9eff6500; }
    }

    .orken-voice-error {
      margin: 6px 12px 10px;
      color: #ff9b9b;
      font-size: 10px;
      line-height: 1.4;
      text-align: center;
    }

    @media (max-width: 600px) {
      .orken-chat {
        right: 12px;
        bottom: 12px;
        width: 330px;
      }

      .orken-window {
        width: min(340px, calc(100vw - 24px));
        right: 0;
        height: min(440px, calc(100vh - 120px));
      }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "orken-chat";
  root.innerHTML = `
    <div class="orken-window" role="dialog" aria-label="Orken AI chat">
      <header>
        <b>Orken AI</b>
        <span>GROQ-POWERED · LIVE</span>
      </header>
      <main></main>
      <div class="orken-suggest">
        <button type="button" data-question="What do you build?">What do you build?</button>
        <button type="button" data-question="How long does it take?">How long?</button>
      </div>
      <div class="orken-contact"><div class="orken-contact-title">Contact our team for human support</div><form class="orken-contact-form"><input name="name" placeholder="Name" required><input name="email" type="email" placeholder="Email" required><input name="whatsapp" placeholder="WhatsApp (optional)"><input name="subject" placeholder="Subject" required><div class="orken-contact-actions"><button type="button" class="close">Close</button><button type="submit" class="submit">Submit</button></div><div class="contact-message"></div></form></div><form class="orken-chat-form">
        <button type="button" class="mic-icon" aria-label="Use microphone" title="Voice input">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"/>
            <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8"/>
          </svg>
        </button>
        <input placeholder="Ask Orken AI..." aria-label="Message" autocomplete="off">
        <button aria-label="Send message" class="send-icon" type="submit">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7 21 3Z"/>
          </svg>
        </button>
      </form>
    </div>
    <button class="orken-launcher" aria-label="Open Orken AI chat"></button>
  `;
  document.body.appendChild(root);

  const windowEl = root.querySelector(".orken-window");
  const messagesEl = root.querySelector("main");
  const input = root.querySelector("input");
  const micButton = root.querySelector(".mic-icon");
  const launcher = root.querySelector(".orken-launcher");

  const history = [];
  let isListening = false;
  let recognition = null;

  function addMessage(text, role) {
    const el = document.createElement("p");
    el.className = role === "user" ? "user-message" : "ai-message";
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function send(text = input.value) {
    const question = text.trim();
    if (!question) return;

    addMessage(question, "user");
    history.push({ role: "user", text: question });
    input.value = "";

    const buttons = root.querySelectorAll(".orken-suggest button");
    buttons.forEach((button) => { button.disabled = true; });

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

      const answer = data?.answer || "I don't have that information in the business knowledge yet.";
      addMessage(answer, "ai");
      history.push({ role: "ai", text: answer });
    } catch (error) {
      console.error("[Orken AI]", error);
      addMessage("I’m unable to access the business knowledge right now.", "ai");
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function startVoiceInput() {
    if (isListening) {
      try { recognition?.stop(); } catch {}
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening = true;
        micButton.classList.add("listening");
        micButton.title = "Stop listening";
        input.placeholder = "Listening...";
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        input.value = transcript.trim();
      };

      recognition.onerror = (event) => {
        isListening = false;
        micButton.classList.remove("listening");
        micButton.title = "Voice input";
        input.placeholder = "Ask Orken AI...";
        if (event.error !== "aborted") {
          alert(event.error === "not-allowed"
            ? "Microphone permission was blocked. Allow microphone access and try again."
            : "Voice input could not be started. Please try again.");
        }
      };

      recognition.onend = () => {
        isListening = false;
        micButton.classList.remove("listening");
        micButton.title = "Voice input";
        input.placeholder = "Ask Orken AI...";
        recognition = null;
      };

      recognition.start();
    } catch {
      isListening = false;
      micButton.classList.remove("listening");
      input.placeholder = "Ask Orken AI...";
      recognition = null;
      alert("Voice input could not be started. Please try again.");
    }
  }

  launcher.addEventListener("click", () => {
    const opening = !windowEl.classList.contains("open");
    windowEl.classList.toggle("open");

    if (opening && !messagesEl.children.length) {
      addMessage("Hi, I'm Orken AI. How can I help?", "ai");
    }

    if (opening) input.focus();
  });

  root.querySelector(".orken-chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    send();
  });

  micButton.addEventListener("click", startVoiceInput);

  function showContact(){ root.querySelector(".orken-contact").style.display="block"; }
  async function submitLead(e){
    e.preventDefault();
    const form=e.currentTarget, button=form.querySelector(".submit"), msg=form.querySelector(".contact-message");
    button.disabled=true; msg.textContent="";
    const payload={name:form.name.value.trim(),email:form.email.value.trim(),phone:form.whatsapp.value.trim()||null,message:form.subject.value.trim(),source:"Orken AI chatbot human support",business_id:businessId,status:"new"};
    try{
      const r=await fetch(SUPABASE_URL+"/rest/v1/leads",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":"Bearer "+SUPABASE_KEY,"Prefer":"return=minimal"},body:JSON.stringify(payload)});
      if(!r.ok) throw new Error("submit failed");
      msg.textContent="Thank you. Our team will contact you."; form.reset();
    }catch(err){console.error("[Orken AI lead]",err);msg.textContent="Unable to submit right now. Please try again."} finally{button.disabled=false}
  }
  root.querySelector(".orken-contact-form").addEventListener("submit",submitLead);
  root.querySelector(".orken-contact .close").addEventListener("click",()=>{root.querySelector(".orken-contact").style.display="none"});

  root.querySelectorAll(".orken-suggest button").forEach((button) => {
    button.addEventListener("click", () => send(button.dataset.question || ""));
  });

  window.addEventListener("beforeunload", () => {
    try { recognition?.stop(); } catch {}
  });
})();
