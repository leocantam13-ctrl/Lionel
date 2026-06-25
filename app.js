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

    renderMessage(type
