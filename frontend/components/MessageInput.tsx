// frontend/components/MessageInput.tsx - FULLY FIXED
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Mic, Image as ImageIcon, File as FileIcon, AtSign, MoreVertical, Moon, Sun, Sparkles, FileImage } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useDarkMode } from '../pages/_app';

interface Props {
  onSend: (message: string, replyTo?: string | null, mentions?: string[]) => void;
  onFileUpload?: (file: File) => void;
  onVoiceRecord?: (audioBlob: Blob) => void;
  replyTo?: any;
  replyPreview?: string;
  onCancelReply?: () => void;
  disabled?: boolean;
  users?: string[];
}

const MessageInput: React.FC<Props> = ({
  onSend,
  onFileUpload,
  onVoiceRecord,
  replyTo = null,
  replyPreview = '',
  onCancelReply,
  disabled = false,
  users = []
}) => {
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);

  // Use shared dark mode context
  const { darkMode, toggleDarkMode } = useDarkMode();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_ROWS = 1;
  const MAX_ROWS = 6;
  const LINE_HEIGHT = 20;

  const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

  useEffect(() => {
    inputRef.current?.focus();
  }, [replyTo]);


  const adjustHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxH = MAX_ROWS * LINE_HEIGHT;
    const newH = Math.min(Math.max(el.scrollHeight, MIN_ROWS * LINE_HEIGHT), maxH);
    el.style.height = `${newH}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  useEffect(() => {
    const lastWord = input.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionSearch(lastWord.substring(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, [input]);

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const filteredUsers = users.filter(user =>
    user.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleMentionSelect = (username: string) => {
    const words = input.split(' ');
    words[words.length - 1] = `@${username} `;
    setInput(words.join(' '));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (input.trim() === '' && !selectedFile || disabled) return;

    if (selectedFile && onFileUpload) {
      onFileUpload(selectedFile);
      setSelectedFile(null);
    } else if (input.trim()) {
      const mentions = extractMentions(input);
      onSend(input.trim(), replyTo?._id || replyTo?.id, mentions);
    }

    setInput('');
    setShowEmojiPicker(false);
    setTimeout(adjustHeight, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (replyTo !== null) {
        onCancelReply?.();
      }
      if (selectedFile) {
        setSelectedFile(null);
      }
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const inputElement = inputRef.current;
    if (inputElement) {
      const start = inputElement.selectionStart || input.length;
      const end = inputElement.selectionEnd || input.length;
      const newValue = input.substring(0, start) + emoji + input.substring(end);
      setInput(newValue);
      setTimeout(() => {
        inputElement.focus();
        const newCursorPos = start + emoji.length;
        inputElement.setSelectionRange(newCursorPos, newCursorPos);
        adjustHeight();
      }, 0);
    } else {
      setInput(prev => prev + emoji);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setShowMenu(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setShowMenu(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (onVoiceRecord) {
          onVoiceRecord(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const searchGifs = async (query: string) => {
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`
      );
      const data = await response.json();
      setGifs(data.results || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    }
  };

  const searchStickers = async () => {
    try {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&contentfilter=low&media_filter=sticker&limit=20`
      );
      const data = await response.json();
      setStickers(data.results || []);
    } catch (error) {
      console.error('Error fetching stickers:', error);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    setInput(prev => prev + ` ${gifUrl} `);
    setShowGifPicker(false);
    setShowMenu(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showMenu]);

  if (isRecording) {
    return (
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Recording...</span>
            <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{formatRecordingTime(recordingTime)}</span>
          </div>
          <button
            onClick={cancelRecording}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={stopRecording}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shrink-0">
      {replyTo !== null && (
        <div className="mb-3 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border-l-4 border-blue-500 min-w-0">
          <div className="flex items-center space-x-2 overflow-hidden min-w-0">
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium shrink-0">Replying to:</span>
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate min-w-0">{replyPreview}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="mb-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 overflow-hidden">
            {selectedFile.type.startsWith('image/') ? (
              <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
            ) : (
              <FileIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{selectedFile.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}

      {showMentions && filteredUsers.length > 0 && (
        <div className="mb-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredUsers.map(user => (
            <button
              key={user}
              onClick={() => handleMentionSelect(user)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <AtSign className="w-4 h-4 text-blue-500" />
              <span className="text-sm dark:text-gray-200">{user}</span>
            </button>
          ))}
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="mb-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search GIFs..."
              value={gifSearch}
              onChange={(e) => {
                setGifSearch(e.target.value);
                if (e.target.value) searchGifs(e.target.value);
              }}
              className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {gifs.map((gif, i) => (
              <img
                key={i}
                src={gif.media_formats.tinygif.url}
                alt="GIF"
                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                onClick={() => handleGifSelect(gif.media_formats.gif.url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticker Picker */}
      {showStickerPicker && (
        <div className="mb-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2">
            {stickers.map((sticker, i) => (
              <img
                key={i}
                src={sticker.media_formats.tinygif.url}
                alt="Sticker"
                className="w-full h-20 object-contain cursor-pointer hover:opacity-80"
                onClick={() => handleGifSelect(sticker.media_formats.gif.url)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 min-w-0">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.zip,audio/*"
        />
        <input
          ref={imageInputRef}
          type="file"
          onChange={handleImageSelect}
          className="hidden"
          accept="image/*"
        />

        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl py-1.5 min-w-[180px] z-50"
            >
              <button
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Attach Image
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <Paperclip className="w-4 h-4" />
                Attach File
              </button>

              <button
                onClick={() => {
                  toggleDarkMode();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>

              <button
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowMenu(false);
                  if (!showGifPicker) searchGifs('trending');
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <FileImage className="w-4 h-4" />
                GIFs
              </button>

              <button
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker);
                  setShowMenu(false);
                  if (!showStickerPicker) searchStickers();
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Stickers
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 relative flex items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Connecting..." : "Type a message... (@mention users)"}
            disabled={disabled}
            rows={MIN_ROWS}
            style={{ minHeight: `${MIN_ROWS * LINE_HEIGHT}px`, maxHeight: `${MAX_ROWS * LINE_HEIGHT}px` }}
            className="w-full min-w-0 resize-none overflow-y-auto py-2.5 pl-4 pr-10 bg-gray-100 dark:bg-gray-700 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[15px] leading-5 break-words dark:text-white"
          />

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-2 bottom-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl rounded-xl overflow-hidden"
            >
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={300}
                height={350}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                theme={darkMode ? Theme.DARK : Theme.LIGHT}
              />
            </div>
          )}
        </div>

        {onVoiceRecord && !input.trim() && !selectedFile && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="p-3 rounded-full transition-all duration-200 shrink-0 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200"
            title="Record voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        {(input.trim() || selectedFile) && (
          <button
            onClick={handleSend}
            disabled={disabled}
            className={`
              p-3 rounded-full transition-all duration-200 shrink-0
              ${!disabled
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageInput;