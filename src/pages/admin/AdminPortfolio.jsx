import React, { useState, useEffect } from 'react';
import { adminApi } from '@/api/adminEntities';
import { uploadFile } from '@/lib/uploadFile';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Pencil, Trash2, GripVertical, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = ['Kitchens', 'Bathrooms', 'Closets', 'Home Bars', 'Pantries', 'Custom Millwork'];

const BLANK = { title: '', category: 'Kitchens', image_url: '', description: '', featured: false, sort_order: 0 };

export default function AdminPortfolio() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [filterCat, setFilterCat] = useState('All');
  const [editing, setEditing] = useState(null); // item object being edited
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await adminApi.list('PortfolioItem', 'sort_order', 200);
    setItems(data);
  }

  const filtered = filterCat === 'All' ? items : items.filter(i => i.category === filterCat);

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(filtered);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    // Update sort_order for all visible items
    const updated = reordered.map((item, idx) => ({ ...item, sort_order: idx }));
    setItems(prev => {
      const others = prev.filter(i => filtered.every(f => f.id !== i.id));
      return [...others, ...updated].sort((a, b) => a.sort_order - b.sort_order);
    });
    await Promise.all(updated.map(item => adminApi.update('PortfolioItem', item.id, { sort_order: item.sort_order })));
    toast({ title: 'Order saved' });
  }

  function openAdd() { setEditing(null); setForm(BLANK); setShowForm(true); }
  function openEdit(item) { setEditing(item); setForm({ ...item }); setShowForm(true); }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await uploadFile(file);
    setForm(f => ({ ...f, image_url: file_url }));
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    if (editing) {
      await adminApi.update('PortfolioItem', editing.id, form);
      toast({ title: 'Item updated' });
    } else {
      await adminApi.create('PortfolioItem', { ...form, sort_order: items.length });
      toast({ title: 'Item added' });
    }
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    await adminApi.delete('PortfolioItem', item.id);
    toast({ title: 'Item deleted' });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Portfolio</h1>
          <p className="font-body text-muted-foreground text-sm mt-1">Drag to reorder. Click pencil to edit.</p>
        </div>
        <Button onClick={openAdd} className="bg-gold hover:bg-gold/90 text-white">
          <Plus size={16} className="mr-2" /> Add Photo
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-body transition-colors ${filterCat === cat ? 'bg-gold text-white' : 'bg-white border border-border text-muted-foreground hover:border-gold hover:text-gold'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Drag-drop grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="portfolio" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filtered.map((item, idx) => (
                <Draggable key={item.id} draggableId={item.id} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`relative bg-white rounded-lg overflow-hidden border group ${snapshot.isDragging ? 'border-gold shadow-lg' : 'border-border'}`}
                    >
                      <div {...provided.dragHandleProps} className="absolute top-2 left-2 z-10 bg-white/80 rounded p-1 opacity-0 group-hover:opacity-100 cursor-grab">
                        <GripVertical size={14} className="text-muted-foreground" />
                      </div>
                      <img src={item.image_url} alt={item.title} className="w-full h-36 object-cover" />
                      <div className="p-3">
                        <p className="font-body text-xs font-medium text-foreground truncate">{item.title}</p>
                        <p className="font-body text-xs text-gold mt-0.5">{item.category}</p>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="bg-white rounded p-1 shadow hover:bg-gold hover:text-white transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(item)} className="bg-white rounded p-1 shadow hover:bg-red-500 hover:text-white transition-colors">
                          <Trash2 size={13} />
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

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl">{editing ? 'Edit Item' : 'Add Portfolio Item'}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-body">Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-body">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-body">Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-body">Image</Label>
                <div className="mt-1 space-y-2">
                  {form.image_url && (
                    <img src={form.image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-body file:bg-gold/10 file:text-gold hover:file:bg-gold/20" />
                  {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                  <p className="text-xs text-muted-foreground">Or paste URL:</p>
                  <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="featured" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                <Label htmlFor="featured" className="text-xs font-body cursor-pointer">Featured on homepage</Label>
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