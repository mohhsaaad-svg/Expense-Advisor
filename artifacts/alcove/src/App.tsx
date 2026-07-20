import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@workspace/replit-auth-web';
import {
  useListNotes,
  useCreateNote,
  useDeleteNote,
  getListNotesQueryKey,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookLock, Trash2, LogOut } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function Notes() {
  const qc = useQueryClient();
  const { data: notes, isLoading } = useListNotes();
  const createNote = useCreateNote({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotesQueryKey() }),
    },
  });
  const deleteNote = useDeleteNote({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotesQueryKey() }),
    },
  });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    createNote.mutate({ data: { title: title.trim(), body } });
    setTitle('');
    setBody('');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="input-note-title"
          />
          <Textarea
            placeholder="Write it down before it slips away…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid="input-note-body"
          />
          <Button
            onClick={submit}
            disabled={!title.trim() || createNote.isPending}
            data-testid="button-create-note"
          >
            Save note
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading && <p className="text-muted-foreground">Loading notes…</p>}
        {!isLoading && (notes ?? []).length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Nothing here yet. Your notes stay yours — write the first one.
          </p>
        )}
        {(notes ?? []).map((note) => (
          <Card key={note.id} data-testid={`card-note-${note.id}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{note.title}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteNote.mutate({ id: note.id })}
                data-testid={`button-delete-note-${note.id}`}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardHeader>
            {note.body && (
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.body}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <BookLock className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-8">
            <BookLock className="w-7 h-7" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">Alcove</h1>
          <p className="text-lg text-muted-foreground mb-8">
            A quiet corner for your notes. Private by construction — every note belongs to you
            alone.
          </p>
          <Button size="lg" onClick={login} data-testid="button-login">
            Sign in to Alcove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookLock className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Alcove</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground" data-testid="text-user-email">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <Notes />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
