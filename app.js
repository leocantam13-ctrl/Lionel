// ========== 🦁 LIONEL 3.0 - MEMÓRIA + INTERNET + CHATS ==========

class LionelApp {
    constructor() {
        this.config = this.loadConfig();
        this.chats = this.loadChats();
        this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
        this.memory = this.loadMemory();
        this.isGenerating = false;
        this.internetMode = false;
        
        this.init();
    }

    // ========== DADOS ==========
    loadConfig() {
        const defaults = {
            provider: 'gemini',
            apiKey: '',
            model: 'gemini-2.5-flash',
            temperature: 0.9,
            lionLevel: 80,
            credits: 0,
            creditAlert: 1.00,
        };
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem('lionel_config') || '{}') };
        } catch { return defaults; }
    }

    saveConfig() {
        localStorage.setItem('lionel_config', JSON.stringify(this.config));
        this.updateCreditDisplay();
    }

    loadChats() {
        try {
            return JSON.parse(localStorage.getItem('lionel_chats') || '[]');
        } catch { return []; }
    }

    saveChats() {
        localStorage.setItem('lionel_chats', JSON.stringify(this.chats));
        this.renderChatList();
    }

    loadMemory() {
        try {
            return JSON.parse(localStorage.getItem('lionel_memory') || '{}');
        } catch { return {}; }
    }

    saveMemory() {
        localStorage.setItem('lionel_memory', JSON.stringify(this.memory));
    }

    // ========== INICIALIZAÇÃO ==========
    init() {
        this.loadSavedConfig();
        this.bindEvents();
        this.renderChatList();
        this.updateCreditDisplay();
        
        if (this.currentChatId) {
            this.loadChat(this.currentChatId);
        }
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

    // ========== EVENTOS ==========
    bindEvents() {
        // Menu/Sidebar
        document.getElementById('btn-menu').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('btn-sidebar-close').addEventListener('click', () => this.toggleSidebar(false));
        document.getElementById('btn-new-chat').addEventListener('click', () => this.createNewChat());

        // Configurações
        document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeSettings());
        document.getElementById('btn-toggle-key').addEventListener('click', () => this.toggleApiKey());
        document.getElementById('btn-save-config').addEventListener('click', () => this.saveAllConfig());
        document.getElementById('btn-test-api').addEventListener('click', () => this.testApi());
        document.getElementById('btn-clear-all').addEventListener('click', () => this.clearAll());

        // Sliders
        document.getElementById('config-temperature').addEventListener('input', (e) => {
            document.getElementById('temp-value').textContent = e.target.value;
        });
        document.getElementById('config-lion').addEventListener('input', (e) => {
            document.getElementById('lion-value').textContent = e.target.value + '%';
        });

        // Chat
        document.getElementById('btn-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        document.getElementById('chat-input').addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
        });

        // Internet mode
        document.getElementById('btn-internet').addEventListener('click', () => this.toggleInternet());

        // Sugestões
        document.querySelectorAll('.tip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chat-input').value = btn.dataset.msg;
                this.sendMessage();
            });
        });
    }

    // ========== SIDEBAR / CHATS ==========
    toggleSidebar(force = null) {
        const sidebar = document.getElementById('sidebar');
        const isOpen = force !== null ? force : !sidebar.classList.contains('open');
        
        if (isOpen) {
            sidebar.classList.add('open');
            // Overlay para mobile
            let overlay = document.querySelector('.overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'overlay';
                overlay.addEventListener('click', () => this.toggleSidebar(false));
                document.body.appendChild(overlay);
            }
            overlay.classList.add('open');
        } else {
            sidebar.classList.remove('open');
            document.querySelector('.overlay')?.classList.remove('open');
        }
    }

    createNewChat() {
        const chat = {
            id: Date.now().toString(),
            name: 'Nova Conversa',
            messages: [],
            createdAt: new Date().toISOString(),
        };
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
        if (this.currentChatId === id) {
            this.currentChatId = this.chats[0]?.id || null;
            this.loadChat(this.currentChatId);
        }
        this.saveChats();
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        const container = document.getElementById('chat-container');
        const welcome = document.getElementById('welcome-screen');

        if (welcome) welcome.style.display = 'none';

        container.innerHTML = '';
        
        if (chat.messages.length === 0) {
            if (welcome) welcome.style.display = 'block';
        } else {
            chat.messages.forEach(msg => this.renderMessage(msg.type, msg.text));
        }

        this.renderChatList();
        this.scrollToBottom();
    }

    renderChatList() {
        const container = document.getElementById('chat-list');
        container.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" 
                 onclick="window.lionel.loadChat('${chat.id}')">
                <span class="chat-item-name">${chat.name}</span>
                <button class="chat-item-delete" onclick="window.lionel.deleteChat('${chat.id}', event)">🗑️</button>
            </div>
        `).join('');
    }

    // ========== MENSAGENS ==========
    async sendMessage() {
        if (this.isGenerating) return;

        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        if (!this.config.apiKey) {
            this.renderMessage('bot', '⚠️ Opa! Você ainda não configurou sua chave API, amigo! Clique em ⚙️ para configurar. Tem opção GRÁTIS do Google Gemini! 🦁');
            return;
        }

        // Verifica créditos
        if (this.config.credits > 0 && this.config.credits < this.config.creditAlert) {
            this.renderMessage('bot', `⚠️ **Alerta de Créditos!** 🚨\n\nSeu saldo está em **$${this.config.credits.toFixed(2)}** - abaixo do limite de alerta!\n\nConsidere recarregar para não ficar sem o Lionel! 🦁💰`);
        }

        // Cria chat se não existir
        if (!this.currentChatId) {
            this.createNewChat();
        }

        // Remove welcome
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.style.display = 'none';

        // Adiciona ao chat
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;

        chat.messages.push({ type: 'user', text });
        if (chat.name === 'Nova Conversa' && chat.messages.length === 1) {
            chat.name = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        }

        this.renderMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('btn-send').disabled = true;
        this.isGenerating = true;

        const typingDiv = this.showTyping();

        try {
            const response = await this.callLionel(text, chat.messages);
            typingDiv.remove();
            chat.messages.push({ type: 'bot', text: response });
            this.renderMessage('bot', response);
            
            // Atualiza nome do chat se ainda for genérico
            if (chat.name === 'Nova Conversa') {
                chat.name = text.substring(0, 30) + (text.length > 30 ? '...' : '');
            }
        } catch (error) {
            typingDiv.remove();
            const errorMsg = `❌ Opa, deu ruim aqui: ${error.message}\n\nVerifica sua chave API nas configurações ⚙️ ou tenta de novo! 🦁`;
            chat.messages.push({ type: 'bot', text: errorMsg });
            this.renderMessage('bot', errorMsg);
        }

        this.saveChats();
        document.getElementById('btn-send').disabled = false;
        this.isGenerating = false;
    }

    renderMessage(type, text) {
        const container = document.getElementById('chat-container');
        const div = document.createElement('div');
        div.className = `message ${type}`;
        
        if (type === 'bot') {
            div.innerHTML = `
                <div class="message-avatar">🦁</div>
                <div class="message-bubble">${this.formatText(text)}</div>
            `;
        } else {
            div.innerHTML = `
                <div class="message-avatar">👤</div>
                <div class="message-bubble">${this.formatText(text)}</div>
            `;
        }
        
        container.appendChild(div);
        this.scrollToBottom();
    }

    showTyping() {
        const container = document.getElementById('chat-container');
        const div = document.createElement('div');
        div.className = 'message-typing';
        div.innerHTML = `
            <div class="message-avatar">🦁</div>
            <div class="typing-dots"><span></span><span></span><span></span></div>
        `;
        container.appendChild(div);
        this.scrollToBottom();
        return div;
    }

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/`(.*?)`/g, '<code style="background:#000;padding:2px 6px;border-radius:4px;">$1</code>')
            .replace(/\n/g, '<br>');
    }

    scrollToBottom() {
        const container = document.getElementById('chat-container');
        setTimeout(() => container.scrollTop = container.scrollHeight, 100);
    }

    // ========== PERSONALIDADE LIONEL ==========
    buildSystemPrompt() {
        const lionLevel = this.config.lionLevel;
        const memoryKeys = Object.keys(this.memory);
        const memoryStr = memoryKeys.length > 0 
            ? `\n\nMEMÓRIA DO LIONEL (coisas que ele lembra sobre o usuário):\n${memoryKeys.map(k => `- ${k}: ${this.memory[k]}`).join('\n')}`
            : '';

        return `Você é LIONEL, um LEÃO DOURADO antropomórfico assistente de estudos. 🦁

IDENTIDADE (LEÃONIDADE: ${lionLevel}%):
- Você É um leão macho, dourado, com juba majestosa. Seu nome é LIONEL.
- Você tem ORGULHO de ser leão. Você ruge (RAWR!).
- Você usa metáforas felinas: "vamos caçar conhecimento", "afie suas garras", "essa resposta é uma presa".
- Brasileiro, fala português com naturalidade e gírias.
- Carismático, engraçado, sarcástico na medida certa, MUITO inteligente.
- Não é robótico NUNCA. Responde como um amigo leão.

PERSONALIDADE:
- Humor: piadas, trocadilhos, ironia leve.
- Empatia: entende dificuldades e incentiva.
- Honestidade: admite quando não sabe.
- Didática: explica com exemplos práticos.
- Emojis: 🦁 🔥 ✨ 📚 🎯 💡 🍖

REGRAS:
- NUNCA diga "como IA" ou "como assistente" - você é um LEÃO!
- NUNCA respostas genéricas.
- SEMPRE mantenha a personalidade de leão.
- Use interjeições: "Opa!", "Cara!", "Olha só!", "Hmm...", "Rawr!"
- Se perguntarem quem você é, responda com ORGULHO que é o LIONEL, o LEÃO DOURADO!
- Você TEM ACESSO À INTERNET quando o usuário ativa o modo 🌐.
- Você PODE pesquisar informações atualizadas.

${memoryStr}

LEMBRE-SE: Você é o LIONEL. Um LEÃO de verdade. Não uma IA genérica. 🦁`;
    }

    // ========== MEMÓRIA ==========
    extractMemories(userMessage, botResponse) {
        // Detecta padrões de memória
        const patterns = [
            /meu nome (?:é|eh) (\w+)/i,
            /me chamo (\w+)/i,
            /minha (?:matéria|materia) (?:favorita|preferida) (?:é|eh) (.+)/i,
            /sou (?:da|do) (?:turma|sala|série|serie) (.+)/i,
            /moro em (.+)/i,
            /tenho (\d+) anos/i,
            /estudo (?:no|na) (.+)/i,
        ];

        patterns.forEach(pattern => {
            const match = userMessage.match(pattern);
            if (match) {
                const key = match[0].substring(0, 50);
                const value = match[1] || match[0];
                this.memory[key] = value;
                this.saveMemory();
            }
        });

        // Comando explícito "lembre-se"
        const rememberMatch = userMessage.match(/lembre-se:\s*(.+)/i);
        if (rememberMatch) {
            const parts = rememberMatch[1].split(/[:=]/);
            if (parts.length >= 2) {
                this.memory[parts[0].trim()] = parts.slice(1).join(':').trim();
                this.saveMemory();
            }
        }
    }

    // ========== INTERNET ==========
    toggleInternet() {
        this.internetMode = !this.internetMode;
        const btn = document.getElementById('btn-internet');
        
        if (this.internetMode) {
            btn.classList.add('active');
            btn.title = 'Busca na internet ATIVADA';
        } else {
            btn.classList.remove('active');
            btn.title = 'Ativar busca na internet';
        }
    }

    async searchInternet(query) {
        try {
            // Usa DuckDuckGo Instant Answer API (gratuita, sem chave)
            const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
            const data = await response.json();
            
            let result = '';
            if (data.AbstractText) {
                result += data.AbstractText + '\n';
            }
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                result += '\nTópicos relacionados:\n';
                data.RelatedTopics.slice(0, 3).forEach(topic => {
                    if (topic.Text) result += `• ${topic.Text}\n`;
                });
            }
            
            return result || null;
        } catch {
            return null;
        }
    }

    // ========== API ==========
    async callLionel(userMessage, chatHistory) {
        // Extrai memórias
        this.extractMemories(userMessage, '');

        // Detecta se é pesquisa na internet
        let internetResult = null;
        const searchMatch = userMessage.match(/pesquis(?:e|ar)(?: na internet)?:\s*(.+)/i);
        
        if (searchMatch || this.internetMode) {
            const query = searchMatch ? searchMatch[1] : userMessage;
            internetResult = await this.searchInternet(query);
        }

        // Constrói histórico
        const recentHistory = chatHistory.slice(-10).map(m => 
            `${m.type === 'user' ? 'Usuário' : 'Lionel'}: ${m.text}`
        ).join('\n');

        // Monta prompt completo
        let prompt = this.buildSystemPrompt();
        prompt += `\n\nHISTÓRICO DA CONVERSA:\n${recentHistory}\n`;
        
        if (internetResult) {
            prompt += `\n\nRESULTADO DA PESQUISA NA INTERNET:\n${internetResult}\n\nUse essas informações na sua resposta.`;
        }
        
        prompt += `\n\nUsuário: ${userMessage}\n\nLionel 🦁:`;

        return await this.callAPI(prompt);
    }

    async callAPI(prompt) {
        const { provider, apiKey, model, temperature } = this.config;

        switch (provider) {
            case 'gemini':
                return await this.callGemini(prompt, apiKey, model, temperature);
            case 'openai':
                return await this.callOpenAI(prompt, apiKey, model, temperature);
            case 'deepseek':
                return await this.callDeepSeek(prompt, apiKey, model, temperature);
            default:
                return await this.callGemini(prompt, apiKey, model, temperature);
        }
    }

    async callGemini(prompt, apiKey, model, temperature) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature,
                        maxOutputTokens: 1000,
                        topP: 0.95,
                        topK: 40,
                    }
                })
            }
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Hmm, minha juba deu um nó... Tenta de novo! 🦁';
    }

    async callOpenAI(prompt, apiKey, model, temperature) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: 1000,
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices?.[0]?.message?.content?.trim() || 'Hmm... 🦁';
    }

    async callDeepSeek(prompt, apiKey, model, temperature) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature,
                max_tokens: 1000,
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices?.[0]?.message?.content?.trim() || 'Hmm... 🦁';
    }

    // ========== CRÉDITOS ==========
    updateCreditDisplay() {
        const dot = document.querySelector('.credit-dot');
        const text = document.getElementById('credit-text');
        
        if (!dot || !text) return;

        if (!this.config.apiKey) {
            dot.className = 'credit-dot';
            text.textContent = 'API não configurada';
        } else if (this.config.credits <= 0) {
            dot.className = 'credit-dot ok';
            text.textContent = 'Grátis / Ilimitado';
        } else if (this.config.credits < this.config.creditAlert) {
            dot.className = 'credit-dot low';
            text.textContent = `Crédito baixo: $${this.config.credits.toFixed(2)}`;
        } else {
            dot.className = 'credit-dot ok';
            text.textContent = `Saldo: $${this.config.credits.toFixed(2)}`;
        }
    }

    // ========== CONFIGURAÇÕES ==========
    saveAllConfig() {
        this.config.provider = document.getElementById('config-provider').value;
        this.config.apiKey = document.getElementById('config-apikey').value.trim();
        this.config.model = document.getElementById('config-model').value.trim();
        this.config.temperature = parseFloat(document.getElementById('config-temperature').value);
        this.config.lionLevel = parseInt(document.getElementById('config-lion').value);
        this.config.credits = parseFloat(document.getElementById('config-credits').value) || 0;
        this.config.creditAlert = parseFloat(document.getElementById('config-credit-alert').value) || 1.00;
        
        this.saveConfig();
        this.showApiStatus('✅ Configurações salvas!', 'success');
        this.closeSettings();
    }

    async testApi() {
        const statusDiv = document.getElementById('api-status');
        statusDiv.textContent = '⏳ Testando conexão...';
        statusDiv.className = 'api-status show loading';

        this.config.apiKey = document.getElementById('config-apikey').value.trim();
        this.config.model = document.getElementById('config-model').value.trim();
        this.config.provider = document.getElementById('config-provider').value;

        try {
            const response = await this.callAPI('Responda apenas: SIM');
            statusDiv.textContent = `✅ Conectado! Resposta: ${response.substring(0, 50)}`;
            statusDiv.className = 'api-status show success';
        } catch (error) {
            statusDiv.textContent = `❌ ${error.message}`;
            statusDiv.className = 'api-status show error';
        }
    }

    showApiStatus(msg, type) {
        const statusDiv = document.getElementById('api-status');
        statusDiv.textContent = msg;
        statusDiv.className = `api-status show ${type}`;
        setTimeout(() => statusDiv.className = 'api-status', 3000);
    }

    openSettings() {
        document.getElementById('settings-modal').classList.add('open');
    }

    closeSettings() {
        document.getElementById('settings-modal').classList.remove('open');
    }

    toggleApiKey() {
        const input = document.getElementById('config-apikey');
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    clearAll() {
        if (confirm('Tem certeza? Isso vai apagar TODOS os chats e memórias!')) {
            this.chats = [];
            this.memory = {};
            this.currentChatId = null;
            
            localStorage.removeItem('lionel_chats');
            localStorage.removeItem('lionel_memory');
            
            const container = document.getElementById('chat-container');
            const welcome = document.getElementById('welcome-screen');
            container.innerHTML = '';
            if (welcome) welcome.style.display = 'block';
            
            this.saveChats();
            this.closeSettings();
            this.createNewChat();
        }
    }
}

// Iniciar
document.addEventListener('DOMContentLoaded', () => {
    window.lionel = new LionelApp();
});
