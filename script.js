
"use strict";

// ========================================
// RIKA AI - SCRIPT.JS
// Kết nối Cloudflare Worker -> OpenRouter
// ========================================

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const chatForm = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector(".sidebar");

let welcomeBox = document.getElementById("welcomeBox");
let messages = [];
let busy = false;

// THAY BẰNG URL WORKER ĐẦY ĐỦ CỦA BẠN
const API_URL =
  "https://rika-ai-api.nguyentiendungdz765hd.workers.dev";

// ========================================
// HIỂN THỊ TIN NHẮN
// ========================================

function addMessage(text, role, extraClass = "") {
  const div = document.createElement("div");

  div.className = `message ${role} ${extraClass}`;
  div.textContent = text;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  return div;
}

// ========================================
// GỌI RIKA AI QUA CLOUDFLARE WORKER
// ========================================

async function askAI(conversation) {
  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: conversation
      })
    });
  } catch (error) {
    throw new Error(
      "Không kết nối được Rika AI. " +
      "Hãy kiểm tra mạng và địa chỉ Cloudflare Worker."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || "Không có thông tin chi tiết.";

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

  if (welcomeBox?.isConnected) {
    welcomeBox.remove();
  }

  addMessage(text, "user");

  // Lưu số lượng tin nhắn trước yêu cầu hiện tại
  const previousLength = messages.length;

  messages.push({
    role: "user",
    content: text
  });

  userInput.value = "";
  userInput.style.height = "auto";

  busy = true;
  sendBtn.disabled = true;

  const loading = addMessage(
    "Rika AI đang suy nghĩ...",
    "ai"
  );

  try {
    const answer = await askAI(messages);

    loading.textContent = answer;

    messages.push({
      role: "assistant",
      content: answer
    });
  } catch (error) {
    loading.textContent =
      error.message || "Đã xảy ra lỗi. Vui lòng thử lại.";

    loading.classList.add("error");

    // Giữ nội dung người dùng để thử gửi lại
    messages.splice(previousLength);
    userInput.value = text;
    userInput.focus();
  } finally {
    busy = false;
    sendBtn.disabled = false;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// ========================================
// SỰ KIỆN FORM
// ========================================

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

// Tự điều chỉnh chiều cao ô nhập
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";

  userInput.style.height =
    Math.min(userInput.scrollHeight, 150) + "px";
});

// Enter để gửi, Shift + Enter để xuống dòng
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
// MÀN HÌNH CHÀO MỪNG
// ========================================

function renderWelcome() {
  const welcome = document.createElement("div");
  welcome.className = "welcome";
  welcome.id = "welcomeBox";

  const logo = document.createElement("div");
  logo.className = "logo";
  logo.textContent = "✦";

  const title = document.createElement("h1");
  title.textContent = "Xin chào! 👋";

  const description = document.createElement("p");
  description.textContent =
    "Mình là Rika AI. Hôm nay mình có thể giúp gì cho bạn?";

  const suggestions = document.createElement("div");
  suggestions.className = "suggestions";

  const suggestionItems = [
    {
      label: "💻 Giúp tôi viết code",
      prompt: "Giúp tôi viết code"
    },
    {
      label: "📚 Giải thích kiến thức",
      prompt: "Giải thích cho tôi một kiến thức"
    },
    {
      label: "💡 Lên ý tưởng mới",
      prompt: "Giúp tôi lên một ý tưởng mới"
    }
  ];

  suggestionItems.forEach((item) => {
    const button = document.createElement("button");

    button.className = "suggestion";
    button.type = "button";
    button.textContent = item.label;

    button.addEventListener("click", () => {
      userInput.value = item.prompt;
      userInput.focus();

      userInput.dispatchEvent(new Event("input"));
    });

    suggestions.appendChild(button);
  });

  welcome.append(
    logo,
    title,
    description,
    suggestions
  );

  chatBox.appendChild(welcome);
  welcomeBox = welcome;
}

// ========================================
// CUỘC TRÒ CHUYỆN MỚI
// ========================================

newChatBtn.addEventListener("click", () => {
  if (busy) return;

  messages = [];

  chatBox.replaceChildren();
  renderWelcome();

  userInput.value = "";
  userInput.style.height = "auto";

  sidebar?.classList.remove("open");
});

// ========================================
// MENU BÊN
// ========================================

menuBtn.addEventListener("click", () => {
  sidebar?.classList.toggle("open");
});

// ========================================
// KHỞI TẠO
// ========================================

if (!chatBox || !userInput || !chatForm || !sendBtn) {
  console.error(
    "Rika AI: Không tìm thấy một số phần tử HTML cần thiết. " +
    "Hãy kiểm tra ID trong index.html."
  );
}
