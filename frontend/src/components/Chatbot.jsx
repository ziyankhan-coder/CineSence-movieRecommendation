import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Chatbot.css'; // We'll create this CSS file

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: "Hi! I'm CineSense AI 🤖. Looking for a movie recommendation?", isBot: true }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        
        // Add user message to chat
        setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/chat/', {
                message: userMessage
            });
            
            // Add bot response to chat
            setMessages(prev => [...prev, { text: response.data.reply, isBot: true }]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to my brain right now! 🧠⚡", isBot: true }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            {/* Toggle Button */}
            <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕' : '💬'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <span className="chatbot-avatar">🤖</span>
                            <div>
                                <h4>CineSense AI</h4>
                                <span className="status">Online</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message-wrapper ${msg.isBot ? 'bot' : 'user'}`}>
                                <div className="message-bubble">
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-wrapper bot">
                                <div className="message-bubble typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    <form onSubmit={handleSend} className="chatbot-input-area">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask for a movie..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()}>
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Chatbot;
