// frontend/components/ChatWindow.tsx - FINAL VERSION WITH ALL FEATURES
import React, { useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  MoreVertical,
  Reply,
  Flag,
  Trash2,
  X,
  MessageSquare,
  Smile,
  Check,
  CheckCheck,
  Edit,
  Pin,
  PinOff,
  Search,
  Image as ImageIcon,
  File,
  Download,
  Play,
  Copy,
  Forward,
  AtSign,
} from 'lucide-react';

export interface Message {
  _id?: string;
  id?: string | number;
  sender: string;
  message: string;
  editedMessage?: string;
  reactions?: Array<{ emoji: string; users: string[] }>;
  replyTo?: string | null;
  replyToMessage?: { sender: string; message: string; messageId: string };
  isReported?: boolean;
  timestamp?: string;
  createdAt?: string;
  isRead?: boolean;
  readBy?: string[];
  avatar?: string;
  isEdited?: boolean;
  editedAt?: string;
  isPinned?: boolean;
  messageType?: 'text' | 'file' | 'image' | 'voice';
  fileData?: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    url: string;
  };
  mentions?: string[];
}

interface Props {
  messages: Message[];
  onUpdateMessage?: (idx: number, updatedMsg: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
  onReplyToMessage?: (message: Message) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onReact: (messageId: string, emoji: string, action: 'add' | 'remove') => void;
  currentUser?: string;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  onSearch?: (query: string) => void;
  pinnedMessages?: Message[];
  onlineUsers?: string[];
  unreadMessageId?: string | null;
  showSearch?: boolean;
  onToggleSearch?: () => void;
}

const ChatWindow: React.FC<Props> = ({
  messages,
  onDeleteMessage,
  onReportMessage,
  onReplyToMessage,
  onEditMessage,
  onPinMessage,
  onUnpinMessage,
  currentUser = 'You',
  replyTo,
  onReact,
  onCancelReply,
  onSearch,
  pinnedMessages = [],
  onlineUsers = [],
  unreadMessageId = null,
  showSearch = false,
  onToggleSearch,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinned, setShowPinned] = useState(false);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current) scrollToBottom();
  }, [messages]);

  const onScroll = () => {
    const el = chatRef.current;
    if (el) {
      shouldAutoScroll.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
      setActiveEmojiPicker(null);
    };

    if (activeMenu !== null || activeEmojiPicker !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu, activeEmojiPicker]);

  const calculateMenuPosition = (messageId: string) => {
    const messageEl = messageRefs.current.get(messageId);
    const chatEl = chatRef.current;

    if (messageEl && chatEl) {
      const messageRect = messageEl.getBoundingClientRect();
      const chatRect = chatEl.getBoundingClientRect();
      const spaceBelow = chatRect.bottom - messageRect.bottom;

      return spaceBelow < 400 ? 'top' : 'bottom';
    }

    return 'bottom';
  };

  const handleMenuToggle = (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMenu === messageId) {
      setActiveMenu(null);
    } else {
      const position = calculateMenuPosition(messageId);
      setMenuPosition(position);
      setActiveMenu(messageId);
      setActiveEmojiPicker(null);
    }
  };

  const handleEdit = (msg: Message) => {
    setEditingMessage(msg._id || msg.id?.toString() || '');
    setEditText(msg.editedMessage || msg.message);
    setActiveMenu(null);
  };

  const handleSaveEdit = (messageId: string) => {
    if (onEditMessage && editText.trim() !== '') {
      onEditMessage(messageId, editText.trim());
      setEditingMessage(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenu(null);
    // Could show a toast notification here
  };

  const handleForward = (msg: Message) => {
    // Store message in localStorage for forwarding
    localStorage.setItem('forwardedMessage', JSON.stringify({
      text: msg.message,
      sender: msg.sender,
    }));
    setActiveMenu(null);
    alert('Message ready to forward! Paste in another chat.');
  };

  const handleMention = (username: string) => {
    // This will add @username to the input
    const event = new CustomEvent('addMention', { detail: username });
    window.dispatchEvent(event);
    setActiveMenu(null);
  };

  const scrollToMessage = (messageId: string) => {
    const messageEl = messageRefs.current.get(messageId);
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight effect
      messageEl.style.backgroundColor = '#fef3c7'; // Yellow highlight
      setTimeout(() => {
        messageEl.style.backgroundColor = '';
      }, 2000);
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

  const hasUserReacted = (msg: Message, emoji: string): boolean => {
    return msg.reactions?.some(r => r.emoji === emoji && r.users.includes(currentUser)) || false;
  };

  const getMessageId = (msg: Message): string => {
    return msg._id || msg.id?.toString() || '';
  };

  const isUserOnline = (username: string): boolean => {
    return onlineUsers.includes(username);
  };

  const getRepliedMessage = (replyToId: string | null): Message | null => {
    if (!replyToId) return null;
    return messages.find(m => (m._id || m.id?.toString()) === replyToId) || null;
  };

  const renderMessageContent = (msg: Message) => {
    const msgId = getMessageId(msg);
    const isEditing = editingMessage === msgId;

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveEdit(msgId)}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (msg.messageType === 'image' && msg.fileData) {
      return (
        <div className="space-y-2">
          <img
            src={msg.fileData.url}
            alt={msg.fileData.originalName}
            className="max-w-sm max-h-64 rounded-lg cursor-pointer"
            onClick={() => window.open(msg.fileData?.url, '_blank')}
          />
          <p className="text-xs opacity-75">{msg.fileData.originalName}</p>
        </div>
      );
    }

    if (msg.messageType === 'file' && msg.fileData) {
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <File className="w-8 h-8 text-gray-500 dark:text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate dark:text-white">{msg.fileData.originalName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(msg.fileData.size)}</p>
          </div>
          <a
            href={msg.fileData.url}
            download={msg.fileData.originalName}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      );
    }

    if (msg.messageType === 'voice' && msg.fileData) {
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <Play className="w-6 h-6 text-blue-500" />
          <audio controls className="flex-1">
            <source src={msg.fileData.url} type={msg.fileData.mimetype} />
          </audio>
        </div>
      );
    }

    let displayMessage = msg.editedMessage || msg.message;
    if (msg.mentions && msg.mentions.length > 0) {
      msg.mentions.forEach(mention => {
        const mentionRegex = new RegExp(`@${mention}\\b`, 'gi');
        displayMessage = displayMessage.replace(
          mentionRegex,
          `<span class="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded">@${mention}</span>`
        );
      });
    }

    return (
      <div>
        <p
          className="message-text text-[15px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: displayMessage }}
        />
        {msg.isEdited && (
          <p className="text-xs opacity-60 mt-1">(edited)</p>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {pinnedMessages.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 px-6 py-2 shrink-0">
          <button
            onClick={() => setShowPinned(!showPinned)}
            className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300"
          >
            <Pin className="w-4 h-4" />
            <span>{pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}</span>
          </button>
          {showPinned && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {pinnedMessages.map(msg => (
                <div
                  key={getMessageId(msg)}
                  className="text-sm p-2 bg-white dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => scrollToMessage(getMessageId(msg))}  // ADD THIS
                >
                  <span className="font-medium dark:text-white">{msg.sender}:</span>
                  {msg.message.substring(0, 60)}...
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        ref={chatRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-6 bg-gray-50 dark:bg-gray-900"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-3">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUser;
            const msgId = getMessageId(msg);
            const showActions = hoveredMessage === msgId || activeMenu === msgId || activeEmojiPicker === msgId;
            const userOnline = isUserOnline(msg.sender);
            const isUnreadStart = msgId === unreadMessageId;
            const repliedMsg = getRepliedMessage(msg.replyTo);

            return (
              <React.Fragment key={msgId}>
                {isUnreadStart && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-red-400"></div>
                    <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">
                      New Messages
                    </span>
                    <div className="flex-1 h-px bg-red-400"></div>
                  </div>
                )}

                <div
                  ref={(el) => {
                    if (el) {
                      messageRefs.current.set(msgId, el);
                    } else {
                      messageRefs.current.delete(msgId);
                    }
                  }}

                  className={`group flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  onMouseEnter={() => setHoveredMessage(msgId)}
                  onMouseLeave={() => {
                    if (activeMenu !== msgId && activeEmojiPicker !== msgId) {
                      setHoveredMessage(null);
                    }
                  }}
                >
                  {!isMe && (
                    <div className="relative">
                      {msg.avatar ? (
                        <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-sm font-medium shrink-0">
                          {msg.sender.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {userOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {repliedMsg && (
                      <div className={`mb-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm border-l-4 cursor-pointer hover:bg-opacity-80 ${isMe
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-600'
                        }`}
                        onClick={() => scrollToMessage(getMessageId(repliedMsg))}
                      >
                        <div className="flex items-start gap-2">
                          <Reply className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs mb-0.5">{repliedMsg.sender}</div>
                            <div className="text-sm leading-relaxed break-words line-clamp-2">
                              {repliedMsg.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="relative min-w-0 max-w-full">
                      {showActions && (
                        <div
                          className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 flex items-center space-x-1 bg-white dark:bg-gray-700 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 p-1 z-10`}
                        >
                          <button
                            onClick={(e) => handleMenuToggle(msgId, e)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full text-gray-500 dark:text-gray-300 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div
                        className={`px-4 py-2.5 rounded-2xl relative min-w-0 max-w-full ${isMe
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm'
                          } ${msg.isReported ? 'opacity-60' : ''} ${msg.isPinned ? 'ring-2 ring-amber-400' : ''}`}
                      >
                        {msg.isPinned && (
                          <Pin className="w-3 h-3 absolute -top-1 -right-1 text-amber-500" />
                        )}

                        {!isMe && (
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 break-words">{msg.sender}</p>
                        )}

                        {renderMessageContent(msg)}

                        <div className={`flex items-center justify-end mt-1 space-x-1 ${isMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          <span className="text-[11px]">{formatTime(msg.timestamp || msg.createdAt)}</span>
                          {isMe && msg.readBy && (
                            msg.readBy.length > 1 ? (
                              <CheckCheck className="w-3 h-3 text-blue-200" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>

                      {activeEmojiPicker === msgId && (
                        <div
                          className={`absolute ${isMe ? 'right-0' : 'left-0'} ${menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-50 shadow-2xl`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <EmojiPicker
                            onEmojiClick={(emojiData: EmojiClickData) => {
                              onReact(msgId, emojiData.emoji, 'add');
                              setActiveEmojiPicker(null);
                            }}
                            width={300}
                            height={350}
                            previewConfig={{ showPreview: false }}
                            skinTonesDisabled
                          />
                        </div>
                      )}

                      {activeMenu === msgId && (
                        <div
                          className={`absolute ${isMe ? 'right-0' : 'left-0'} ${menuPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 min-w-[180px] z-50 max-h-[400px] overflow-y-auto`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between">
                              {quickReactions.map((emoji) => {
                                const hasReacted = hasUserReacted(msg, emoji);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      onReact(msgId, emoji, hasReacted ? 'remove' : 'add');
                                      setActiveMenu(null);
                                    }}
                                    className={`text-lg hover:scale-110 transition-transform ${hasReacted ? 'scale-110 opacity-100' : 'opacity-70'
                                      }`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setActiveEmojiPicker(msgId);
                              setActiveMenu(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Smile className="w-4 h-4" />
                            More reactions
                          </button>

                          <button
                            onClick={() => {
                              onReplyToMessage?.(msg);
                              setActiveMenu(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Reply className="w-4 h-4" />
                            Reply
                          </button>

                          <button
                            onClick={() => handleCopyText(msg.message)}
                            className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy text
                          </button>

                          <button
                            onClick={() => handleForward(msg)}
                            className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Forward className="w-4 h-4" />
                            Forward
                          </button>

                          {!isMe && (
                            <button
                              onClick={() => handleMention(msg.sender)}
                              className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <AtSign className="w-4 h-4" />
                              Mention {msg.sender}
                            </button>
                          )}

                          {isMe && msg.messageType === 'text' && (
                            <button
                              onClick={() => handleEdit(msg)}
                              className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}

                          {msg.isPinned ? (
                            <button
                              onClick={() => {
                                onUnpinMessage?.(msgId);
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <PinOff className="w-4 h-4" />
                              Unpin
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onPinMessage?.(msgId);
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Pin className="w-4 h-4" />
                              Pin
                            </button>
                          )}

                          <button
                            onClick={() => {
                              onReportMessage?.(msgId);
                              setActiveMenu(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                          >
                            <Flag className="w-4 h-4" />
                            Report
                          </button>

                          {isMe && (
                            <button
                              onClick={() => {
                                onDeleteMessage?.(msgId);
                                setActiveMenu(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map((reaction, i) => {
                          const userHasReacted = reaction.users.includes(currentUser);
                          return (
                            <button
                              key={i}
                              onClick={() => onReact(msgId, reaction.emoji, userHasReacted ? 'remove' : 'add')}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-all hover:scale-105 ${userHasReacted
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 shadow-sm'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              title={reaction.users.join(', ')}
                            >
                              <span>{reaction.emoji}</span>
                              {reaction.users.length > 1 && (
                                <span className="text-xs font-medium">{reaction.users.length}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;
