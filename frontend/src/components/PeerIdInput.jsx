import React, { useEffect, useMemo } from 'react';
import { Clipboard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { normalizePeerInput, isValidInternalId } from '@/utils/identity';

const isPeerLike = (value) => {
  if (!value) return false;
  const upper = value.toUpperCase();
  if (upper.startsWith('KURD')) return true;
  return /^[A-Z0-9\s-]+$/i.test(value);
};

const PeerIdInput = ({
  label = 'Peer ID',
  placeholder = 'KURD-ABCD3F7Z veya ABCD3F7Z',
  value,
  onChange,
  helperText = 'KURD öneki otomatik temizlenir',
  allowNonId = false,
  onValidChange
}) => {
  const normalized = useMemo(() => normalizePeerInput(value || ''), [value]);
  const peerLike = useMemo(() => isPeerLike(value), [value]);
  const isValid = useMemo(() => {
    if (!value) return false;
    if (!peerLike && allowNonId) return true;
    return isValidInternalId(normalized);
  }, [value, normalized, allowNonId, peerLike]);

  useEffect(() => {
    if (onValidChange) {
      onValidChange(isValid);
    }
  }, [isValid, onValidChange]);

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (allowNonId && !isPeerLike(text)) {
        onChange(text);
        toast.success('📋 Yapıştırıldı');
        return;
      }
      const normalizedValue = normalizePeerInput(text);
      onChange(normalizedValue || text);
      toast.success('📋 Yapıştırıldı');
    } catch (_) {
      toast.error('Panoya erişilemedi');
    }
  };

  const handleBlur = () => {
    if (!value) return;
    if (allowNonId && !peerLike) return;
    const normalizedValue = normalizePeerInput(value);
    if (normalizedValue && normalizedValue !== value) {
      onChange(normalizedValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-slate-800 border-slate-700 text-white font-mono"
        />
        <Button
          type="button"
          onClick={handlePasteFromClipboard}
          variant="outline"
          className="border-slate-700"
          title="Panodan yapıştır"
        >
          <Clipboard className="w-4 h-4" />
        </Button>
      </div>
      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
      {value && peerLike && !isValid && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4" />
          Geçersiz Peer ID formatı
        </div>
      )}
      {value && peerLike && isValid && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Geçerli Peer ID
        </div>
      )}
    </div>
  );
};

export default PeerIdInput;
