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
    "width:390px",
    "height:540px",
    "border:0",
    "background:transparent",
    "z-index:2147483647",
    "overflow:hidden"
  ].join(";");
  document.body.appendChild(frame);

  function resize() {
    frame.style.width = window.innerWidth <= 600 ? "100vw" : "390px";
    frame.style.height = window.innerWidth <= 600 ? "100vh" : "540px";
  }
  resize();
  window.addEventListener("resize", resize);
})();