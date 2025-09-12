"use client";
import { useEffect, useState, useRef } from 'react';
import Message from './Message';
import LoginModal from './LoginModal'; 
import { FiSend, FiMenu } from 'react-icons/fi';
import { motion } from 'framer-motion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ChatArea({ conversationId, onNewConversationStarted, onNewChatClick , toggleSidebar}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false); 
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
                setIsHistoryLoading(true); 
                setMessages([]);
                const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, { credentials: 'include' });
                if (res.ok) setMessages(await res.json());
                setIsHistoryLoading(false); 
            } else {
                setMessages([]);
            }
        };
        if (user) fetchMessages();
    }, [conversationId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (!user) {
            setShowLoginModal(true);
            return;
        }

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ query: currentInput, conversation_id: conversationId })
            });
            if (!res.ok) throw new Error("API response was not ok.");
            const data = await res.json();
            const botMessage = { role: 'bot', content: data.answer, sources: data.sources };
            setMessages(prev => [...prev, botMessage]);
            if (!conversationId) onNewConversationStarted(data.conversation_id);
        } catch (error) {
            const errorMessage = { role: 'bot', content: 'Sorry, something went wrong. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const LoadingSpinner = () => (
        <div className="flex items-center justify-center h-full">
            <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-t-4 border-t-[#30C4E9] border-[#8B949E]/20 rounded-full" 
            />
        </div>
    );

   return (
        <>
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            <div className="flex-grow flex flex-col bg-[#161B22]">
                <header className="flex items-center p-4 border-b border-[#8B949E]/20 md:hidden">
                    <button onClick={toggleSidebar} className="text-[#C9D1D9] hover:text-[#30C4E9]">
                        <FiMenu size={24} />
                    </button>
                    <h1 className="text-lg font-semibold text-center flex-grow">
                        Sigma-course Assistant
                    </h1>
                </header>

                <div className="flex-grow p-6 md:p-10 overflow-y-auto">
                    {isHistoryLoading ? <LoadingSpinner /> 
                      :
                    (<div className="flex flex-col gap-4 max-w-4xl mx-auto">
                        {messages.length === 0 && !isLoading && (
                            <Message message={{
                                role: 'bot',
                                content: user
                                    ? `Hello, ${user.name}! Ask me anything about the Sigma Web Development course.`
                                    : 'Hello! Ask me anything about the Sigma Web Development course. Please log in to save your chat history.'
                            }} />
                        )}
                        {messages.map((msg, index) => <Message key={index} message={msg} />)}
                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                            <Message message={{ role: 'bot', content: '...', isLoading: true }} />
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    )}
                    
                </div>

                <div className="p-4 md:p-8 border-t rounded-t-4xl border-[#8B949E]/20 bg-[#0D1117]">
                    <form onSubmit={handleSend} className="flex items-center p-1.5 border border-[#8B949E]/30 rounded-full px-8 bg-[#010409] max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about the course..."
                            className="flex-grow bg-transparent rounded-2xl p-4.5 text-base outline-none disabled:opacity-50"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="bg-[#30e958] text-[#0D1117] border-none rounded-md p-3 disabled:bg-[#30C4E9]/20 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiSend size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
