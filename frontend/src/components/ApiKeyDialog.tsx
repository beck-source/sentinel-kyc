import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, CheckCircle2, XCircle, ExternalLink, Trash2 } from 'lucide-react';

// ── Context ──────────────────────────────────────────────────────────────────

interface ApiKeyContextValue {
  configured: boolean;
  openDialog: () => void;
  /** Open dialog and call `cb` after a key is successfully saved */
  openDialogThen: (cb: () => void) => void;
  refreshStatus: () => Promise<void>;
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function useApiKey() {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error('useApiKey must be used within ApiKeyProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [configured, setConfigured] = useState(false);
  const [open, setOpen] = useState(false);
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/key-status');
      if (res.ok) {
        const data = await res.json();
        setConfigured(data.configured);
      }
    } catch {
      // backend not reachable
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const openDialog = useCallback(() => {
    setOnSuccess(null);
    setOpen(true);
  }, []);

  const openDialogThen = useCallback((cb: () => void) => {
    // Wrap in a function that returns the callback so React doesn't call it as a state updater
    setOnSuccess(() => cb);
    setOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setConfigured(true);
    setOpen(false);
    if (onSuccess) {
      onSuccess();
      setOnSuccess(null);
    }
  }, [onSuccess]);

  const handleDeleted = useCallback(() => {
    setConfigured(false);
  }, []);

  return (
    <ApiKeyContext.Provider value={{ configured, openDialog, openDialogThen, refreshStatus }}>
      {children}
      <ApiKeyDialog
        open={open}
        onOpenChange={setOpen}
        configured={configured}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </ApiKeyContext.Provider>
  );
}

// ── Dialog ───────────────────────────────────────────────────────────────────

type DialogStatus = 'idle' | 'validating' | 'success' | 'error';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configured: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}

function ApiKeyDialog({ open, onOpenChange, configured, onSaved, onDeleted }: ApiKeyDialogProps) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<DialogStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setKey('');
      setStatus('idle');
      setErrorMsg('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!key.trim()) return;
    setStatus('validating');
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(onSaved, 600);
      } else {
        const data = await res.json();
        setStatus('error');
        setErrorMsg(data.detail || 'Invalid API key');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Could not reach the server');
    }
  };

  const handleDelete = async () => {
    try {
      await fetch('/api/ai/key', { method: 'DELETE' });
      onDeleted();
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            Configure API Key
          </DialogTitle>
          <DialogDescription>
            Enter your Anthropic API key to enable AI features.{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Get a key <ExternalLink className="size-3" />
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="sk-ant-..."
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && key.trim() && status !== 'validating') handleSubmit();
              }}
              disabled={status === 'validating' || status === 'success'}
              aria-invalid={status === 'error'}
            />
            {status === 'error' && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <XCircle className="size-4" />
                {errorMsg}
              </p>
            )}
            {status === 'success' && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="size-4" />
                API key saved successfully
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {configured && (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
              Remove Key
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={status === 'validating'}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!key.trim() || status === 'validating' || status === 'success'}>
              {status === 'validating' && <Loader2 className="size-4 animate-spin" />}
              {status === 'validating' ? 'Validating...' : 'Save Key'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
