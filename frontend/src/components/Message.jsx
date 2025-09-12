export default function Message({ message }) {
    const isUser = message.role === 'user';

    const loadingDots = (
        <span className="animate-pulse">...</span>
    );

    return (
        <div className={`max-w-[80%] p-4 rounded-2xl leading-relaxed ${isUser
            ? 'bg-[#e6e5ff] self-end rounded-br-md'
            : 'bg-gray-100 self-start rounded-bl-md'
            }`}>
            <p className="whitespace-pre-wrap">
                {message.isLoading ? loadingDots : message.content}
            </p>

            {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300/70 text-sm">
                    <strong className="block mb-1.5">Sources:</strong>
                    {message.sources.map((source, index) => (
                        <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[#5a4fcf] hover:underline mb-1 truncate"
                        >
                            {source.title}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}