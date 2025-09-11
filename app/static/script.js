document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const themeToggle = document.getElementById('theme-toggle');

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        document.body.classList.toggle('light-theme');
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        addMessage(query, 'user');
        chatInput.value = '';

        const loadingMessage = addMessage('Thinking', 'bot', true);

        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }

            const data = await response.json();
            
            loadingMessage.remove();
            addMessage(data.answer, 'bot', false, data.source);

        } catch (error) {
            loadingMessage.remove();
            addMessage('Sorry, something went wrong. Please try again.', 'bot');
            console.error('Error:', error);
        }
    });

    function addMessage(text, sender, isLoading = false, sources = []) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    if (isLoading) {
        messageDiv.classList.add('loading');
    }

    const p = document.createElement('p');
    p.textContent = text;
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
    return messageDiv;
}
});