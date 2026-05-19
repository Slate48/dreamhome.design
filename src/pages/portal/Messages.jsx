import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Send, Plus, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function Messages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newThread, setNewThread] = useState({ subject: '', category: 'General', content: '' });

  const { data: projects = [] } = useQuery({
    queryKey: ['my-projects', user?.email],
    queryFn: () => base44.entities.Project.filter({ client_email: user?.email }),
    enabled: !!user?.email,
  });

  const projectId = projects[0]?.id;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', projectId],
    queryFn: () => base44.entities.Message.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Group by thread
  const threads = messages.reduce((acc, msg) => {
    const tid = msg.thread_id || msg.id;
    if (!acc[tid]) acc[tid] = { id: tid, subject: msg.thread_subject || 'Message', category: msg.thread_category, messages: [] };
    acc[tid].messages.push(msg);
    return acc;
  }, {});
  const threadList = Object.values(threads).sort((a, b) => {
    const aDate = a.messages[a.messages.length - 1]?.created_date;
    const bDate = b.messages[b.messages.length - 1]?.created_date;
    return new Date(bDate) - new Date(aDate);
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] });
      setNewMessage('');
    },
  });

  const handleSendReply = () => {
    if (!newMessage.trim() || !selectedThread) return;
    sendMutation.mutate({
      project_id: projectId,
      thread_id: selectedThread,
      thread_subject: threads[selectedThread]?.subject,
      thread_category: threads[selectedThread]?.category,
      sender_email: user?.email,
      sender_name: user?.full_name,
      content: newMessage,
    });
  };

  const handleNewThread = () => {
    if (!newThread.subject.trim() || !newThread.content.trim()) return;
    const threadId = `thread_${Date.now()}`;
    sendMutation.mutate({
      project_id: projectId,
      thread_id: threadId,
      thread_subject: newThread.subject,
      thread_category: newThread.category,
      sender_email: user?.email,
      sender_name: user?.full_name,
      content: newThread.content,
    });
    setNewThread({ subject: '', category: 'General', content: '' });
    setShowNew(false);
  };

  const currentThread = selectedThread ? threads[selectedThread] : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">Messages</h1>
        <Button onClick={() => { setShowNew(true); setSelectedThread(null); }} className="bg-gold hover:bg-gold/90 text-white font-body text-xs tracking-wider">
          <Plus className="w-4 h-4 mr-2" /> New Message
        </Button>
      </div>

      {showNew ? (
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg text-foreground">New Message</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
          <Input
            placeholder="Subject"
            value={newThread.subject}
            onChange={e => setNewThread({ ...newThread, subject: e.target.value })}
            className="bg-cream"
          />
          <Select value={newThread.category} onValueChange={val => setNewThread({ ...newThread, category: val })}>
            <SelectTrigger className="bg-cream"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Design Question', 'Change Request', 'Billing', 'General'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Your message..."
            value={newThread.content}
            onChange={e => setNewThread({ ...newThread, content: e.target.value })}
            rows={4}
            className="bg-cream"
          />
          <Button onClick={handleNewThread} className="bg-gold hover:bg-gold/90 text-white font-body text-xs tracking-wider">
            <Send className="w-4 h-4 mr-2" /> Send
          </Button>
        </Card>
      ) : currentThread ? (
        <Card className="bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <button onClick={() => setSelectedThread(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-body text-sm mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to threads
            </button>
            <h3 className="font-heading text-lg text-foreground">{currentThread.subject}</h3>
            <Badge variant="secondary" className="text-[10px] mt-1">{currentThread.category}</Badge>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {currentThread.messages
              .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
              .map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_email === user?.email ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.sender_email === user?.email ? 'bg-gold/10 text-foreground' : 'bg-cream'
                  }`}>
                    <p className="font-body text-xs text-muted-foreground mb-1">{msg.sender_name}</p>
                    <p className="font-body text-sm">{msg.content}</p>
                    <p className="font-body text-[10px] text-muted-foreground mt-1">
                      {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
          </div>
          <div className="p-4 border-t border-border flex gap-2">
            <Input
              placeholder="Type a reply..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendReply()}
              className="bg-cream"
            />
            <Button onClick={handleSendReply} className="bg-gold hover:bg-gold/90 text-white shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        threadList.length === 0 ? (
          <Card className="p-12 bg-white text-center">
            <MessageSquare className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="font-heading text-lg text-foreground">No Messages Yet</p>
            <p className="font-body text-muted-foreground text-sm mt-2">Start a conversation with your design team.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {threadList.map(thread => {
              const lastMsg = thread.messages[thread.messages.length - 1];
              const unread = thread.messages.some(m => !m.is_read && m.sender_email !== user?.email);
              return (
                <Card
                  key={thread.id}
                  className="p-4 bg-white cursor-pointer hover:border-gold/30 transition-colors"
                  onClick={() => setSelectedThread(thread.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${unread ? 'bg-gold' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-medium text-foreground truncate">{thread.subject}</p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{thread.category}</Badge>
                      </div>
                      <p className="font-body text-xs text-muted-foreground truncate mt-1">{lastMsg?.content}</p>
                    </div>
                    <p className="font-body text-[10px] text-muted-foreground shrink-0">
                      {lastMsg?.created_date ? format(new Date(lastMsg.created_date), 'MMM d') : ''}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}