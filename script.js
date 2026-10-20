const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');

// ====== DÁN API KEY CỦA BẠN VÀO ĐÂY ======
const GEMINI_API_KEY = 'AQ.Ab8RN6JpbpQIVKJuH_bajOTAwQO6k9REG2tUMw2BEK__7VmyKg';
// =========================================

// Model 1.5-flash: Siêu tốc, ổn định và ko bị lỗi trên key mới
const MODEL = 'gemini-1.5-flash'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

let conversationHistory = [];

const SYSTEM_PROMPT = `Bạn là Rika, một trợ lý AI thân thiện, thông minh và hữu ích. Trả lời bằng tiếng Việt tự nhiên, ngắn gọn nhưng đầy đủ ý.`;

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) sendMessage();
});

newChatBtn.addEventListener('click', () => {
    conversationHistory = [];
    chatBox.innerHTML = `
        <div class="welcome-box" id="welcomeBox">
            <h1>Xin chào! Mình là Rika 👋</h1>
            <p>Trợ lý AI cá nhân của bạn. Hôm nay mình có thể giúp gì cho bạn?</p>
        </div>
    `;
    userInput.value = '';
    userInput.focus();
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('DÁN_KEY')) {
        alert('Bạn chưa điền Gemini API key vào script.js!');
        return;
    }

    const welcome = document.getElementById('welcomeBox');
    if (welcome) welcome.remove();

    appendMessage(text, 'user-message');
    userInput.value = '';
    scrollToBottom();

    sendBtn.disabled = true;
    userInput.disabled = true;

    const aiBubble = document.createElement('div');
    aiBubble.className = 'message ai-message';
    aiBubble.textContent = 'Rika đang suy nghĩ...';
    chatBox.appendChild(aiBubble);
    scrollToBottom();

    conversationHistory.push({ role: 'user', content: text });

    try {
        const contents = conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                contents: contents
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `Lỗi HTTP ${response.status}`);
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '(Không có phản hồi)';

        aiBubble.textContent = '';
        await typeWriter(aiBubble, reply);

        conversationHistory.push({ role: 'assistant', content: reply });

    } catch (error) {
        console.error('Lỗi:', error);
        if (error.message.includes('Failed to fetch')) {
            aiBubble.textContent = '⚠️ Lỗi Mạng: Nếu bạn đang xem trên Spck Preview, hãy chuyển sang mở bằng trình duyệt Chrome/Safari. Khi đưa lên GitHub Pages, lỗi này sẽ biến mất.';
        } else {
            aiBubble.textContent = '⚠️ Lỗi: ' + error.message;
        }
    } finally {
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

function typeWriter(element, text) {
    return new Promise((resolve) => {
        let i = 0;
        const speed = 10; 
        function tick() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                scrollToBottom();
                setTimeout(tick, speed);
            } else {
                resolve();
            }
        }
        tick();
    });
}

function appendMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.textContent = text;
    chatBox.appendChild(div);
    return div;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

userInput.focus();
