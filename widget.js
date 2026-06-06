(function () {
  const DEFAULTS = {
    webhookUrl: "",
    title: "Asistente",
    subtitle: "En linea",
    welcomeMessage: "Hola. En que puedo ayudarte?",
    placeholder: "Escribe tu mensaje...",
    primaryColor: "#2563eb",
    initialOpen: false,
    requestFormat: "form",
    storageKey: "n8n-chat-session-id",
    authHeaderName: "Authorization",
    authHeaderValue: "",
    // Customization Options
    avatarUrl: "",
    panelWidth: "390px",
    panelHeight: "620px",
    panelRadius: "24px",
    headerBg: "",
    headerTextColor: "#ffffff",
    titleFontSize: "1.05rem",
    titleFontWeight: "800",
    subtitleFontSize: "0.84rem",
    subtitleTextColor: "rgba(255, 255, 255, 0.78)",
    avatarSize: "42px",
    avatarRadius: "14px",
    avatarBg: "rgba(255, 255, 255, 0.18)",
    toggleSize: "62px",
    toggleRadius: "50%",
    toggleIconSize: "28px",
    messageFontSize: "0.94rem",
    messageRadius: "18px",
    // Toggle & Tooltip Customization
    toggleImageUrl: "",
    toggleBg: "",
    tooltipText: "",
    tooltipBg: "#ffffff",
    tooltipTextColor: "#0f172a"
  };

  const SELECTORS = {
    root: "n8n-chat-widget",
    panel: "n8n-chat-panel",
    messages: "n8n-chat-messages",
    input: "n8n-chat-input",
    send: "n8n-chat-send"
  };

  async function init(options) {
    const config = { ...DEFAULTS, ...options };
    if (config.toggleImageUrl && !options.toggleRadius) {
      config.toggleRadius = "0";
    }

    if (!config.webhookUrl || config.webhookUrl.includes("TU_WEBHOOK")) {
      console.warn("N8NChatWidget: configura una webhookUrl valida.");
    }

    injectStyles();
    await ensureMarked();

    const existing = document.querySelector(`.${SELECTORS.root}`);
    if (existing) {
      existing.remove();
    }

    const state = {
      isLoading: false,
      messages: [],
      sessionId: getSessionId(config.storageKey)
    };

    const widget = buildWidget(config);
    const panel = widget.querySelector(`.${SELECTORS.panel}`);
    const messagesEl = widget.querySelector(`.${SELECTORS.messages}`);
    const form = widget.querySelector("form");
    const input = widget.querySelector(`.${SELECTORS.input}`);
    const send = widget.querySelector(`.${SELECTORS.send}`);
    const toggle = widget.querySelector(".n8n-chat-toggle");
    const close = widget.querySelector(".n8n-chat-close");

    document.body.appendChild(widget);
    widget.style.setProperty("--chat-primary", config.primaryColor);
    widget.style.setProperty("--chat-primary-dark", darkenColor(config.primaryColor, 18));

    if (config.panelWidth) widget.style.setProperty("--chat-panel-width", config.panelWidth);
    if (config.panelHeight) widget.style.setProperty("--chat-panel-height", config.panelHeight);
    if (config.panelRadius) widget.style.setProperty("--chat-panel-radius", config.panelRadius);
    if (config.headerBg) widget.style.setProperty("--chat-header-bg", config.headerBg);
    if (config.headerTextColor) widget.style.setProperty("--chat-header-text-color", config.headerTextColor);
    if (config.titleFontSize) widget.style.setProperty("--chat-title-size", config.titleFontSize);
    if (config.titleFontWeight) widget.style.setProperty("--chat-title-weight", config.titleFontWeight);
    if (config.subtitleFontSize) widget.style.setProperty("--chat-subtitle-size", config.subtitleFontSize);
    if (config.subtitleTextColor) widget.style.setProperty("--chat-subtitle-color", config.subtitleTextColor);
    if (config.avatarSize) widget.style.setProperty("--chat-avatar-size", config.avatarSize);
    if (config.avatarRadius) widget.style.setProperty("--chat-avatar-radius", config.avatarRadius);
    if (config.avatarBg) {
      widget.style.setProperty("--chat-avatar-bg", config.avatarBg);
      if (config.avatarBg === "transparent") {
        widget.style.setProperty("--chat-avatar-shadow", "none");
        widget.style.setProperty("--chat-avatar-overflow", "visible");
        widget.style.setProperty("--chat-avatar-fit", "contain");
        if (!options.avatarRadius) {
          config.avatarRadius = "0";
          widget.style.setProperty("--chat-avatar-radius", "0");
        }
      }
    }
    if (config.toggleSize) widget.style.setProperty("--chat-toggle-size", config.toggleSize);
    if (config.toggleRadius) widget.style.setProperty("--chat-toggle-radius", config.toggleRadius);
    if (config.toggleIconSize) widget.style.setProperty("--chat-toggle-icon-size", config.toggleIconSize);
    if (config.messageFontSize) widget.style.setProperty("--chat-message-size", config.messageFontSize);
    if (config.messageRadius) widget.style.setProperty("--chat-message-radius", config.messageRadius);

    if (config.toggleBg) {
      widget.style.setProperty("--chat-toggle-bg", config.toggleBg);
      if (config.toggleBg === "transparent") {
        widget.style.setProperty("--chat-toggle-shadow", "none");
        widget.style.setProperty("--chat-toggle-hover-shadow", "none");
      }
    }
    if (config.tooltipBg) widget.style.setProperty("--chat-tooltip-bg", config.tooltipBg);
    if (config.tooltipTextColor) widget.style.setProperty("--chat-tooltip-text", config.tooltipTextColor);

    addMessage(messagesEl, "bot", config.welcomeMessage);
    state.messages.push({ role: "assistant", content: config.welcomeMessage });

    if (config.initialOpen) {
      widget.classList.add("is-open");
    }

    const tooltipClose = widget.querySelector(".n8n-chat-tooltip-close");
    const tooltipEl = widget.querySelector(".n8n-chat-tooltip");

    if (tooltipClose && tooltipEl) {
      tooltipClose.addEventListener("click", (e) => {
        e.stopPropagation();
        tooltipEl.classList.add("is-hidden");
        try {
          window.sessionStorage.setItem("n8n-chat-tooltip-dismissed", "true");
        } catch (_) { }
      });
    }

    toggle.addEventListener("click", () => {
      widget.classList.toggle("is-open");
      if (widget.classList.contains("is-open")) {
        if (tooltipEl) {
          tooltipEl.classList.add("is-hidden");
        }
        input.focus();
      }
    });

    close.addEventListener("click", () => {
      widget.classList.remove("is-open");
      toggle.focus();
    });

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${input.scrollHeight}px`;
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || state.isLoading) {
        return;
      }

      input.value = "";
      input.style.height = "auto";
      addMessage(messagesEl, "user", message);
      state.messages.push({ role: "user", content: message });
      setLoading(true);
      const typing = addTyping(messagesEl);

      try {
        const response = await sendToN8n(
          config.webhookUrl,
          config.requestFormat,
          {
            message,
            sessionId: state.sessionId,
            chatInput: message,
            history: state.messages
          },
          config.authHeaderName,
          config.authHeaderValue
        );
        const reply = extractReply(response);
        typing.remove();
        addMessage(messagesEl, "bot", reply);
        state.messages.push({ role: "assistant", content: reply });
      } catch (error) {
        typing.remove();
        addMessage(
          messagesEl,
          "bot error",
          "Error al conectar, intente mas tarde."
        );
        console.error("N8NChatWidget:", error);
      } finally {
        setLoading(false);
      }
    });

    function setLoading(isLoading) {
      state.isLoading = isLoading;
      send.disabled = isLoading;
      input.disabled = isLoading;
      panel.setAttribute("aria-busy", String(isLoading));
      if (!isLoading) {
        input.focus();
      }
    }
  }

  async function sendToN8n(webhookUrl, requestFormat, payload, authHeaderName, authHeaderValue) {
    const request = buildRequest(payload, requestFormat, authHeaderName, authHeaderValue);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: request.headers,
      body: request.body
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        typeof data === "string" ? data : data.message || `HTTP ${response.status}`
      );
    }

    return data;
  }

  function buildRequest(payload, requestFormat, authHeaderName, authHeaderValue) {
    const headers = {};
    if (requestFormat === "json") {
      headers["Content-Type"] = "application/json";
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
    }

    if (authHeaderName && authHeaderValue) {
      headers[authHeaderName] = authHeaderValue;
    }

    let body;
    if (requestFormat === "json") {
      body = JSON.stringify(payload);
    } else {
      body = new URLSearchParams();
      body.set("message", payload.message);
      body.set("chatInput", payload.chatInput);
      body.set("sessionId", payload.sessionId);
      body.set("history", JSON.stringify(payload.history));
    }

    return { headers, body };
  }

  function extractReply(data) {
    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return extractReply(data[0]);
    }

    if (!data || typeof data !== "object") {
      return "Recibi una respuesta vacia del webhook.";
    }

    const candidates = [
      data.output,
      data.response,
      data.text,
      data.message,
      data.answer,
      data.reply,
      data.result,
      data.json?.output,
      data.json?.response,
      data.json?.text,
      data.json?.message,
      data.data?.output,
      data.data?.response,
      data.data?.text,
      data.data?.message,
      data.data?.json?.output,
      data.data?.json?.response,
      data.data?.json?.text,
      data.data?.json?.message
    ];

    const reply = candidates.find((value) => typeof value === "string" && value.trim());
    if (reply) {
      return reply;
    }

    return JSON.stringify(data, null, 2);
  }

  function buildWidget(config) {
    const widget = document.createElement("section");
    widget.className = SELECTORS.root;
    widget.setAttribute("aria-label", "Chat de asistencia");

    const avatarHtml = config.avatarUrl
      ? `<img src="${escapeHtml(config.avatarUrl)}" alt="${escapeHtml(config.title)}" class="n8n-chat-avatar-img" />`
      : botIcon();

    const toggleIconHtml = config.toggleImageUrl
      ? `<img src="${escapeHtml(config.toggleImageUrl)}" alt="Abrir chat" class="n8n-chat-toggle-img" />`
      : chatIcon();

    let hasDismissedTooltip = false;
    try {
      hasDismissedTooltip = window.sessionStorage.getItem("n8n-chat-tooltip-dismissed") === "true";
    } catch (_) { }

    const showTooltip = config.tooltipText && !hasDismissedTooltip;
    const tooltipHtml = showTooltip
      ? `
        <div class="n8n-chat-tooltip" role="tooltip">
          <span class="n8n-chat-tooltip-content">${escapeHtml(config.tooltipText)}</span>
          <button class="n8n-chat-tooltip-close" type="button" aria-label="Cerrar sugerencia">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `
      : "";

    widget.innerHTML = `
      <div class="${SELECTORS.panel}" role="dialog" aria-label="${escapeHtml(config.title)}">
        <header class="n8n-chat-header">
          <div class="n8n-chat-avatar" aria-hidden="true">${avatarHtml}</div>
          <div class="n8n-chat-heading">
            <h2 class="n8n-chat-title">${escapeHtml(config.title)}</h2>
            <p class="n8n-chat-subtitle">${escapeHtml(config.subtitle)}</p>
          </div>
          <button class="n8n-chat-close" type="button" aria-label="Cerrar chat">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </header>
        <div class="${SELECTORS.messages}" aria-live="polite"></div>
        <form class="n8n-chat-form">
          <textarea
            class="${SELECTORS.input}"
            rows="1"
            placeholder="${escapeHtml(config.placeholder)}"
            aria-label="Mensaje"
          ></textarea>
          <button class="${SELECTORS.send}" type="submit" aria-label="Enviar mensaje">
            ${sendIcon()}
          </button>
        </form>
      </div>
      ${tooltipHtml}
      <button class="n8n-chat-toggle" type="button" aria-label="Abrir chat">
        ${toggleIconHtml}
      </button>
    `;
    return widget;
  }

  function addMessage(container, type, text) {
    const message = document.createElement("div");
    message.className = `n8n-chat-message ${type}`;
    if (type.includes("error")) {
      message.textContent = text;
    } else {
      message.innerHTML = renderMarkdown(text);
    }
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
    return message;
  }

  function renderMarkdown(text) {
    if (typeof marked !== "undefined" && marked.parse) {
      try {
        if (!window._n8nChatMarkedConfigured) {
          marked.use({
            gfm: true,
            breaks: true,
            renderer: {
              link(first, title, text) {
                let hrefAttr = "";
                let titleAttr = "";
                let textContent = "";

                if (first && typeof first === "object") {
                  // marked v11.0.0+ API: link({ href, title, text })
                  hrefAttr = first.href || "";
                  titleAttr = first.title || "";
                  textContent = first.text || "";
                } else {
                  // Classic marked API: link(href, title, text)
                  hrefAttr = first || "";
                  titleAttr = title || "";
                  textContent = text || "";
                }

                return `<a href="${hrefAttr}" ${titleAttr ? `title="${titleAttr}"` : ""} target="_blank" rel="noopener noreferrer">${textContent}</a>`;
              }
            }
          });
          window._n8nChatMarkedConfigured = true;
        }
        return marked.parse(text);
      } catch (e) {
        console.error("N8NChatWidget markdown error:", e);
      }
    }
    return escapeHtml(text).replaceAll("\n", "<br>");
  }

  function addTyping(container) {
    const typing = document.createElement("div");
    typing.className = "n8n-chat-message bot n8n-chat-typing";
    typing.setAttribute("aria-label", "El asistente esta escribiendo");
    typing.innerHTML = "<span></span><span></span><span></span>";
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
    return typing;
  }

  function getSessionId(storageKey) {
    try {
      const current = window.localStorage.getItem(storageKey);
      if (current) {
        return current;
      }
      const next = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      window.localStorage.setItem(storageKey, next);
      return next;
    } catch (_) {
      return String(Date.now());
    }
  }

  function darkenColor(hex, amount) {
    const normalized = hex.replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
      return "#1d4ed8";
    }

    const value = parseInt(normalized, 16);
    const r = Math.max(0, (value >> 16) - amount);
    const g = Math.max(0, ((value >> 8) & 255) - amount);
    const b = Math.max(0, (value & 255) - amount);

    return `#${[r, g, b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function chatIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `;
  }

  function sendIcon() {
    return `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
        <path d="m4 12 16-8-5 16-3-7-8-1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="m12 13 8-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function botIcon() {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 9h8a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 5v4M9 14h.01M15 14h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `;
  }

  let markedLoadedPromise = null;
  function ensureMarked() {
    if (typeof marked !== "undefined") {
      return Promise.resolve();
    }
    if (markedLoadedPromise) {
      return markedLoadedPromise;
    }
    markedLoadedPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn("N8NChatWidget: No se pudo cargar marked.js desde el CDN.");
        resolve();
      };
      document.head.appendChild(script);
    });
    return markedLoadedPromise;
  }

  function injectStyles() {
    const id = "n8n-chat-widget-styles";
    if (document.getElementById(id)) {
      return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .n8n-chat-widget,
      .n8n-chat-widget * {
        box-sizing: border-box;
      }
      
      .n8n-chat-widget {
        --chat-primary: #2563eb;
        --chat-primary-dark: #1d4ed8;
        --chat-bg: #ffffff;
        --chat-border: #e5e7eb;
        --chat-muted: #64748b;
        --chat-text: #0f172a;
        --chat-panel-shadow: 0 24px 70px rgba(15, 23, 42, 0.22);
        
        --chat-panel-width: 390px;
        --chat-panel-height: 620px;
        --chat-panel-radius: 24px;
        --chat-header-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent), var(--chat-primary);
        --chat-header-text-color: #ffffff;
        --chat-title-size: 1.05rem;
        --chat-title-weight: 800;
        --chat-subtitle-size: 0.84rem;
        --chat-subtitle-color: rgba(255, 255, 255, 0.78);
        --chat-avatar-size: 42px;
        --chat-avatar-radius: 14px;
        --chat-avatar-bg: rgba(255, 255, 255, 0.18);
        --chat-avatar-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
        --chat-avatar-fit: cover;
        --chat-toggle-size: 62px;
        --chat-toggle-radius: 50%;
        --chat-toggle-icon-size: 28px;
        --chat-message-size: 0.94rem;
        --chat-message-radius: 18px;
        
        --chat-tooltip-bg: #ffffff;
        --chat-tooltip-text: #0f172a;

        position: fixed;
        right: max(18px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        z-index: 9999;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .n8n-chat-panel {
        position: absolute;
        right: 0;
        bottom: 0;
        width: min(var(--chat-panel-width), calc(100vw - 32px));
        height: min(var(--chat-panel-height), calc(100vh - 40px));
        display: grid;
        grid-template-rows: auto 1fr auto;
        overflow: hidden;
        border: 1px solid rgba(226, 232, 240, 0.9);
        border-radius: var(--chat-panel-radius);
        background: rgba(255, 255, 255, 0.92);
        box-shadow: var(--chat-panel-shadow);
        backdrop-filter: blur(18px);
        transform: translateY(16px) scale(0.97);
        transform-origin: bottom right;
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease;
      }

      .n8n-chat-widget.is-open .n8n-chat-panel {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: auto;
      }

      .n8n-chat-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px;
        color: var(--chat-header-text-color);
        background: var(--chat-header-bg);
      }

      .n8n-chat-avatar {
        width: var(--chat-avatar-size);
        height: var(--chat-avatar-size);
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        border-radius: var(--chat-avatar-radius);
        background: var(--chat-avatar-bg);
        box-shadow: var(--chat-avatar-shadow);
        overflow: var(--chat-avatar-overflow, hidden);
      }

      .n8n-chat-avatar svg {
        width: calc(var(--chat-avatar-size) * 0.55);
        height: calc(var(--chat-avatar-size) * 0.55);
      }

      .n8n-chat-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: var(--chat-avatar-fit, cover);
        border-radius: inherit;
      }

      .n8n-chat-heading {
        min-width: 0;
        flex: 1;
      }

      .n8n-chat-title {
        margin: 0;
        font-size: var(--chat-title-size);
        font-weight: var(--chat-title-weight);
      }

      .n8n-chat-subtitle {
        margin: 3px 0 0;
        color: var(--chat-subtitle-color);
        font-size: var(--chat-subtitle-size);
      }

      .n8n-chat-close {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 12px;
        color: var(--chat-header-text-color);
        background: rgba(255, 255, 255, 0.14);
        cursor: pointer;
      }

      .n8n-chat-close:hover {
        background: rgba(255, 255, 255, 0.22);
      }

      .n8n-chat-messages {
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        padding: 18px;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      }

      .n8n-chat-message {
        max-width: 82%;
        padding: 11px 13px;
        border-radius: var(--chat-message-radius);
        font-size: var(--chat-message-size);
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .n8n-chat-message.bot {
        align-self: flex-start;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 6px;
        color: var(--chat-text);
        background: #f8fafc;
      }

      .n8n-chat-message.user {
        align-self: flex-end;
        border-bottom-right-radius: 6px;
        color: #ffffff;
        background: linear-gradient(135deg, var(--chat-primary), var(--chat-primary-dark));
      }

      .n8n-chat-message p {
        margin: 0 0 8px 0;
      }

      .n8n-chat-message p:last-child {
        margin-bottom: 0;
      }

      .n8n-chat-message ul,
      .n8n-chat-message ol {
        margin: 0 0 8px 0;
        padding-left: 20px;
      }

      .n8n-chat-message ul:last-child,
      .n8n-chat-message ol:last-child {
        margin-bottom: 0;
      }

      .n8n-chat-message li {
        margin-bottom: 4px;
      }

      .n8n-chat-message li:last-child {
        margin-bottom: 0;
      }

      .n8n-chat-message a {
        color: inherit;
        text-decoration: underline;
        font-weight: 500;
      }

      .n8n-chat-message.bot a {
        color: var(--chat-primary);
      }

      .n8n-chat-message.user a {
        color: #ffffff;
      }

      .n8n-chat-message code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.88em;
        background: rgba(0, 0, 0, 0.05);
        padding: 2px 4px;
        border-radius: 4px;
      }

      .n8n-chat-message.user code {
        background: rgba(255, 255, 255, 0.2);
      }

      .n8n-chat-message pre {
        margin: 8px 0;
        padding: 10px;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 8px;
        overflow-x: auto;
      }

      .n8n-chat-message.user pre {
        background: rgba(255, 255, 255, 0.15);
      }

      .n8n-chat-message pre code {
        background: transparent;
        padding: 0;
        border-radius: 0;
      }

      .n8n-chat-message.error {
        border-color: #fecaca;
        color: #991b1b;
        background: #fff1f2;
      }

      .n8n-chat-typing {
        width: 58px;
        display: flex;
        gap: 5px;
        align-items: center;
        justify-content: center;
        padding: 13px;
      }

      .n8n-chat-typing span {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #94a3b8;
        animation: n8nTyping 1s infinite ease-in-out;
      }

      .n8n-chat-typing span:nth-child(2) {
        animation-delay: 120ms;
      }

      .n8n-chat-typing span:nth-child(3) {
        animation-delay: 240ms;
      }

      @keyframes n8nTyping {
        0%,
        80%,
        100% {
          transform: translateY(0);
          opacity: 0.45;
        }

        40% {
          transform: translateY(-4px);
          opacity: 1;
        }
      }

      .n8n-chat-form {
        display: flex;
        gap: 10px;
        align-items: end;
        padding: 14px;
        border-top: 1px solid var(--chat-border);
        background: rgba(255, 255, 255, 0.84);
      }

      .n8n-chat-input {
        min-height: 46px;
        max-height: 120px;
        width: 100%;
        resize: none;
        border: 1px solid #dbe3ee;
        border-radius: 16px;
        padding: 13px 14px;
        color: var(--chat-text);
        background: #ffffff;
        font: inherit;
        font-size: 0.94rem;
        outline: none;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease;
      }

      .n8n-chat-input:focus {
        border-color: color-mix(in srgb, var(--chat-primary) 55%, #ffffff);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--chat-primary) 14%, transparent);
      }

      /* Scrollbar personalisada */
      .n8n-chat-messages::-webkit-scrollbar,
      .n8n-chat-input::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .n8n-chat-messages::-webkit-scrollbar-track,
      .n8n-chat-input::-webkit-scrollbar-track {
        background: transparent;
      }

      .n8n-chat-messages::-webkit-scrollbar-thumb,
      .n8n-chat-input::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 99px;
      }

      .n8n-chat-messages::-webkit-scrollbar-thumb:hover,
      .n8n-chat-input::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      .n8n-chat-send {
        width: 46px;
        height: 46px;
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        border: 0;
        border-radius: 16px;
        color: #ffffff;
        background: var(--chat-primary);
        cursor: pointer;
        box-shadow: 0 10px 22px color-mix(in srgb, var(--chat-primary) 28%, transparent);
        transition:
          background 160ms ease,
          transform 160ms ease;
      }

      .n8n-chat-send:hover {
        background: var(--chat-primary-dark);
        transform: translateY(-1px);
      }

      .n8n-chat-send:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
      }

      .n8n-chat-toggle {
        width: var(--chat-toggle-size);
        height: var(--chat-toggle-size);
        display: grid;
        place-items: center;
        border: 0;
        border-radius: var(--chat-toggle-radius);
        color: #ffffff;
        background: var(--chat-toggle-bg, linear-gradient(135deg, var(--chat-primary), var(--chat-primary-dark)));
        box-shadow: var(--chat-toggle-shadow, 0 18px 36px color-mix(in srgb, var(--chat-primary) 34%, transparent));
        cursor: pointer;
        transform-origin: center;
        opacity: 1;
        transition:
          transform 180ms ease,
          opacity 180ms ease,
          box-shadow 180ms ease;
      }

      .n8n-chat-widget.is-open .n8n-chat-toggle {
        opacity: 0;
        transform: scale(0.8);
        pointer-events: none;
      }

      .n8n-chat-toggle:hover {
        transform: translateY(-2px);
        box-shadow: var(--chat-toggle-hover-shadow, 0 22px 42px color-mix(in srgb, var(--chat-primary) 42%, transparent));
      }

      .n8n-chat-toggle svg {
        width: var(--chat-toggle-icon-size);
        height: var(--chat-toggle-icon-size);
        transition: transform 180ms ease;
      }

      .n8n-chat-toggle:hover svg {
        transform: scale(1.08);
      }

      .n8n-chat-toggle-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: inherit;
        transition: transform 180ms ease, filter 180ms ease;
      }

      .n8n-chat-toggle:hover .n8n-chat-toggle-img {
        transform: scale(1.08);
        filter: drop-shadow(0 12px 20px rgba(15, 23, 42, 0.18));
      }

      .n8n-chat-tooltip {
        position: absolute;
        right: calc(100% + 14px);
        bottom: 12px;
        background: var(--chat-tooltip-bg, #ffffff);
        color: var(--chat-tooltip-text, #0f172a);
        padding: 10px 14px;
        padding-right: 32px;
        border-radius: 12px;
        font-size: 0.88rem;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(226, 232, 240, 0.8);
        white-space: normal;
        width: max-content;
        max-width: 260px;
        opacity: 1;
        transform: translateY(0) scale(1);
        transform-origin: right center;
        transition: opacity 180ms ease, transform 180ms ease, visibility 180ms;
        z-index: 9998;
      }

      .n8n-chat-tooltip.is-hidden {
        opacity: 0;
        transform: translateY(8px) scale(0.9);
        pointer-events: none;
        visibility: hidden;
      }

      .n8n-chat-tooltip::after {
        content: "";
        position: absolute;
        right: -6px;
        bottom: 15px;
        width: 10px;
        height: 10px;
        background: var(--chat-tooltip-bg, #ffffff);
        transform: rotate(45deg);
        border-right: 1px solid rgba(226, 232, 240, 0.8);
        border-top: 1px solid rgba(226, 232, 240, 0.8);
      }

      .n8n-chat-tooltip-close {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        padding: 2px;
        display: grid;
        place-items: center;
        border-radius: 4px;
        transition: color 150ms ease, background 150ms ease;
      }

      .n8n-chat-tooltip-close:hover {
        color: #475569;
        background: rgba(0, 0, 0, 0.05);
      }

      .n8n-chat-widget.is-open .n8n-chat-tooltip {
        opacity: 0;
        transform: translateY(8px) scale(0.9);
        pointer-events: none;
        visibility: hidden;
      }

      @media (max-width: 520px) {
        .n8n-chat-widget {
          right: 12px;
          bottom: 12px;
          left: 12px;
        }

        .n8n-chat-panel {
          right: 0;
          left: 0;
          width: auto;
          height: min(var(--chat-panel-height), calc(100vh - 24px));
          border-radius: 22px;
        }

        .n8n-chat-toggle {
          margin-left: auto;
        }

        .n8n-chat-tooltip {
          right: 0;
          left: auto;
          bottom: calc(100% + 14px);
          width: max-content;
          max-width: calc(100vw - 32px);
          transform-origin: center bottom;
        }

        .n8n-chat-tooltip::after {
          right: 24px;
          bottom: -6px;
          border-right: 1px solid rgba(226, 232, 240, 0.8);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          border-top: none;
        }
      }

      .n8n-chat-message img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 6px 0;
        display: block;
      }

      .n8n-chat-message table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
        font-size: 0.9em;
      }

      .n8n-chat-message th,
      .n8n-chat-message td {
        border: 1px solid #e2e8f0;
        padding: 6px 10px;
        text-align: left;
      }

      .n8n-chat-message th {
        background-color: rgba(0, 0, 0, 0.03);
        font-weight: 600;
      }

      .n8n-chat-message.user th,
      .n8n-chat-message.user td {
        border-color: rgba(255, 255, 255, 0.2);
      }

      .n8n-chat-message.user th {
        background-color: rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  }

  window.N8NChatWidget = { init };
})();
