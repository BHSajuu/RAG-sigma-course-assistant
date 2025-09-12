"use client";

import { useEffect, useState, useRef } from 'react';
import Message from './Message';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ChatArea({ conversationId, onNewConversationStarted, onNewChatClick }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            const res = await fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' });
            if (res.ok) setUser(await res.json());
            else setUser(null);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            if (conversationId) {
                setIsLoading(true);
                const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data);
                }
                setIsLoading(false);
            } else {
                setMessages([]); // Clear messages for a new chat
            }
        };
        fetchMessages();
    }, [conversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    query: input,
                    conversation_id: conversationId
                })
            });

            if (!res.ok) throw new Error("API response was not ok.");

            const data = await res.json();
            const botMessage = { role: 'bot', content: data.answer, sources: data.sources };
            setMessages(prev => [...prev, botMessage]);

            // If this was a new conversation, update the parent state
            if (!conversationId) {
                onNewConversationStarted(data.conversation_id);
            }

        } catch (error) {
            const errorMessage = { role: 'bot', content: 'Sorry, something went wrong. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
            console.error("Failed to send message:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const isInputDisabled = !user || isLoading;

    return (
        <div className="flex-grow flex flex-col bg-white">
            <div className="flex-grow p-10 overflow-y-auto">
                <div className="flex flex-col gap-4">
                    {messages.length === 0 && !isLoading && (
                         <div className="p-4 rounded-2xl bg-gray-100 self-start max-w-[80%]">
                            <p>
                                {user 
                                    ? `Hello, ${user.name}! Welcome back. Select a past conversation or start a new one.`
                                    : 'Hello! Please log in to start a new conversation and save your history.'
                                }
                            </p>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <Message key={index} message={msg} />
                    ))}
                    {isLoading && messages[messages.length-1]?.role === 'user' && (
                        <Message message={{ role: 'bot', content: '...', isLoading: true }} />
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-10 border-t border-gray-200">
                <form onSubmit={handleSend} className="flex p-1.5 border border-gray-300 rounded-lg">
                    <input
                        type="text"
                        id="chat-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about the course..."
                        autoComplete="off"
                        required
                        disabled={isInputDisabled}
                        className="flex-grow border-none p-2.5 text-base outline-none disabled:bg-transparent"
                    />
                    <button
                        type="submit"
                        disabled={isInputDisabled}
                        className="bg-[#5a4fcf] text-white border-none rounded-md px-5 py-2.5 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
}