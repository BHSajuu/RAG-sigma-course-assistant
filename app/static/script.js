document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        // Display user message in the chat
        addMessage(query, 'user');
        chatInput.value = '';

        // Display a loading indicator for the bot's response
        const loadingMessage = addMessage('Thinking...', 'bot', true);

        try {
            // Send the user's query to the backend API
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }

            const data = await response.json();
            
            // Remove the loading indicator and display the final bot response
            loadingMessage.remove();
            addMessage(data.answer, 'bot', false, data.source);

        } catch (error) {
            loadingMessage.remove();
            addMessage('Sorry, something went wrong. Please try again.', 'bot');
            console.error('Error:', error);
        }
    });

    function addMessage(text, sender, isLoading = false, source = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        if (isLoading) {
            messageDiv.classList.add('loading');
        }

        const p = document.createElement('p');
        p.textContent = text;
        messageDiv.appendChild(p);

        // If the response includes a source, create a clickable link
        if (source && source.url) {
            const sourceDiv = document.createElement('div');
            sourceDiv.classList.add('source-link');
            const a = document.createElement('a');
            a.href = source.url;
            a.target = '_blank'; // Open link in a new tab
            a.textContent = `Source: ${source.title}`;
            sourceDiv.appendChild(a);
            messageDiv.appendChild(sourceDiv);
        }

        chatMessages.appendChild(messageDiv);
        // Scroll to the bottom of the chat window
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }
});