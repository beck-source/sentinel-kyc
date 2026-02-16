import { KeyRound } from 'lucide-react';
import { useApiKey } from '@/components/ApiKeyDialog';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { configured, openDialog } = useApiKey();

  return (
    <header
      data-testid="header"
      className="sticky top-0 z-30 flex items-center justify-between px-8 bg-white border-b border-border"
      style={{ height: 56 }}
    >
      <h1
        data-testid="page-title"
        className="text-lg font-semibold text-foreground"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <button
          onClick={openDialog}
          data-testid="api-key-indicator"
          className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-muted cursor-pointer"
          title={configured ? 'API key configured — click to manage' : 'No API key — click to configure'}
        >
          <KeyRound className="size-4 text-muted-foreground" />
          <span
            className="absolute top-1.5 right-1.5 size-2 rounded-full"
            style={{ backgroundColor: configured ? '#22c55e' : '#f59e0b' }}
          />
        </button>
      </div>
    </header>
  );
}
