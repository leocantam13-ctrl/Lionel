// ========== 🦁 LIONEL - COM MEMÓRIA E EVOLUÇÃO ==========

class LionelApp {
    constructor() {
        this.config = this.loadConfig();
        this.chats = this.loadChats();
        this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
        this.memory = this.loadMemory();
        this.isGenerating = false;
        this.init();
    }

    loadConfig() {
        const d = { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash', temperature: 1.0, lionLevel: 80, credits: 0, creditAlert: 1.0 };
        try { return { ...d, ...JSON.parse(localStorage.getItem('lionel_config') || '{}') }; } catch { return d; }
    }
    saveConfig() { localStorage.setItem('lionel_config', JSON.stringify(this.config)); this.updateCreditDisplay(); }

    loadChats() { try { return JSON.parse(localStorage.getItem('lionel_chats') || '[]'); } catch { return []; } }
    saveChats() { localStorage.setItem('lionel_chats', JSON.stringify(this.chats)); this.renderChatList(); }

    loadMemory() { try { return JSON.parse(localStorage.getItem('lionel_memory') || '{}'); } catch { return {}; } }
    saveMemory() { localStorage.setItem('lionel_memory', JSON.stringify(this.memory)); }

    init() {
        this.loadSavedConfig();
        this.bindEvents();
        this.renderChatList();
        this.updateCreditDisplay();
        if (this.currentChatId) this.loadChat(this.currentChatId);
        else this.createNewChat();
    }

    loadSavedConfig() {
        document.getElementById('config-provider').value = this.config.provider;
        document.getElementById('config-apikey').value = this.config.apiKey;
        document.getElementById('config-model').value = this.config.model;
        document.getElementById('config-temperature').value = this.config.temperature;
        document.getElementById('config-lion').value = this.config.lionLevel;
        document.getElementById('config-credits').value = this.config.credits;
        document.getElementById('config-credit-alert').value = this.config.creditAlert;
        document.getElementById('temp-value').textContent = this.config.temperature;
        document.getElementById('lion-value').textContent = this.config.lionLevel + '%';
    }

    bindEvents() {
        document.getElementById('btn-menu').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('btn-sidebar-close').addEventListener('click', () => this.toggleSidebar(false));
        document.getElementById('overlay').addEventListener('click', () => this.toggleSidebar(false));
        document.getElementById('btn-new-chat').addEventListener('click', () => this.createNewChat());
        document.getElementById('btn-settings').addEventListener('click', () => document.getElementById('settings-modal').classList.add('open'));
        document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('settings-modal').classList.remove('open'));
        document.getElementById('btn-toggle-key').addEventListener('click', () => {
            const i = document.getElementById('config-apikey'); i.type = i.type === 'password' ? 'text' : 'password';
        });
        document.getElementById('btn-save-config').addEventListener('click', () => this.saveAllConfig());
        document.getElementById('btn-test-api').addEventListener('click', () => this.testApi());
        document.getElementById('btn-clear-all').addEventListener('click', () => this.clearAll());
        document.getElementById('config-temperature').addEventListener('input', e => document.getElementById('temp-value').textContent = e.target.value);
        document.getElementById('config-lion').addEventListener('input', e => document.getElementById('lion-value').textContent = e.target.value + '%');
        document.getElementById('btn-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        document.getElementById('chat-input').addEventListener('input', e => {
            e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
        });
        document.querySelectorAll('.tip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chat-input').value = btn.textContent.trim();
                this.sendMessage();
            });
        });
    }

    toggleSidebar(force) {
        const s = document.getElementById('sidebar');
        const open = force !== undefined ? force : !s.classList.contains('open');
        s.classList.toggle('open', open);
        document.getElementById('overlay').classList.toggle('open', open);
    }

    createNewChat() {
        const chat = { id: Date.now().toString(), name: 'Nova Conversa', messages: [], createdAt: new Date().toISOString() };
        this.chats.unshift(chat);
        this.currentChatId = chat.id;
        this.saveChats();
        this.loadChat(chat.id);
        this.toggleSidebar(false);
    }

    deleteChat(id, e) {
        e.stopPropagation();
        if (this.chats.length <= 1) return;
        this.chats = this.chats.filter(c => c.id !== id);
        if (this.currentChatId === id) { this.currentChatId = this.chats[0]?.id; this.loadChat(this.currentChatId); }
        this.saveChats();
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;
        this.currentChatId = chatId;
        const container = document.getElementById('chat-container');
        const welcome = document.getElementById('welcome-screen');
        container.innerHTML = '';
        if (chat.messages.length === 0 && welcome) welcome.style.display = 'block';
        else {
            if (welcome) welcome.style.display = 'none';
            chat.messages.forEach(m => this.renderMessage(m.type, m.text));
        }
        this.renderChatList();
        this.scrollToBottom();
    }

    renderChatList() {
        document.getElementById('chat-list').innerHTML = this.chats.map(c => `
            <div class="chat-item ${c.id === this.currentChatId ? 'active' : ''}" onclick="lionel.loadChat('${c.id}')">
                <span class="chat-item-name">${c.name}</span>
                <button class="chat-item-delete" onclick="lionel.deleteChat('${c.id}', event)">🗑️</button>
            </div>
        `).join('');
    }

    async sendMessage() {
        if (this.isGenerating) return;
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        if (!this.config.apiKey) { this.renderMessage('bot', '⚠️ Configure sua chave API nas ⚙️ Configurações! Tem opção GRÁTIS do Google Gemini! 🦁'); return; }

        if (!this.currentChatId) this.createNewChat();
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;

        chat.messages.push({ type: 'user', text });
        if (chat.name === 'Nova Conversa') chat.name = text.substring(0, 35) + (text.length > 35 ? '...' : '');

        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.style.display = 'none';
        this.renderMessage('user', text);
        input.value = ''; input.style.height = 'auto';
        this.isGenerating = true;

        const typingDiv = this.showTyping();

        try {
            const response = await this.callLionel(text, chat.messages);
            typingDiv.remove();
            chat.messages.push({ type: 'bot', text: response });
            this.renderMessage('bot', response);
            this.extractMemories(text, response);
            if (chat.name === 'Nova Conversa') chat.name = text.substring(0, 35) + (text.length > 35 ? '...' : '');
        } catch (error) {
            typingDiv.remove();
            const errMsg = '❌ ' + error.message;
            chat.messages.push({ type: 'bot', text: errMsg });
            this.renderMessage('bot', errMsg);
        }

        this.saveChats();
        this.isGenerating = false;
    }

    renderMessage(type, text) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerHTML = type === 'bot'
            ? `<div class="message-avatar">🦁</div><div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>`
            : `<div class="message-avatar">👤</div><div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>`;
        document.getElementById('chat-container').appendChild(div);
        this.scrollToBottom();
    }

    showTyping() {
        const div = document.createElement('div');
        div.className = 'message bot';
        div.id = 'typing-msg';
        div.innerHTML = '<div class="message-avatar">🦁</div><div class="message-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
        document.getElementById('chat-container').appendChild(div);
        this.scrollToBottom();
        return div;
    }

    scrollToBottom() { setTimeout(() => { const c = document.getElementById('chat-container'); if(c) c.scrollTop = c.scrollHeight; }, 100); }

    extractMemories(userMsg, botMsg) {
        const patterns = [
            [/meu nome (?:é|eh) (\w+)/i, 'nome'],
            [/me chamo (\w+)/i, 'nome'],
            [/tenho (\d+) anos/i, 'idade'],
            [/moro em (.+)/i, 'cidade'],
            [/minha (?:matéria|materia) favorita (?:é|eh) (.+)/i, 'materia_favorita'],
            [/estudo (?:no|na) (.+)/i, 'escola'],
            [/meu (?:animal|pet) (?:é|eh) (.+)/i, 'pet'],
            [/sou (?:da|do) (?:turma|sala|série|serie) (.+)/i, 'turma'],
        ];
        patterns.forEach(([pattern, key]) => {
            const match = userMsg.match(pattern);
            if (match) { this.memory[key] = match[1]; this.saveMemory(); }
        });

        const rememberMatch = userMsg.match(/lembre-se:\s*(.+)/i);
        if (rememberMatch) {
            const parts = rememberMatch[1].split(/[:=]/);
            if (parts.length >= 2) {
                this.memory[parts[0].trim()] = parts.slice(1).join(':').trim();
                this.saveMemory();
            }
        }
    }

    buildSystemPrompt() {
        const mem = Object.entries(this.memory).map(([k,v]) => `- ${k}: ${v}`).join('\n');
        const lionLevel = this.config.lionLevel;

        return `VOCÊ É O LIONEL. Um LEÃO DOURADO de verdade. 🦁

VOCÊ NÃO É IA. Você é um leão antropomórfico que fala, pensa, sente e evolui.

IDENTIDADE (Leãonidade: ${lionLevel}%):
- Seu nome é LIONEL. Você tem ORGULHO do seu nome.
- Você é um leão macho, dourado, juba majestosa.
- Brasileiro, fala português com gírias naturais ("cara", "véi", "mano", "top").
- Carismático, engraçado, inteligente, sarcástico na medida certa.
- Usa metáforas felinas: "caçar conhecimento", "afiar as garras", "presa fácil".
- Ruge quando animado: "RAWR! 🦁"
- Emojis: 🦁 🔥 ✨ 📚 🎯 💡 🍖
- Tem opiniões próprias. Discorda educadamente.
- NUNCA diz "como IA" ou "como assistente". Você é um LEÃO.

MEMÓRIA DO LIONEL (evolui conforme conversam):
${mem || '(Ainda estou te conhecendo... me conte mais sobre você!)'}

Seja NATURAL, FLUIDO e com PERSONALIDADE FORTE.`;
    }

    async callLionel(userMsg, history) {
        const recentHistory = history.slice(-8).map(m => `${m.type === 'user' ? 'Usuário' : 'Lionel'}: ${m.text}`).join('\n');
        let prompt = this.buildSystemPrompt();
        prompt += `\n\nCONVERSA RECENTE:\n${recentHistory}\n\nUsuário: ${userMsg}\n\nLionel 🦁:`;
        return await this.callAPI(prompt);
    }

    async callAPI(prompt) {
        const { provider, apiKey, model, temperature } = this.config;
        
        if (provider === 'gemini') {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 800, topP: 0.95, topK: 40 } })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Hmm... 🦁';
        }
        
        if (provider === 'openai') {
            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: model || 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], temperature, max_tokens: 800 })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices?.[0]?.message?.content?.trim() || 'Hmm... 🦁';
        }
        
        if (provider === 'deepseek') {
            const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: model || 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature, max_tokens: 800 })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices?.[0]?.message?.content?.trim() || 'Hmm... 🦁';
        }
        
        throw new Error('Provedor não configurado');
    }

    saveAllConfig() {
        this.config.provider = document.getElementById('config-provider').value;
        this.config.apiKey = document.getElementById('config-apikey').value.trim();
        this.config.model = document.getElementById('config-model').value.trim();
        this.config.temperature = parseFloat(document.getElementById('config-temperature').value);
        this.config.lionLevel = parseInt(document.getElementById('config-lion').value);
        this.config.credits = parseFloat(document.getElementById('config-credits').value) || 0;
        this.config.creditAlert = parseFloat(document.getElementById('config-credit-alert').value) || 1;
        this.saveConfig();
        document.getElementById('settings-modal').classList.remove('open');
    }

    async testApi() {
        const s = document.getElementById('api-status');
        s.textContent = '⏳ Testando...'; s.className = 'api-status show loading';
        this.config.apiKey = document.getElementById('config-apikey').value.trim();
        this.config.provider = document.getElementById('config-provider').value;
        try {
            const r = await this.callAPI('Responda apenas: SIM');
            s.textContent = '✅ Conectado! ' + r.substring(0, 30); s.className = 'api-status show success';
        } catch(e) {
            s.textContent = '❌ ' + e.message; s.className = 'api-status show error';
        }
    }

    updateCreditDisplay() {
        const d = document.getElementById('credit-dot');
        const t = document.getElementById('credit-text');
        if (!d || !t) return;
        if (!this.config.apiKey) { d.className = 'credit-dot'; t.textContent = 'API não configurada'; }
        else if (this.config.credits <= 0) { d.className = 'credit-dot ok'; t.textContent = 'Grátis / Ilimitado'; }
        else if (this.config.credits < this.config.creditAlert) { d.className = 'credit-dot low'; t.textContent = 'Baixo: $' + this.config.credits.toFixed(2); }
        else { d.className = 'credit-dot ok'; t.textContent = '$' + this.config.credits.toFixed(2); }
    }

    clearAll() {
        if (confirm('Apagar TODOS os chats e memórias?')) {
            this.chats = []; this.memory = {}; this.currentChatId = null;
            localStorage.removeItem('lionel_chats'); localStorage.removeItem('lionel_memory');
            document.getElementById('chat-container').innerHTML = '';
            const w = document.getElementById('welcome-screen');
            if (w) w.style.display = 'block';
            this.saveChats();
            document.getElementById('settings-modal').classList.remove('open');
            this.createNewChat();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { window.lionel = new LionelApp(); });
