/**
 * LocalMind Embeddable Chat Widget
 *
 * Usage:
 * <script
 *   src="http://YOUR_SERVER/embed.js"
 *   data-color="#6366f1"
 *   data-title="AI Asistan"
 *   data-welcome="Merhaba! Size nasıl yardımcı olabilirim?"
 *   data-position="right"
 *   data-model="qwen2.5-coder:latest"
 * ></script>
 */
(function () {
  "use strict";

  // Find the script tag to get config
  var scripts = document.getElementsByTagName("script");
  var currentScript = scripts[scripts.length - 1];

  var config = {
    color: currentScript.getAttribute("data-color") || "#6366f1",
    title: currentScript.getAttribute("data-title") || "AI Asistan",
    welcome:
      currentScript.getAttribute("data-welcome") ||
      "Merhaba! Size nasıl yardımcı olabilirim?",
    position: currentScript.getAttribute("data-position") || "right",
    model: currentScript.getAttribute("data-model") || "",
    serverUrl: currentScript.src.replace(/\/embed\.js.*$/, ""),
  };

  // State
  var isOpen = false;
  var hasUnread = false;

  // ─── Create Styles ───
  var style = document.createElement("style");
  style.textContent =
    "#localmind-widget-btn{position:fixed;bottom:24px;" +
    config.position +
    ":24px;width:60px;height:60px;border-radius:50%;background:" +
    config.color +
    ";border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;transition:transform 0.3s,box-shadow 0.3s;z-index:2147483646;}" +
    "#localmind-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,0.28);}" +
    "#localmind-widget-btn svg{width:28px;height:28px;fill:white;transition:transform 0.3s;}" +
    "#localmind-widget-btn.open svg.chat-icon{display:none;}" +
    "#localmind-widget-btn:not(.open) svg.close-icon{display:none;}" +
    "#localmind-widget-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;background:#ef4444;border-radius:50%;border:2px solid white;display:none;}" +
    "#localmind-widget-badge.show{display:block;}" +
    "#localmind-widget-frame{position:fixed;bottom:100px;" +
    config.position +
    ":24px;width:380px;height:560px;max-height:calc(100vh - 130px);max-width:calc(100vw - 48px);border:none;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:2147483645;opacity:0;transform:translateY(16px) scale(0.96);transition:opacity 0.25s ease,transform 0.25s ease;pointer-events:none;background:white;overflow:hidden;}" +
    "#localmind-widget-frame.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all;}" +
    "@media(max-width:440px){#localmind-widget-frame{width:calc(100vw - 16px);height:calc(100vh - 80px);bottom:8px;" +
    config.position +
    ":8px;max-height:none;border-radius:12px;}}";
  document.head.appendChild(style);

  // ─── Create Button ───
  var btn = document.createElement("button");
  btn.id = "localmind-widget-btn";
  btn.setAttribute("aria-label", "Sohbet aç");
  btn.innerHTML =
    '<svg class="chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/><path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>' +
    '<svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  var badge = document.createElement("span");
  badge.id = "localmind-widget-badge";
  btn.appendChild(badge);

  // ─── Create iframe ───
  var widgetUrl =
    config.serverUrl +
    "/widget?color=" +
    encodeURIComponent(config.color) +
    "&title=" +
    encodeURIComponent(config.title) +
    "&welcome=" +
    encodeURIComponent(config.welcome) +
    "&model=" +
    encodeURIComponent(config.model);

  var iframe = document.createElement("iframe");
  iframe.id = "localmind-widget-frame";
  iframe.src = widgetUrl;
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("title", config.title);

  // ─── Toggle Logic ───
  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    if (isOpen) {
      btn.classList.add("open");
      iframe.classList.add("open");
      hasUnread = false;
      badge.classList.remove("show");
    } else {
      btn.classList.remove("open");
      iframe.classList.remove("open");
    }
  });

  // ─── Listen for messages from widget iframe ───
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "localmind:message") {
      if (!isOpen) {
        hasUnread = true;
        badge.classList.add("show");
      }
    }
  });

  // ─── Mount ───
  document.body.appendChild(iframe);
  document.body.appendChild(btn);
})();
