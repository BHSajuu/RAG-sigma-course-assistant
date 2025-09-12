"use client";
import { useEffect, useState } from 'react';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Sidebar({ onSelectConversation, activeConversationId, isLoading, onNewChat }) {
    const [user, setUser] = useState(null);
    const [conversations, setConversations] = useState([]);

    useEffect(() => {
        const fetchUserAndConversations = async () => {
            try {
                // Fetch user data
                const userRes = await fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData);

                    // Fetch conversations only if user is logged in
                    const convoRes = await fetch(`${API_BASE_URL}/conversations`, { credentials: 'include' });
                    if (convoRes.ok) {
                        const convoData = await convoRes.json();
                        setConversations(convoData);
                    }
                } else {
                    setUser(null);
                    setConversations([]);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };

        fetchUserAndConversations();
    }, [isLoading]); // Re-fetch when isLoading changes

    return (
        <div className="flex flex-col w-[260px] bg-[#e6e5ff] p-4">
            <div className="sidebar-header mb-5">
                <button
                    onClick={onNewChat}
                    className="w-full p-3 border border-dashed border-[#5a4fcf] rounded-lg text-[#5a4fcf] font-bold text-left hover:bg-[#d8d6ff] transition-colors"
                >
                    + New Chat
                </button>
            </div>
            <div className="sidebar-content flex-grow overflow-y-auto">
                {conversations.map((convo) => (
                    <div
                        key={convo.id}
                        onClick={() => onSelectConversation(convo.id)}
                        className={`p-2.5 rounded-md cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis mb-1.5 ${activeConversationId === convo.id ? 'bg-[#5a4fcf] text-white' : 'hover:bg-[#d8d6ff]'
                            }`}
                    >
                        {convo.title}
                    </div>
                ))}
            </div>
            <div className="sidebar-footer pt-4 border-t border-gray-300">
                {user ? (
                    <>
                        <div className="flex items-center gap-3 mb-3">
                            <img src={user.picture} alt="User profile" className="w-8 h-8 rounded-full" />
                            <span>{user.name}</span>
                        </div>
                        <a href={`${API_BASE_URL}/logout`} className="block w-full text-center p-3 rounded-lg bg-gray-200 text-gray-800 font-bold hover:bg-gray-300">
                            Logout
                        </a>
                    </>
                ) : (
                    <a href={`${API_BASE_URL}/login`} className="block w-full text-center p-3 rounded-lg bg-[#4285F4] text-white font-bold hover:bg-blue-600">
                        Login with Google
                    </a>
                )}
            </div>
        </div>
    );
}