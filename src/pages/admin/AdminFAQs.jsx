import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/adminEntities';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Pencil, Trash2, GripVertical, X, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const BLANK = { question: '', answer: '', sort_order: 0, is_active: true };

export default function AdminFAQs() {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await adminApi.list('FAQItem', 'sort_order', 100);
    setFaqs(data);
  }

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(faqs);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updated = reordered.map((item, idx) => ({ ...item, sort_order: idx }));
    setFaqs(updated);
    await Promise.all(updated.map(item => adminApi.update('FAQItem', item.id, { sort_order: item.sort_order })));
    toast({ title: 'Order saved' });
  }

  function openAdd() { setEditing(null); setForm(BLANK); setShowForm(true); }
  function openEdit(faq) { setEditing(faq); setForm({ ...faq }); setShowForm(true); }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      await adminApi.update('FAQItem', editing.id, form);
      toast({ title: 'FAQ updated' });
    } else {
      await adminApi.create('FAQItem', { ...form, sort_order: faqs.length });
      toast({ title: 'FAQ added' });
    }
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(faq) {
    if (!confirm('Delete this FAQ?')) return;
    await adminApi.delete('FAQItem', faq.id);
    toast({ title: 'Deleted' });
    await load();
  }

  async function toggleActive(faq) {
    await adminApi.update('FAQItem', faq.id, { is_active: !faq.is_active });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">FAQs</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">Drag to reorder. Toggle visibility with the eye icon.</p>
        </div>
        <Button onClick={openAdd} className="bg-gold hover:bg-gold/90 text-white">
          <Plus size={16} className="mr-2" /> Add FAQ
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="faqs">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {faqs.map((faq, idx) => (
                <Draggable key={faq.id} draggableId={faq.id} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white rounded-xl p-5 border flex items-start gap-4 ${snapshot.isDragging ? 'border-gold shadow-lg' : 'border-border'} ${!faq.is_active ? 'opacity-50' : ''}`}
                    >
                      <div {...provided.dragHandleProps} className="mt-1 cursor-grab text-muted-foreground hover:text-foreground">
                        <GripVertical size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-foreground">{faq.question}</p>
                        <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleActive(faq)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          {faq.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button onClick={() => openEdit(faq)} className="p-1.5 rounded bg-gold/10 hover:bg-gold hover:text-white text-gold transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(faq)} className="p-1.5 rounded bg-red-50 hover:bg-red-500 hover:text-white text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl">{editing ? 'Edit FAQ' : 'Add FAQ'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-body">Question</Label>
                <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-body">Answer</Label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  rows={5}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gold hover:bg-gold/90 text-white">
                <Check size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}