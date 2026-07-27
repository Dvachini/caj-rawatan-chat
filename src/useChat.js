import { useEffect, useRef, useState } from 'react';

import { getConversation, getConversations } from './api';

const welcome = {
  role: 'assistant',
  text: 'Tanya tentang caj rawatan. Sumber rasmi diberi keutamaan.',
};

export default function useChat() {
  const [messages, setMessages] = useState([welcome]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const abortRef = useRef();

  async function loadConversations() {
    try {
      const body = await getConversations();
      setConversations(body.conversations);
    } catch {
      setConversations([]);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  function startNewConversation() {
    setConversationId(null);
    setMessages([welcome]);
  }

  async function openConversation(id) {
    try {
      const { conversation } = await getConversation(id);
      setConversationId(id);
      setMessages(
        conversation.messages.map((message) => ({
          role: message.role,
          text: message.content,
          sources: message.sources,
        })),
      );
    } catch {
      setMessages([{ role: 'error', text: 'Perbualan tidak dapat dibuka.' }]);
    }
  }

  function updateLastMessage(event) {
    setMessages((current) =>
      current.map((message, index) => {
        if (index !== current.length - 1) return message;
        if (event.type === 'token') {
          return { ...message, text: message.text + event.value };
        }
        if (event.type === 'done') return { ...message, ...event };
        return message;
      }),
    );
  }

  async function readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop();

      for (const block of blocks) {
        const data = block
          .split('\n')
          .find((line) => line.startsWith('data: '));

        if (data) updateLastMessage(JSON.parse(data.slice(6)));
      }

      if (done) return;
    }
  }

  async function sendMessage(text = question) {
    const cleanQuestion = text.trim();
    if (!cleanQuestion || isLoading) return;

    setQuestion('');
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { role: 'user', text: cleanQuestion },
      { role: 'assistant', text: '', sources: [] },
    ]);
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: cleanQuestion, conversationId }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Permintaan gagal.');
      }

      await readStream(response);
      await loadConversations();
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages((current) => [
          ...current.slice(0, -1),
          { role: 'error', text: error.message },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return {
    messages,
    question,
    isLoading,
    conversations,
    abortRef,
    setQuestion,
    startNewConversation,
    openConversation,
    sendMessage,
  };
}
