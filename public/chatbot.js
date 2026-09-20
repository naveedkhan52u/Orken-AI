(() => {
  const script = document.currentScript;
  const businessId = script?.dataset?.businessId;
  if (!businessId) {
    console.error("[Orken AI] Missing data-business-id.");
    return;
  }

  const base = new URL(script.src).origin;
  const frame = document.createElement("iframe");
  frame.src = base + "/embed?business_id=" + encodeURIComponent(businessId);
  frame.title = "Orken AI";
  frame.setAttribute("allow", "microphone");
  frame.setAttribute("scrolling", "no");
  frame.style.cssText = [
    "position:fixed",
    "right:0",
    "bottom:0",
    "width:78px",
    "height:78px",
    "border:0",
    "background:transparent",
    "z-index:2147483647",
    "overflow:hidden",
    "display:block",
    "visibility:visible"
  ].join(";");

  document.body.appendChild(frame);

  function setOpen(open) {
    const mobile = window.innerWidth <= 600;
    frame.style.width = open ? (mobile ? "100vw" : "390px") : "78px";
    frame.style.height = open ? (mobile ? "100vh" : "540px") : "78px";
  }

  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type !== "orken-chatbot-state") return;
    setOpen(Boolean(event.data.open));
  });

  window.addEventListener("resize", () => {
    setOpen(frame.dataset.open === "true");
  });
})();