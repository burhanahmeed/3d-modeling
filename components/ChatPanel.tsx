'use client';

import { useState, useRef, useEffect } from 'react';
import ApiKeyModal from './ApiKeyModal';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // Base64 data URL for images
}

interface ChatPanelProps {
  onCodeGenerated: (code: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const API_KEY_STORAGE_KEY = 'openai_api_key';

export default function ChatPanel({ onCodeGenerated, onLoadingChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const handleSend = async (imageOverride?: { file: File; dataUrl: string } | null) => {
    const fileToSend = imageOverride?.file ?? imageFile;
    const imageDataUrl = imageOverride?.dataUrl ?? selectedImage;
    if ((!input.trim() && !fileToSend) || isLoading) return;

    // Check if API key exists
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const userMessage: Message = { role: 'user', content: input || 'Analyze this image' };
    if (imageDataUrl) {
      userMessage.image = imageDataUrl;
    }
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setSelectedImage(null);
    setImageFile(null);
    setIsLoading(true);

    try {
      // Step 1: If there's an image, analyze it first
      let promptText = input;
      if (fileToSend) {
        console.log('Step 1: Analyzing image...', fileToSend.name);

        const analyzeFormData = new FormData();
        analyzeFormData.append('apiKey', apiKey);
        analyzeFormData.append('image', fileToSend);

        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          body: analyzeFormData,
        });

        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to analyze image');
        }

        const analyzeData = await analyzeResponse.json();
        promptText = analyzeData.description || input;

        // Show the description to the user
        const descriptionMessage: Message = {
          role: 'assistant',
          content: promptText
        };
        setMessages((prev) => [...prev, descriptionMessage]);
      }

      // Step 2: Generate code based on the description
      console.log('Step 2: Generating code for:', promptText);

      const generateFormData = new FormData();
      generateFormData.append('messages', JSON.stringify([...newMessages, { role: 'assistant', content: promptText }]));
      generateFormData.append('apiKey', apiKey);

      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        body: generateFormData,
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to generate code');
      }

      const generateData = await generateResponse.json();

      const finalMessage: Message = {
        role: 'assistant',
        content: generateData.message || 'I\'ve created your 3D model!'
      };

      setMessages((prev) => [...prev, finalMessage]);

      if (generateData.code) {
        onCodeGenerated(generateData.code);
      }
    } catch (error) {
      console.error('Error calling API:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate 3D model'}`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
      // Auto-send for immediate analysis - pass both file and data URL
      setTimeout(() => handleSend({ file, dataUrl: result }), 100);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendClick = () => {
    handleSend();
  };

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    // Retry sending if there's input
    if (input.trim()) {
      handleSendClick();
    }
  };

  const handleApiKeyClick = () => {
    setShowApiKeyModal(true);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Text to 3D
          </h1>
          <button
            onClick={handleApiKeyClick}
            className="text-xs px-3 py-1 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Configure API key"
          >
            {apiKey ? '⚙️ Config' : '🔑 Set Key'}
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !apiKey && (
            <div className="text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
                Welcome! Please set your OpenAI API key to get started.
              </p>
              <button
                onClick={handleApiKeyClick}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Set API Key
              </button>
            </div>
          )}

          {messages.length === 0 && apiKey && (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              Describe an object to generate 3D geometry...
            </p>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {message.image && (
                  <img src={message.image} alt="Uploaded" className="max-w-full rounded-lg mb-2 max-h-64 object-contain" />
                )}
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          {/* Drag and drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleDropZoneClick}
            className={`mb-2 p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
              isDragging
                ? 'border-zinc-500 bg-zinc-100 dark:bg-zinc-800'
                : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span>📷 Drag & drop an image here or click to browse</span>
            </div>
          </div>

          {/* Image preview */}
          {selectedImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={selectedImage}
                alt="Preview"
                className="max-h-32 rounded-lg border border-zinc-300 dark:border-zinc-700"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* Text input with attachment button */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach image"
            >
              📎
            </button>
            <input
              type="text"
              placeholder="A simple chair... (or just upload an image)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendClick}
              disabled={isLoading || (!input.trim() && !imageFile)}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleApiKeySave}
      />
    </>
  );
}
