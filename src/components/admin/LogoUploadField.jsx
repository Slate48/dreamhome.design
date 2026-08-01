import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { uploadFile } from '@/lib/uploadFile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Mirrors ALLOWED_UPLOAD_TYPES / MAX_UPLOAD_BYTES in workers/api/src/index.js so a
// bad file is rejected before it costs an upload round-trip. Video types the worker
// also accepts are deliberately excluded — this field is for logos.
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT_ATTR = ACCEPTED_TYPES.join(',');

/**
 * Logo picker: drag-and-drop or click to upload to R2. The preview sits on the
 * background color the logo will actually appear against (`tone`), so an unreadable
 * choice is obvious here instead of after a deploy.
 *
 * Laid out horizontally (swatch beside its controls) to keep the Brand card short
 * enough that the settings page fits one screen.
 *
 * Uploading only sets the form value — the parent still has to save.
 */
export default function LogoUploadField({ label, hint, value, onChange, tone = 'light' }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const onDark = tone === 'dark';

  async function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Unsupported file type',
        description: 'Use a PNG, JPEG, WebP, or SVG image.',
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Logo images must be 20MB or smaller.',
      });
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      onChange(file_url);
      toast({ title: 'Logo uploaded', description: 'Click "Save changes" to publish it.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Could not reach the media server. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <Label className="text-xs font-body text-muted-foreground">{label}</Label>

      <div className="mt-1 flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          aria-label={`Upload ${label}`}
          className={`shrink-0 w-28 h-16 rounded-lg border border-dashed flex items-center justify-center p-2 transition-colors ${
            onDark ? 'bg-charcoal' : 'bg-gray-50'
          } ${dragging ? 'border-gold ring-2 ring-gold/30' : 'border-border hover:border-gold'}`}
        >
          {uploading ? (
            <Loader2 size={16} className={`animate-spin ${onDark ? 'text-white/60' : 'text-muted-foreground'}`} />
          ) : value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <UploadCloud size={18} className={onDark ? 'text-white/40' : 'text-muted-foreground'} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-gold hover:underline"
            >
              {value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-muted-foreground hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUrl(v => !v)}
              className="text-muted-foreground hover:text-gold transition-colors"
            >
              {showUrl ? 'Hide URL' : 'Use a URL'}
            </button>
          </div>
          {hint && <p className="font-body text-xs text-muted-foreground mt-1 leading-snug">{hint}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        className="hidden"
      />

      {showUrl && (
        <Input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          className="mt-2"
        />
      )}
    </div>
  );
}
