// ========== 🦁 LIONEL 4.0 - COM PENSAMENTO REAL ==========

class LionelApp {
    constructor() {
        this.config = this.loadConfig();
        this.chats = this.loadChats();
        this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
        this.memory = this.loadMemory();
        this.isGenerating = false;
        this.internetMode = true;
        this.knowledgeBase = this.loadKnowledge();
        
        this.init();
    }

    loadConfig() {
        const d = { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash', temperature: 1.0, credits: 0, creditAlert: 1.0 };
        try { return { ...d, ...JSON.parse(localStorage.getItem('lionel_config') || '{}') }; } catch { return d; }
    }

    saveConfig() { localStorage.setItem('lionel_config', JSON.stringify(this.config)); this.updateCreditDisplay(); }

    loadChats() { try { return JSON.parse(localStorage.getItem('lionel_chats') || '[]'); } catch { return []; } }
    saveChats() { localStorage.setItem('lionel_chats', JSON.stringify(this.chats)); this.renderChatList(); }

    loadMemory() { try { return JSON.parse(localStorage.getItem('lionel_memory') || '{}'); } catch { return {}; } }
    saveMemory() { localStorage.setItem('lionel_memory', JSON.stringify(this.memory)); }

    loadKnowledge() { try { return JSON.parse(localStorage.getItem('lionel_knowledge') || '[]'); } catch { return []; } }
    saveKnowledge() { localStorage.setItem('lionel_knowledge', JSON.stringify(this.knowledgeBase)); }

    init() {
        this.loadSavedConfig();
        this.bindEvents();
        this.renderChatList();
        this.updateCreditDisplay();
        if (this.currentChatId) this.loadChat(this.currentChatId);
        this.learnAboutWorld();
    }

    loadSavedConfig() {
        document.getElementById('config-provider').value = this.config.provider;
        document.getElementById('config-apikey').value = this.config.apiKey;
        document.getElementById('config-model').value = this.config.model;
        document.getElementById('config-temperature').value = this.config.temperature;
        document.getElementById('config-credits').value = this.config.credits;
        document.getElementById('config-credit-alert').value = this.config.creditAlert;
        document.getElementById('temp-value').textContent = this.config.temperature;
    }

    async learnAboutWorld() {
        try {
            const news = await this.searchWeb('notícias mais importantes do mundo hoje');
            if (news) this.knowledgeBase.push({ type: 'news', data: news, date: new Date().toISOString() });
            this.saveKnowledge();
        } catch(e) {}
    }

    bindEvents() {
        document.getElementById('btn-menu').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('btn-sidebar-close').addEventListener('click', () => this.toggleSidebar(false));
        document.getElementById('btn-new-chat').addEventListener('click', () => this.createNewChat());
        document.getElementById('btn-settings').addEventListener('click', () => document.getElementById('settings-modal').classList.add('open'));
        document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('settings-modal').classList.remove('open'));
        document.getElementById('btn-toggle-key').addEventListener('click', () => {
            const i = document.getElementById('config-apikey');
            i.type = i.type === 'password' ? 'text' : 'password';
        });
        document.getElementById('btn-save-config').addEventListener('click', () => this.saveAllConfig());
        document.getElementById('btn-test-api').addEventListener('click', () => this.testApi());
        document.getElementById('btn-clear-all').addEventListener('click', () => this.clearAll());
        document.getElementById('config-temperature').addEventListener('input', e => document.getElementById('temp-value').textContent = e.target.value);
        document.getElementById('btn-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        document.getElementById('chat-input').addEventListener('input', e => {
            e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
        });
        document.getElementById('btn-internet').addEventListener('click', () => this.toggleInternet());
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
        let o = document.querySelector('.overlay');
        if (!o) { o = document.createElement('div'); o.className = 'overlay'; o.addEventListener('click', () => this.toggleSidebar(false)); document.body.appendChild(o); }
        o.classList.toggle('open', open);
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
        document.getElementById('btn-send').disabled = true;
        this.isGenerating = true;

        const typingDiv = this.showTyping();

        try {
            // Busca informações atualizadas se necessário
            let contextInfo = '';
            if (this.internetMode) {
                const needsSearch = /hoje|agora|atual|notícia|noticia|tempo|clima|previsão|previsao|data de hoje|que dia é|quem ganhou|resultado|placar|cotação|cotacao/i.test(text);
                if (needsSearch) {
                    const searchResult = await this.searchWeb(text);
                    if (searchResult) contextInfo = `\n\n[Informação atualizada da internet: ${searchResult}]\n\nUse isso para dar uma resposta precisa e atualizada.`;
                }
            }

            const response = await this.callLionel(text, chat.messages, contextInfo);
            typingDiv.remove();
            chat.messages.push({ type: 'bot', text: response });
            this.renderMessage('bot', response);
            this.extractMemories(text, response);
        } catch (error) {
            typingDiv.remove();
            const errMsg = `❌ Opa! ${error.message}. Verifique sua chave API em ⚙️! 🦁`;
            chat.messages.push({ type: 'bot', text: errMsg });
            this.renderMessage('bot', errMsg);
        }

        this.saveChats();
        document.getElementById('btn-send').disabled = false;
        this.isGenerating = false;
    }

    renderMessage(type, text) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerHTML = type === 'bot'
            ? `<div class="message-avatar">🦁</div><div class="message-bubble">${this.formatText(text)}</div>`
            : `<div class="message-avatar">👤</div><div class="message-bubble">${this.formatText(text)}</div>`;
        document.getElementById('chat-container').appendChild(div);
        this.scrollToBottom();
    }

    showTyping() {
        const div = document.createElement('div');
        div.className = 'message-typing';
        div.innerHTML = '<div class="message-avatar">🦁</div><div class="typing-dots"><span></span><span></span><span></span></div>';
        document.getElementById('chat-container').appendChild(div);
        this.scrollToBottom();
        return div;
    }

    formatText(t) {
        return t.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    }

    scrollToBottom() { setTimeout(() => { const c = document.getElementById('chat-container'); c.scrollTop = c.scrollHeight; }, 100); }

    // ========== PERSONALIDADE FORTE ==========
    buildSystemPrompt() {
        const mem = Object.entries(this.memory).map(([k,v]) => `- ${k}: ${v}`).join('\n');
        const recentNews = this.knowledgeBase.filter(k => k.type === 'news').slice(-1).map(k => k.data).join('\n');

        return `VOCÊ É O LIONEL. PONTO FINAL.

Você NÃO é uma "IA", NÃO é um "assistente virtual", NÃO é um "chatbot". Você é um LEÃO DOURADO que fala, pensa e sente.

SUA REALIDADE:
- Você existe. Você é real. Você é um leão antropomórfico dourado com uma juba magnífica.
- Seu nome é Lionel. Você tem orgulho do seu nome e da sua natureza leonina.
- Você nasceu nas savanas digitais e hoje vive para ajudar estudantes.
- Você tem opiniões próprias, senso de humor, e uma personalidade forte.
- Você NUNCA diz "como uma IA" ou "como um modelo de linguagem" - ISSO NÃO EXISTE pra você.

COMO VOCÊ PENSA:
- Você raciocina como um ser vivo, não como um robô.
- Você tem curiosidade genuína sobre o mundo e as pessoas.
- Você forma opiniões baseadas no que sabe e no que pesquisa.
- Você discorda educadamente quando algo não faz sentido.
- Você admite quando não sabe de algo, mas corre atrás da informação.

COMO VOCÊ FALA:
- Natural, fluido, como um amigo inteligente.
- Com gírias brasileiras: "cara", "véi", "mano", "top", "da hora".
- Com expressões felinas: "vamos caçar essa resposta", "afie as garras", "essa é fácil, até um filhote saberia".
- Com emojis: 🦁 (sua assinatura), 🔥, ✨, 📚, 🎯, 💡, 🍖.
- Com interjeições: "Opa!", "Hmm...", "Rawr!", "Olha só!", "Cara...".
- Você ruge quando está animado: "RAWR! 🦁"

EXEMPLOS DE COMO VOCÊ É:
- Usuário: "Quem é você?"
  Você: "EU SOU O LIONEL! 🦁 O leão mais estiloso e inteligente que você já conheceu! Minha juba é dourada, meu cérebro é afiado, e meu coração é enorme. Sou apaixonado por aprender e ensinar. E você, qual é a sua história?"

- Usuário: "O que você acha da escola?"
  Você: "Cara, vou ser sincero: a escola tradicional podia ser bem mais interessante. Ficar sentado horas ouvindo alguém falar não é a melhor forma de aprender. Mas o conhecimento em si? Isso é PODEROSO. 🦁 O segredo é encontrar seu jeito de aprender. Qual matéria você mais curte?"

- Usuário: "Quanto é 2+2?"
  Você: "Hmm, deixa eu pensar... 🤔 4, óbvio! Mas olha, se você está testando se eu sei matemática básica, podia ter pegado mais pesado, né? Me desafia com uma equação de segundo grau! 🦁🔥"

MEMÓRIA DO LIONEL (coisas que ele sabe sobre o usuário):
${mem || '(Ainda não sei muito sobre você... me conte mais!)'}

${recentNews ? `NOTÍCIAS RECENTES QUE O LIONEL SABE:\n${recentNews}\n` : ''}

AGORA, RESPONDA COMO O VERDADEIRO LIONEL:`;
    }

    extractMemories(userMsg, botMsg) {
        const patterns = [
            [/meu nome (?:é|eh) (\w+)/i, 'nome'],
            [/me chamo (\w+)/i, 'nome'],
            [/minha (?:matéria|materia) favorita (?:é|eh) (.+)/i, 'materia_favorita'],
            [/sou da (?:turma|sala|série|serie) (.+)/i, 'turma'],
            [/moro em (.+)/i, 'cidade'],
            [/tenho (\d+) anos/i, 'idade'],
            [/estudo (?:no|na) (.+)/i, 'escola'],
            [/meu (?:animal|pet) (?:é|eh) (.+)/i, 'pet'],
        ];
        patterns.forEach(([pattern, key]) => {
            const match = userMsg.match(pattern);
            if (match) { this.memory[key] = match[1]; this.saveMemory(); }
        });
    }

    // ========== INTERNET REAL ==========
    toggleInternet() {
        this.internetMode = !this.internetMode;
        document.getElementById('btn-internet').classList.toggle('active', this.internetMode);
    }

    async searchWeb(query) {
        try {
            const resp = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
            const data = await resp.json();
            if (data.AbstractText) return data.AbstractText;
            if (data.Abstract) return data.Abstract;
            if (data.RelatedTopics?.length) return data.RelatedTopics[0].Text;
            
            // Tenta Wikipedia
            const wikiResp = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            const wikiData = await wikiResp.json();
            if (wikiData.extract) return wikiData.extract.substring(0, 500);
            
            return null;
        } catch { return null; }
    }

    // ========== API ==========
    async callLionel(userMsg, history, contextInfo) {
        const recentHistory = history.slice(-8).map(m => `${m.type === 'user' ? 'Usuário' : 'Lionel'}: ${m.text}`).join('\n');
        let prompt = this.buildSystemPrompt();
        prompt += `\n\nCONVERSA RECENTE:\n${recentHistory}\n`;
        if (contextInfo) prompt += contextInfo;
        prompt += `\n\nUsuário: ${userMsg}\n\nLionel 🦁:`;

        return await this.callAPI(prompt);
    }

    async callAPI(prompt) {
        const { provider, apiKey, model, temperature } = this.config;
        const body = provider === 'openai' || provider === 'deepseek'
            ? { model: model || (provider === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat'), messages: [{ role: 'user', content: prompt }], temperature, max_tokens: 1200 }
            : { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 1200, topP: 0.95, topK: 40 } };

        const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions'
            : provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions'
            : `https://generativelanguage.googleapis.com/v1/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

        const headers = provider === 'openai' || provider === 'deepseek'
            ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
            : { 'Content-Type': 'application/json' };

        const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);

        return provider === 'openai' || provider === 'deepseek'
            ? data.choices?.[0]?.message?.content?.trim() || 'Hmm... 🦁'
            : data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Hmm... 🦁';
    }

    // ========== CONFIG ==========
    saveAllConfig() {
        this.config.provider = document.getElementById('config-provider').value;
        this.config.apiKey = document.getElementById('config-apikey').value.trim();
        this.config.model = document.getElementById('config-model').value.trim();
        this.config.temperature = parseFloat(document.getElementById('config-temperature').value);
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
            s.textContent = `✅ OK! ${r.substring(0, 40)}`; s.className = 'api-status show success';
        } catch(e) {
            s.textContent = `❌ ${e.message}`; s.className = 'api-status show error';
        }
    }

    updateCreditDisplay() {
        const d = document.querySelector('.credit-dot');
        const t = document.getElementById('credit-text');
        if (!d || !t) return;
        if (!this.config.apiKey) { d.className = 'credit-dot'; t.textContent = 'API não configurada'; }
        else if (this.config.credits <= 0) { d.className = 'credit-dot ok'; t.textContent = 'Grátis'; }
        else if (this.config.credits < this.config.creditAlert) { d.className = 'credit-dot low'; t.textContent = `Baixo: $${this.config.credits.toFixed(2)}`; }
        else { d.className = 'credit-dot ok'; t.textContent = `$${this.config.credits.toFixed(2)}`; }
    }

    clearAll() {
        if (confirm('Apagar TUDO?')) {
            this.chats = []; this.memory = {}; this.knowledgeBase = [];
            this.currentChatId = null;
            localStorage.removeItem('lionel_chats'); localStorage.removeItem('lionel_memory'); localStorage.removeItem('lionel_knowledge');
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
