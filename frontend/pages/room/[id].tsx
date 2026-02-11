// frontend/pages/room/[id].tsx - FINAL VERSION WITH USER LIST TOGGLE & TYPING INDICATOR
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import socket from '../../utils/socket';
import ChatWindow from '../../components/ChatWindow';
import MessageInput from '../../components/MessageInput';
import UserList from '../../components/UserList';
import UserToast from '../../components/UserToast';
import TypingIndicator from '../../components/TypingIndicator';
import { Search, X, Users } from 'lucide-react';

interface User {
    name: string;
    gender: 'male' | 'female' | 'other';
    country: string;
    isActive?: boolean;
    avatar?: string;
    status?: string;
}

interface Message {
    _id?: string;
    id?: string | number;
    sender: string;
    message: string;
    reactions?: Array<{ emoji: string; users: string[] }>;
    replyTo?: string | null;
    isReported?: boolean;
    timestamp?: string;
    createdAt?: string;
    isRead?: boolean;
    readBy?: string[];
    avatar?: string;
    isEdited?: boolean;
    editedAt?: string;
    isPinned?: boolean;
    messageType?: 'text' | 'file' | 'image' | 'voice' | 'gif';
    fileData?: {
        filename: string;
        originalName: string;
        mimetype: string;
        size: number;
        url: string;
    };
    gifData?: {
        width: number;
        height: number;
        preview: string;
    };
    mentions?: string[];
}

export default function Room() {
    const router = useRouter();
    const { id } = router.query;
    const username = typeof router.query.username === 'string' ? router.query.username : '';

    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [toasts, setToasts] = useState<string[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [isInitializing, setIsInitializing] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [searchResults, setSearchResults] = useState<Message[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [unreadMessageId, setUnreadMessageId] = useState<string | null>(null);
    const [showUserList, setShowUserList] = useState(true);

    const inputRef = useRef<any>(null);

    const gender =
        typeof router.query.gender === 'string'
            ? (router.query.gender as 'male' | 'female' | 'other')
            : 'other';

    const country =
        typeof router.query.country === 'string'
            ? router.query.country
            : 'Unknown';

    const avatar =
        typeof router.query.avatar === 'string'
            ? router.query.avatar
            : undefined;

    // Connect socket and set up event listeners
    useEffect(() => {
        if (!id || !username) return;

        // Connect socket if not connected
        if (!socket.connected) {
            socket.connect();
        }

        const onConnect = () => {
            setIsConnected(true);
            setIsInitializing(false);
            socket.emit('joinRoom', { room: id, username, gender, country, avatar });
        };

        const onDisconnect = (reason: string) => {
            setIsConnected(false);
            console.log('Socket disconnected:', reason);
        };

        const onConnectError = (error: Error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        };

        const onReconnect = (attemptNumber: number) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            // Rejoin room after reconnection
            socket.emit('joinRoom', { room: id, username, gender, country, avatar });
        };

        // Set up event listeners
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('reconnect', onReconnect);

        // If already connected, join room immediately
        if (socket.connected) {
            onConnect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('reconnect', onReconnect);
        };
    }, [id, username, gender, country, avatar]);

    // Set up message and user event listeners
    useEffect(() => {
        if (!id || !username) return;

        const onLoadMessages = (loadedMessages: Message[]) => {
            const firstUnread = loadedMessages.find(msg =>
                msg.sender !== username && !msg.readBy?.includes(username)
            );

            if (firstUnread) {
                setUnreadMessageId(firstUnread._id || firstUnread.id?.toString() || null);
                setTimeout(() => setUnreadMessageId(null), 5000);
            }

            setMessages(loadedMessages.map(msg => ({
                ...msg,
                isRead: msg.sender === username || msg.readBy?.includes(username),
            })));
        };

        const onLoadPinnedMessages = (pinned: Message[]) => {
            setPinnedMessages(pinned);
        };

        const onUnreadCount = (count: number) => {
            setUnreadCount(count);
        };

        const onReceiveMessage = (msg: Message) => {
            setMessages(prev => {
                const msgId = msg._id || msg.id;
                const exists = prev.some(m => (m._id || m.id) === msgId);
                if (exists) return prev;

                return [...prev, {
                    ...msg,
                    isRead: msg.sender === username || msg.readBy?.includes(username),
                }];
            });

            if (msg.sender !== username && msg._id) {
                setTimeout(() => {
                    socket.emit('markAsRead', { messageId: msg._id, username, room: id });
                }, 1000);
            }
        };

        // Handle message edited - server sends full message object
        const onMessageEdited = (updatedMessage: Message) => {
            setMessages(prev => prev.map(m =>
                (m._id === updatedMessage._id)
                    ? {
                        ...m,
                        message: updatedMessage.message,
                        isEdited: true,
                        editedAt: updatedMessage.editedAt
                    }
                    : m
            ));
        };

        // Handle message pinned - server sends full message object
        const onMessagePinned = (pinnedMessage: Message) => {
            setMessages(prev => prev.map(m =>
                (m._id === pinnedMessage._id) ? { ...m, isPinned: true } : m
            ));
            // Also update pinned messages list
            setPinnedMessages(prev => {
                const exists = prev.some(m => m._id === pinnedMessage._id);
                if (exists) return prev;
                return [...prev, pinnedMessage];
            });
        };

        // Handle message reported - server sends object with messageId
        const onMessageReported = ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.map(m =>
                (m._id === messageId || m.id === messageId) ? { ...m, isReported: true } : m
            ));
        };

        // Handle message deleted
        const onMessageDeleted = ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId && m.id !== messageId));
        };

        // Handle message unpinned
        const onMessageUnpinned = (data: { messageId: string } | Message) => {
            const messageId = 'messageId' in data ? data.messageId : data._id;
            setMessages(prev => prev.map(m =>
                (m._id === messageId || m.id === messageId) ? { ...m, isPinned: false } : m
            ));
            setPinnedMessages(prev => prev.filter(m => m._id !== messageId && m.id !== messageId));
        };

        // Handle reactions
        const onMessageReaction = (data: { messageId: string; reactions: Array<{ emoji: string; users: string[] }> }) => {
            setMessages(prev => prev.map(m =>
                (m._id === data.messageId || m.id === data.messageId)
                    ? { ...m, reactions: data.reactions }
                    : m
            ));
        };

        // Handle read receipts
        const onMessageRead = (data: { messageId: string; readBy: string[] }) => {
            setMessages(prev => prev.map(m =>
                (m._id === data.messageId || m.id === data.messageId)
                    ? { ...m, readBy: data.readBy, isRead: data.readBy.includes(username) }
                    : m
            ));
        };

        const onRoomMarkedAsRead = () => {
            setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            setUnreadCount(0);
        };

        const onUpdateUsers = (updatedUsers: User[]) => {
            setUsers(updatedUsers);
        };

        const onSearchResults = (results: Message[]) => {
            setSearchResults(results);
        };

        const onMention = (data: { messageId: string; mentionedBy: string; message: string }) => {
            setToasts(prev => [...prev, `${data.mentionedBy} mentioned you`]);
        };

        const onUserTyping = ({ username: typingUser, isTyping }: { username: string; isTyping: boolean }) => {
            if (typingUser === username) return; // Don't show own typing

            setTypingUsers(prev => {
                if (isTyping) {
                    if (!prev.includes(typingUser)) {
                        return [...prev, typingUser];
                    }
                } else {
                    return prev.filter(u => u !== typingUser);
                }
                return prev;
            });
        };

        const onUserEvent = ({ type, username: eventUsername, avatar }: { type: string; username: string; avatar?: string }) => {
            if (type === 'join') {
                setToasts(prev => [...prev, `${eventUsername} joined`]);
            } else if (type === 'leave') {
                setToasts(prev => [...prev, `${eventUsername} left`]);
            }
        };

        const onError = ({ message }: { message: string }) => {
            setToasts(prev => [...prev, message]);
        };

        // Register all listeners
        socket.on('loadMessages', onLoadMessages);
        socket.on('loadPinnedMessages', onLoadPinnedMessages);
        socket.on('unreadCount', onUnreadCount);
        socket.on('receiveMessage', onReceiveMessage);
        socket.on('messageEdited', onMessageEdited);
        socket.on('messagePinned', onMessagePinned);
        socket.on('messageReported', onMessageReported);
        socket.on('updateUsers', onUpdateUsers);
        socket.on('messageDeleted', onMessageDeleted);
        socket.on('messageReaction', onMessageReaction);
        socket.on('messageRead', onMessageRead);
        socket.on('roomMarkedAsRead', onRoomMarkedAsRead);
        socket.on('messageUnpinned', onMessageUnpinned);
        socket.on('searchResults', onSearchResults);
        socket.on('mention', onMention);
        socket.on('userTyping', onUserTyping);
        socket.on('userEvent', onUserEvent);
        socket.on('error', onError);

        // Handle initial connection loading
        const initTimer = setTimeout(() => {
            if (!messages.length) {
                setIsInitializing(false);
            }
        }, 3000);

        return () => {
            socket.off('loadMessages', onLoadMessages);
            socket.off('loadPinnedMessages', onLoadPinnedMessages);
            socket.off('unreadCount', onUnreadCount);
            socket.off('receiveMessage', onReceiveMessage);
            socket.off('messageEdited', onMessageEdited);
            socket.off('messagePinned', onMessagePinned);
            socket.off('messageReported', onMessageReported);
            socket.off('updateUsers', onUpdateUsers);
            socket.off('messageDeleted', onMessageDeleted);
            socket.off('messageReaction', onMessageReaction);
            socket.off('messageRead', onMessageRead);
            socket.off('roomMarkedAsRead', onRoomMarkedAsRead);
            socket.off('messageUnpinned', onMessageUnpinned);
            socket.off('searchResults', onSearchResults);
            socket.off('mention', onMention);
            socket.off('userTyping', onUserTyping);
            socket.off('userEvent', onUserEvent);
            socket.off('error', onError);
            clearTimeout(initTimer);
        };
    }, [id, username]);

    // Handle page unload - leave room
    useEffect(() => {
        if (!id || !username) return;

        const handleBeforeUnload = () => {
            socket.emit('leaveRoom', { room: id, username });
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            socket.emit('leaveRoom', { room: id, username });
        };
    }, [id, username]);

    useEffect(() => {
        const handleInsertMention = (event: any) => {
            const mention = event.detail;
            // This would need to be passed to MessageInput via ref or state
        };

        window.addEventListener('insertMention', handleInsertMention);
        return () => window.removeEventListener('insertMention', handleInsertMention);
    }, []);

    const handleSend = useCallback((messageText: string, replyToId?: string | null, mentions?: string[]) => {
        if (!messageText.trim()) return;
        socket.emit('sendMessage', { room: id, message: messageText, username, replyTo: replyToId, mentions });
        setReplyingTo(null);
    }, [id, username]);

    const handleFileUpload = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            const { url, filename, originalName, mimetype, size } = await response.json();
            socket.emit('uploadFile', {
                room: id,
                username,
                fileData: { filename, originalName, mimetype, size, url: `${process.env.NEXT_PUBLIC_API_URL}${url}` },
            });
            setToasts(prev => [...prev, 'File uploaded']);
        } catch {
            setToasts(prev => [...prev, 'Upload failed']);
        }
    }, [id, username]);

    const handleSendGif = useCallback((gifUrl: string, gifData: { width: number; height: number; preview: string }) => {
        socket.emit('sendMessage', {
            room: id,
            message: gifUrl,
            username,
            replyTo: replyingTo ? String(replyingTo._id || replyingTo.id) : null,
            messageType: 'gif',
            gifData
        });
        setReplyingTo(null);
    }, [id, username, replyingTo]);


    const handleVoiceRecord = useCallback(async (audioBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'voice.webm');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            const { url, filename } = await response.json();
            socket.emit('uploadFile', {
                room: id,
                username,
                fileData: { filename, originalName: 'voice.webm', mimetype: 'audio/webm', size: audioBlob.size, url: `${process.env.NEXT_PUBLIC_API_URL}${url}` },
            });
            setToasts(prev => [...prev, 'Voice sent']);
        } catch {
            setToasts(prev => [...prev, 'Voice failed']);
        }
    }, [id, username]);

    const handleReact = useCallback((messageId: string | number, emoji: string, action: 'add' | 'remove') => {
        socket.emit('reactMessage', { room: id, messageId, emoji, username, action });
    }, [id, username]);

    const handleSearch = useCallback((query: string) => {
        if (query.trim()) {
            socket.emit('searchMessages', { room: id, query: query.trim() });
        }
    }, [id]);

    const handleTyping = useCallback((isTyping: boolean) => {
        socket.emit('typing', { room: id, username, isTyping });
    }, [id, username]);

    if (!id || !username) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed top-5 right-5 space-y-3 z-50">
                {toasts.map((toast, i) => (
                    <UserToast key={i} text={toast} onClose={() => setToasts(prev => prev.filter((_, idx) => idx !== i))} />
                ))}
            </div>

            {!isConnected && !isInitializing && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
                    Reconnecting...
                </div>
            )}

            <div className="flex gap-4 p-5 h-screen bg-gray-100 dark:bg-gray-900">
                {/* Chat Container */}
                <div
                    className="flex flex-col min-w-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
                    style={{
                        flex: 1,
                        marginRight: showUserList ? '0' : '0'
                    }}
                >
                    {/* Header with Search */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {typeof id === 'string' ? id.charAt(0).toUpperCase() : 'R'}
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                                        {id}
                                    </h2>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {messages.length} messages
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {showSearch ? (
                                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                                        <Search className="w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                            placeholder="Search..."
                                            className="bg-transparent outline-none text-sm w-48 dark:text-white"
                                            autoFocus
                                        />
                                        <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowSearch(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                        <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                )}

                                <div className="text-sm border-l border-gray-200 dark:border-gray-700 pl-4">
                                    <span className="text-gray-500 dark:text-gray-400">Logged in as</span>
                                    <span className="ml-2 font-medium text-gray-700 dark:text-gray-200">{username}</span>
                                </div>

                                {/* User List Toggle Button */}
                                <button
                                    onClick={() => setShowUserList(!showUserList)}
                                    className={`p-2 rounded-full transition-all relative ${showUserList
                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}
                                    title={showUserList ? "Hide user list" : "Show user list"}
                                >
                                    <Users className="w-5 h-5" />
                                    {users.length > 0 && (
                                        <span className={`absolute -top-1 -right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center ${showUserList ? 'bg-white text-blue-500' : 'bg-blue-500 text-white'
                                            }`}>
                                            {users.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <ChatWindow
                        messages={messages}
                        onReact={handleReact}
                        currentUser={username}
                        onDeleteMessage={(messageId) => socket.emit('deleteMessage', { room: id, messageId: messageId })}
                        onReportMessage={(msgId) => socket.emit('reportMessage', { room: id, messageId: msgId, reportedBy: username })}
                        onReplyToMessage={setReplyingTo}
                        onEditMessage={(msgId, text) => socket.emit('editMessage', { messageId: msgId, newMessage: text, room: id })}
                        onPinMessage={(msgId) => socket.emit('pinMessage', { room: id, messageId: msgId })}
                        onUnpinMessage={(msgId) => socket.emit('unpinMessage', { room: id, messageId: msgId })}
                        pinnedMessages={pinnedMessages}
                        onlineUsers={users.filter(u => u.isActive).map(u => u.name)}
                        unreadMessageId={unreadMessageId}
                    />

                    {/* Typing Indicator */}
                    <TypingIndicator users={typingUsers} />

                    <MessageInput
                        onSend={handleSend}
                        onFileUpload={handleFileUpload}
                        onVoiceRecord={handleVoiceRecord}
                        onSendGif={handleSendGif}
                        replyTo={replyingTo}
                        replyPreview={replyingTo ? `${replyingTo.sender}: ${replyingTo.message.substring(0, 50)}` : ''}
                        onCancelReply={() => setReplyingTo(null)}
                        disabled={!isConnected}
                        users={users.map(u => u.name)}
                        onTyping={handleTyping}
                    />
                </div>

                {/* User List - animates width */}
                <div
                    className="shrink-0 transition-all duration-300 ease-in-out overflow-hidden h-full"
                    style={{
                        width: showUserList ? '288px' : '0px',
                        opacity: showUserList ? 1 : 0
                    }}
                >
                    <div className="w-72 h-full">
                        <UserList
                            users={users}
                            currentUser={username}
                            isOpen={true}
                            showToggle={false}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}