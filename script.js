const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeBox = document.getElementById('welcomeBox');
const newChatBtn = document.getElementById('newChatBtn');

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Làm mới cuộc trò chuyện
newChatBtn.addEventListener('click', () => {
    chatBox.innerHTML = `
        <div class="welcome-box" id="welcomeBox">
            <h1>Xin chào! Mình là Rika 👋</h1>
            <p>Trợ lý AI cá nhân của bạn. Hôm nay mình có thể giúp gì cho bạn?</p>
        </div>
    `;
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Ẩn bảng chào mừng ở lần nhắn đầu tiên
    const currentWelcome = document.getElementById('welcomeBox');
    if (currentWelcome) currentWelcome.remove();

    appendMessage(text, 'user-message');
    userInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = appendMessage('Rika đang soạn câu trả lời...', 'ai-message');

    let reply = "";
    const t = text.toLowerCase();

    // Hệ thống phản hồi từ khóa linh hoạt của Rika
    if (t.includes('chào') || t.includes('hi') || t.includes('hello')) {
        reply = "Chào bạn! Rika rất vui được gặp bạn trên trang web AI này.";
    } else if (t.includes('tên') || t.includes('bạn là ai')) {
        reply = "Mình là Rika - Trợ lý AI cá nhân được xây dựng trên trang web riêng của bạn!";
    } else if (t.includes('làm được gì') || t.includes('giúp')) {
        reply = "Rika có thể trò chuyện, giải đáp thắc mắc và đồng hành cùng bạn trong các ý tưởng công nghệ!";
    } else {
        reply = `Rika đã lắng nghe câu hỏi: "${text}". Đây là một chủ đề rất hay! Trang web AI của bạn đang chạy rất mượt và chuẩn chỉnh rồi đấy.`;
    }

    setTimeout(() => {
        const loadingElem = document.getElementById(loadingId);
        if (loadingElem) loadingElem.remove();
        appendMessage(reply, 'ai-message');
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 600);
}

function appendMessage(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.innerText = text;
    const id = 'msg_' + Date.now();
    messageDiv.id = id;
    chatBox.appendChild(messageDiv);
    return id;
}
