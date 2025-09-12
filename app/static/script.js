document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const conversationList = document.getElementById('conversation-list');
    const newChatBtn = document.getElementById('new-chat-btn');

    let currentConversationId = null;

    // --- Core Functions ---

    const addMessage = (message) => {
        const { role, content, sources } = message;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${role}-message`);

        const p = document.createElement('p');
        p.textContent = content;
        messageDiv.appendChild(p);

        if (sources && sources.length > 0) {
            const sourceContainer = document.createElement('div');
            sourceContainer.classList.add('source-link');
            const sourceHeader = document.createElement('strong');
            sourceHeader.textContent = "Sources:";
            sourceContainer.appendChild(sourceHeader);
            sources.forEach(source => {
                const a = document.createElement('a');
                a.href = source.url;
                a.target = '_blank';
                a.textContent = source.title;
                sourceContainer.appendChild(document.createElement('br'));
                sourceContainer.appendChild(a);
            });
            messageDiv.appendChild(sourceContainer);
        }
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    const fetchConversations = async () => {
        try {
            const response = await fetch('/conversations');
            if (!response.ok) return;
            const conversations = await response.json();
            conversationList.innerHTML = '';
            conversations.forEach(convo => {
                const div = document.createElement('div');
                div.classList.add('conversation-item');
                div.textContent = convo.title;
                div.dataset.id = convo.id;
                div.addEventListener('click', () => loadConversation(convo.id));
                conversationList.appendChild(div);
            });
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    };

    const loadConversation = async (id) => {
        try {
            const response = await fetch(`/conversations/${id}`);
            if (!response.ok) return;
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(addMessage);
            currentConversationId = id;

            // Highlight the active conversation in the sidebar
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id == id);
            });
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const startNewChat = () => {
        currentConversationId = null;
        chatMessages.innerHTML = '<div class="message bot-message"><p>Ask me a question to start a new conversation!</p></div>';
        document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
    };

    // --- Event Listeners ---

    newChatBtn.addEventListener('click', startNewChat);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        addMessage({ role: 'user', content: query });
        chatInput.value = '';

        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, conversation_id: currentConversationId })
            });

            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();

            // If it was a new chat, a new conversation ID is returned
            if (!currentConversationId) {
                currentConversationId = data.conversation_id;
                fetchConversations(); // Refresh the conversation list
            }
            
            addMessage({ role: 'bot', content: data.answer, sources: data.sources });
            
            // Highlight the new/current conversation
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id == currentConversationId);
            });


        } catch (error) {
            addMessage({ role: 'bot', content: 'Sorry, something went wrong. Please try again.' });
            console.error('Error:', error);
        }
    });

    // --- Initial Load ---
    if (chatInput && !chatInput.disabled) {
        fetchConversations();
    }
});