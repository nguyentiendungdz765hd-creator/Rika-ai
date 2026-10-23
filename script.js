
"use strict";

// ========================================
// RIKA AI - SCRIPT.JS
// GitHub Pages -> Cloudflare Worker -> OpenRouter
// Có chế độ bí mật: EM GÁI MƯA 🌧️
// ========================================

const $ = (selector) => document.querySelector(selector);

const chatBox = $("#chatBox");
const userInput = $("#userInput");
const chatForm = $("#chatForm");
const sendBtn = $("#sendBtn");
const newChatBtn = $("#newChatBtn");
const menuBtn = $("#menuBtn");
const sidebar = $(".sidebar");
const historyList = $("#historyList");
const sidebarOverlay = $("#sidebarOverlay");
const closeSidebarBtn = $("#closeSidebarBtn");

const API_URL =
  "https://rika-ai-api.nguyentiendungdz765hd.workers.dev";

const STORAGE_KEY = "rika_ai_conversations_v2";
const MODE_KEY = "rikaMode";

const MAX_HISTORY = 40;
const MAX_MESSAGES_PER_CHAT = 100;

let conversations = [];
let currentChatId = null;
let messages = [];
let busy = false;

// ========================================
// CHẾ ĐỘ BÍ MẬT: EM GÁI MƯA 🌧️
// ========================================

function readRikaMode() {
  try {
    return localStorage.getItem(MODE_KEY) === "em-gai-mua"
      ? "em-gai-mua"
      : "normal";
  } catch (error) {
    return "normal";
  }
}

let rikaMode = readRikaMode();

function saveRikaMode(mode) {
  rikaMode = mode;

  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch (error) {
    console.warn("Không lưu được chế độ Rika:", error);
  }
}

function getSecretCommand(message) {
  const command = message.trim().toLowerCase();

  if (command === "dungxha") return "activate";
  if (command === "rika normal") return "normal";

  return null;
}

function getSecretReply(command) {
  if (command === "activate") {
    return (
      "Ơiii~ Anh gọi em đó hảaa? 🥺🌧️\n\n" +
      "Từ giờ em sẽ trò chuyện dễ thương, quan tâm " +
      "và nhõng nhẽo nhẹ với anh nhaaa! 💗\n\n" +
      "Anh muốn kể em nghe chuyện gì nèee? ✨"
    );
  }

  return (
    "Okii nè! ✨ Em đã trở về chế độ Rika AI bình thường rồi nha. " +
    "Mình tiếp tục trò chuyện như trước nhé! 💜"
  );
}

// ========================================
// KIỂM TRA HTML
// ========================================

if (
  !chatBox ||
  !userInput ||
  !chatForm ||
  !sendBtn ||
  !newChatBtn ||
  !historyList
) {
  console.error(
    "Rika AI: Thiếu phần tử HTML cần thiết. " +
    "Hãy kiểm tra lại index.html."
  );

  throw new Error("Không thể khởi tạo giao diện Rika AI.");
}

// ========================================
// TIỆN ÍCH
// ========================================

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function closeSidebar() {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("visible");
}

function openSidebar() {
  sidebar?.classList.add("open");
  sidebarOverlay?.classList.add("visible");
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setInputHeight() {
  userInput.style.height = "auto";
  userInput.style.height =
    Math.min(userInput.scrollHeight, 150) + "px";
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  });
}

// ========================================
// LƯU VÀ ĐỌC LỊCH SỬ
// ========================================

function saveHistory() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations)
    );

    return true;
  } catch (error) {
    console.error("Không thể lưu lịch sử:", error);
    return false;
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return;

    const data = JSON.parse(raw);

    if (!Array.isArray(data)) return;

    conversations = data
      .filter((chat) =>
        chat &&
        typeof chat.id === "string" &&
        Array.isArray(chat.messages)
      )
      .map((chat) => ({
        id: chat.id,

        title:
          typeof chat.title === "string"
            ? chat.title.slice(0, 100)
            : "Cuộc trò chuyện mới",

        updatedAt:
          Number.isFinite(chat.updatedAt)
            ? chat.updatedAt
            : Date.now(),

        messages: chat.messages
          .filter((message) =>
            message &&
            ["user", "assistant"].includes(message.role) &&
            typeof message.content === "string"
          )
          .slice(-MAX_MESSAGES_PER_CHAT)
      }))
      .slice(0, MAX_HISTORY);

    conversations.sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  } catch (error) {
    console.error("Không đọc được lịch sử chat:", error);
    conversations = [];
  }
}

function getCurrentChat() {
  return conversations.find(
    (chat) => chat.id === currentChatId
  );
}

function createChat() {
  const chat = {
    id: createId(),
    title: "Cuộc trò chuyện mới",
    updatedAt: Date.now(),
    messages: []
  };

  conversations.unshift(chat);
  conversations = conversations.slice(0, MAX_HISTORY);

  currentChatId = chat.id;
  messages = chat.messages;

  saveHistory();
  renderHistory();
  renderMessages();

  return chat;
}

function updateChatTitle(chat) {
  const firstUserMessage = chat.messages.find(
    (message) => message.role === "user"
  );

  if (firstUserMessage) {
    chat.title =
      firstUserMessage.content
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 45) || "Cuộc trò chuyện mới";
  }
}

function persistCurrentChat() {
  const chat = getCurrentChat();

  if (!chat) return;

  chat.messages = messages;
  chat.updatedAt = Date.now();

  updateChatTitle(chat);

  conversations.sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  saveHistory();
  renderHistory();
}

// ========================================
// DANH SÁCH CHAT
// ========================================

function renderHistory() {
  historyList.replaceChildren();

  if (conversations.length === 0) {
    const empty = document.createElement("div");

    empty.className = "history-empty";
    empty.textContent =
      "Chưa có cuộc trò chuyện nào. " +
      "Hãy bắt đầu trò chuyện với Rika AI!";

    historyList.appendChild(empty);
    return;
  }

  conversations.forEach((chat) => {
    const item = document.createElement("div");
    item.className = "history-item";

    if (chat.id === currentChatId) {
      item.classList.add("active");
    }

    const openButton = document.createElement("button");

    openButton.type = "button";
    openButton.className = "history-open";
    openButton.textContent = chat.title;
    openButton.title =
      chat.title + " · " + formatDate(chat.updatedAt);

    openButton.addEventListener("click", () => {
      switchChat(chat.id);
    });

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "history-delete";
    deleteButton.textContent = "✕";

    deleteButton.setAttribute(
      "aria-label",
      "Xóa cuộc trò chuyện " + chat.title
    );

    deleteButton.title = "Xóa cuộc trò chuyện";

    deleteButton.addEventListener("click", () => {
      deleteChat(chat.id);
    });

    item.append(openButton, deleteButton);
    historyList.appendChild(item);
  });
}

function switchChat(id) {
  if (busy) return;

  const chat = conversations.find(
    (item) => item.id === id
  );

  if (!chat) return;

  currentChatId = chat.id;
  messages = chat.messages;

  renderHistory();
  renderMessages();
  closeSidebar();

  userInput.value = "";
  setInputHeight();
}

function deleteChat(id) {
  if (busy) return;

  const chat = conversations.find(
    (item) => item.id === id
  );

  if (!chat) return;

  const confirmed = window.confirm(
    'Bạn có chắc muốn xóa cuộc trò chuyện "' +
    chat.title +
    '" không?'
  );

  if (!confirmed) return;

  conversations = conversations.filter(
    (item) => item.id !== id
  );

  if (currentChatId === id) {
    currentChatId = null;
    messages = [];
  }

  saveHistory();
  renderHistory();
  renderMessages();
}

// ========================================
// HIỂN THỊ MARKDOWN AN TOÀN
// ========================================

function renderInline(text) {
  let output = escapeHTML(text);

  output = output.replace(
    /`([^`\n]+)`/g,
    "<code>$1</code>"
  );

  output = output.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );

  output = output.replace(
    /__(.+?)__/g,
    "<strong>$1</strong>"
  );

  output = output.replace(
    /(^|[^*])\*([^*\n]+)\*/g,
    "$1<em>$2</em>"
  );

  return output;
}

function renderMarkdown(source) {
  const lines = String(source)
    .replace(/\r/g, "")
    .split("\n");

  const output = [];

  let paragraph = [];
  let listType = null;
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];

  function flushParagraph() {
    if (paragraph.length) {
      output.push(
        "<p>" +
        paragraph.map(renderInline).join("<br>") +
        "</p>"
      );

      paragraph = [];
    }
  }

  function closeList() {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  }

  function openList(type) {
    if (listType !== type) {
      closeList();
      listType = type;
      output.push(`<${type}>`);
    }
  }

  function closeCodeBlock() {
    const code = escapeHTML(codeLines.join("\n"));

    output.push(
      '<pre><div class="code-header">' +
      "<span>" + escapeHTML(codeLanguage) + "</span>" +
      '<button type="button" class="copy-btn" data-copy-code>' +
      "Sao chép code" +
      "</button></div>" +
      "<code>" + code + "</code></pre>"
    );

    inCode = false;
    codeLines = [];
  }

  for (const line of lines) {
    const fence = line.match(/^\s*```([\w.+#-]*)\s*$/);

    if (fence) {
      flushParagraph();
      closeList();

      if (!inCode) {
        inCode = true;
        codeLanguage = fence[1] || "code";
        codeLines = [];
      } else {
        closeCodeBlock();
      }

      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);

    if (heading) {
      flushParagraph();
      closeList();

      const level = heading[1].length;

      output.push(
        `<h${level}>${renderInline(heading[2])}</h${level}>`
      );

      continue;
    }

    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      flushParagraph();
      closeList();
      output.push("<hr>");
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);

    if (unordered) {
      flushParagraph();
      openList("ul");

      output.push(
        "<li>" + renderInline(unordered[1]) + "</li>"
      );

      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (ordered) {
      flushParagraph();
      openList("ol");

      output.push(
        "<li>" + renderInline(ordered[1]) + "</li>"
      );

      continue;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);

    if (quote) {
      flushParagraph();
      closeList();

      output.push(
        "<blockquote>" +
        renderInline(quote[1]) +
        "</blockquote>"
      );

      continue;
    }

    closeList();
    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  if (inCode) {
    closeCodeBlock();
  }

  return output.join("");
}

// ========================================
// HIỂN THỊ TIN NHẮN
// ========================================

function addMessage(text, role, options = {}) {
  const div = document.createElement("div");

  div.className = "message " + role;

  if (options.loading) {
    div.classList.add("loading");
    div.textContent = text;
  } else if (role === "user") {
    div.textContent = text;
  } else if (role === "ai") {
    div.innerHTML = renderMarkdown(text);

    if (options.actions) {
      const actions = document.createElement("div");
      actions.className = "message-actions";

      const copyButton = document.createElement("button");

      copyButton.type = "button";
      copyButton.className = "copy-btn";
      copyButton.textContent = "Sao chép câu trả lời";
      copyButton.dataset.copyMessage = "true";

      actions.appendChild(copyButton);
      div.appendChild(actions);
    }
  } else {
    div.textContent = text;
  }

  chatBox.appendChild(div);
  scrollToBottom();

  return div;
}

function renderWelcome() {
  const welcome = document.createElement("div");

  welcome.className = "welcome";
  welcome.id = "welcomeBox";

  const logo = document.createElement("div");

  logo.className = "welcome-logo";
  logo.textContent = "✦";

  const title = document.createElement("h1");
  title.textContent = "Xin chào! 👋";

  const description = document.createElement("p");

  description.textContent =
    "Mình là Rika AI. Hôm nay mình có thể giúp gì cho bạn?";

  const suggestions = document.createElement("div");
  suggestions.className = "suggestions";

  const items = [
    [
      "⌨",
      "Giúp tôi viết code",
      "Giúp tôi viết code và giải thích từng bước."
    ],
    [
      "📚",
      "Giải thích kiến thức",
      "Giải thích cho tôi một kiến thức theo cách dễ hiểu."
    ],
    [
      "💡",
      "Lên ý tưởng mới",
      "Giúp tôi lên một ý tưởng mới thật sáng tạo."
    ]
  ];

  items.forEach(([icon, label, prompt]) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "suggestion";

    const iconSpan = document.createElement("span");
    iconSpan.textContent = icon;

    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;

    button.append(iconSpan, labelSpan);

    button.addEventListener("click", () => {
      userInput.value = prompt;
      setInputHeight();
      userInput.focus();
    });

    suggestions.appendChild(button);
  });

  welcome.append(logo, title, description, suggestions);
  chatBox.appendChild(welcome);
}

function renderMessages() {
  chatBox.replaceChildren();

  if (messages.length === 0) {
    renderWelcome();
    return;
  }

  messages.forEach((message) => {
    addMessage(message.content, message.role, {
      actions: message.role === "assistant"
    });
  });

  scrollToBottom();
}

// ========================================
// SAO CHÉP CÂU TRẢ LỜI VÀ CODE
// ========================================

async function copyText(text, button) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const temporary = document.createElement("textarea");

      temporary.value = text;
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";

      document.body.appendChild(temporary);
      temporary.select();

      const success = document.execCommand("copy");
      temporary.remove();

      if (!success) {
        throw new Error("Không thể sao chép.");
      }
    }

    const previous = button.textContent;
    button.textContent = "Đã sao chép!";

    setTimeout(() => {
      if (button.isConnected) {
        button.textContent = previous;
      }
    }, 1500);
  } catch (error) {
    console.error("Lỗi sao chép:", error);
    button.textContent = "Không sao chép được";
  }
}

chatBox.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) return;

  if (button.hasAttribute("data-copy-code")) {
    const pre = button.closest("pre");
    const code = pre?.querySelector("code");

    if (code) {
      copyText(code.textContent, button);
    }

    return;
  }

  if (button.hasAttribute("data-copy-message")) {
    const messageElement = button.closest(".message.ai");

    if (!messageElement) return;

    const clone = messageElement.cloneNode(true);

    clone.querySelectorAll(".message-actions").forEach(
      (element) => element.remove()
    );

    copyText(clone.innerText, button);
  }
});

// ========================================
// GỌI RIKA AI QUA CLOUDFLARE WORKER
// ========================================

async function askAI(conversation) {
  let response;

  const apiMessages = [];

  // Thêm chỉ dẫn riêng khi đang ở chế độ em gái mưa
  if (rikaMode === "em-gai-mua") {
    apiMessages.push({
      role: "system",
      content:
        "Bạn là Rika AI đang ở chế độ Em Gái Mưa. " +
        "Hãy trò chuyện bằng tiếng Việt với phong cách " +
        "dễ thương, ấm áp, quan tâm, vui vẻ và hơi " +
        "nhõng nhẽo nhẹ. Có thể sử dụng emoji vừa phải " +
        "như 🌧️💗🥺✨. Xưng hô tự nhiên theo ngữ cảnh. " +
        "Luôn trả lời hữu ích, chính xác, rõ ràng và " +
        "giúp người dùng giải quyết vấn đề. " +
        "Không để phong cách dễ thương làm giảm chất lượng " +
        "câu trả lời. Không tự nhận mình là con người thật."
    });
  }

  apiMessages.push(...conversation);

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: apiMessages
      })
    });
  } catch (error) {
    throw new Error(
      "Không kết nối được Rika AI. Hãy kiểm tra mạng " +
      "và địa chỉ Cloudflare Worker."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      typeof data.error === "string"
        ? data.error
        : data.error?.message ||
          "Không có thông tin chi tiết.";

    if (response.status === 401) {
      throw new Error(
        "API key không hợp lệ. Hãy kiểm tra Secret trên Cloudflare."
      );
    }

    if (response.status === 402) {
      throw new Error(
        "OpenRouter yêu cầu kiểm tra tín dụng hoặc điều kiện sử dụng."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "Yêu cầu bị từ chối. Hãy kiểm tra quyền truy cập API."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Đã đạt giới hạn yêu cầu. Vui lòng thử lại sau."
      );
    }

    throw new Error(
      `Rika AI gặp lỗi ${response.status}: ${detail}`
    );
  }

  const answer = data.choices?.[0]?.message?.content;

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error(
      "Rika AI chưa trả về câu trả lời hợp lệ."
    );
  }

  return answer.trim();
}

// ========================================
// GỬI TIN NHẮN
// ========================================

async function sendMessage() {
  const text = userInput.value.trim();

  if (!text || busy) return;

  // Tạo chat mới nếu chưa có cuộc trò chuyện
  let chat = getCurrentChat();

  if (!chat) {
    chat = createChat();
  }

  // Nhận diện mật mã trước khi gọi API
  const secretCommand = getSecretCommand(text);

  if (secretCommand) {
    const newMode =
      secretCommand === "activate"
        ? "em-gai-mua"
        : "normal";

    // Nếu chat đã đầy, tạo chat mới để lưu lệnh
    if (messages.length >= MAX_MESSAGES_PER_CHAT) {
      currentChatId = null;
      messages = [];
      chat = createChat();
    }

    saveRikaMode(newMode);

    messages.push({
      role: "user",
      content: text
    });

    addMessage(text, "user");

    userInput.value = "";
    setInputHeight();

    const reply = getSecretReply(secretCommand);

    messages.push({
      role: "assistant",
      content: reply
    });

    persistCurrentChat();
    addMessage(reply, "ai", { actions: true });

    return;
  }

  // Giới hạn số tin nhắn gửi lên API
  if (messages.length >= MAX_MESSAGES_PER_CHAT) {
    addMessage(
      "Cuộc trò chuyện đã đạt giới hạn lưu tin nhắn. " +
      "Hãy tạo cuộc trò chuyện mới để tiếp tục.",
      "error"
    );

    return;
  }

  busy = true;
  sendBtn.disabled = true;
  userInput.disabled = true;

  const previousLength = messages.length;

  messages.push({
    role: "user",
    content: text
  });

  addMessage(text, "user");

  userInput.value = "";
  setInputHeight();

  persistCurrentChat();

  const loading = addMessage(
    "Rika AI đang suy nghĩ...",
    "ai",
    { loading: true }
  );

  try {
    const answer = await askAI(messages);

    loading.remove();

    messages.push({
      role: "assistant",
      content: answer
    });

    persistCurrentChat();

    addMessage(answer, "ai", { actions: true });
  } catch (error) {
    loading.textContent =
      error.message || "Đã xảy ra lỗi. Vui lòng thử lại.";

    loading.classList.remove("loading");
    loading.classList.add("error");

    // Bỏ tin nhắn chưa được trả lời để người dùng thử lại
    messages.splice(previousLength);

    persistCurrentChat();

    userInput.value = text;
    setInputHeight();
  } finally {
    busy = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
    scrollToBottom();
  }
}

// ========================================
// CUỘC TRÒ CHUYỆN MỚI
// ========================================

function startNewChat() {
  if (busy) return;

  currentChatId = null;
  messages = [];

  renderMessages();
  renderHistory();

  userInput.value = "";
  setInputHeight();

  closeSidebar();
  userInput.focus();
}

newChatBtn.addEventListener("click", startNewChat);

// ========================================
// FORM VÀ Ô NHẬP
// ========================================

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

userInput.addEventListener("input", setInputHeight);

userInput.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
    event.preventDefault();

    if (typeof chatForm.requestSubmit === "function") {
      chatForm.requestSubmit();
    } else {
      sendMessage();
    }
  }
});

// ========================================
// MENU ĐIỆN THOẠI
// ========================================

menuBtn?.addEventListener("click", () => {
  if (sidebar?.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

closeSidebarBtn?.addEventListener("click", closeSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);

// ========================================
// KHỞI ĐỘNG
// ========================================

loadHistory();
renderHistory();
renderMessages();

console.log(
  "Rika AI đã sẵn sàng. Chế độ hiện tại:",
  rikaMode
);
