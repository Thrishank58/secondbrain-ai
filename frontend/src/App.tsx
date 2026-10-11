import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  BrainCircuit,
  House,
  Library,
  MessageSquare,
  Settings2,
  Plus,
  Search,
  ArrowUp,
  Sparkles,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Stars,
  Zap,
  Clock3,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle2,
  FileUp,
  BookOpen,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  UserRound,
  LogOut,
} from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

type AuthUser = { id: number; full_name: string; email: string }

function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = localStorage.getItem('secondbrain_token')
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: DocumentSource[]
}

type DocumentItem = {
  id: number
  filename: string
  total_pages: number
  pages_with_text: number
  uploaded_at?: string
}

type DocumentSource = {
  document_id: number
  filename: string
  page: number
}

type ConversationItem = {
  id: number
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

type AppSettings = {
  theme: 'dark' | 'light'
  accent: string
  responseStyle: string
  language: string
  animations: boolean
}

const suggestions = [
  {
    icon: FileText,
    title: 'Summarize a document',
    description: 'Turn lengthy PDFs into clear insights.',
    prompt: 'Summarize my documents',
  },
  {
    icon: Sparkles,
    title: 'Explain a concept',
    description: 'Understand complex topics simply.',
    prompt: 'Explain a complex concept simply',
  },
  {
    icon: Library,
    title: 'Connect my knowledge',
    description: 'Discover connections across your notes.',
    prompt: 'Find connections between my documents',
  },
]

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json()
    return data.detail || data.message || fallback
  } catch {
    return fallback
  }
}

async function fetchDocuments(): Promise<DocumentItem[]> {
  const response = await fetch(`${API_URL}/api/documents`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    throw new Error(await readError(response, 'Could not load documents.'))
  }
  const data = await response.json()
  return Array.isArray(data.documents) ? data.documents : []
}

async function uploadPdf(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/api/documents/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'PDF upload failed.'))
  }

  return response.json()
}

async function deletePdf(id: number) {
  const response = await fetch(`${API_URL}/api/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readError(response, 'Could not delete this document.'))
  }

  return response.json()
}

async function fetchConversations(): Promise<ConversationItem[]> {
  const response = await fetch(`${API_URL}/api/conversations`, { headers: authHeaders() })
  if (!response.ok) throw new Error(await readError(response, 'Could not load conversations.'))
  const data = await response.json()
  return Array.isArray(data.conversations) ? data.conversations : []
}

async function createConversation(title: string): Promise<ConversationItem> {
  const response = await fetch(`${API_URL}/api/conversations`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not create conversation.'))
  const data = await response.json()
  return data.conversation as ConversationItem
}

async function fetchConversation(id: number) {
  const response = await fetch(`${API_URL}/api/conversations/${id}`, { headers: authHeaders() })
  if (!response.ok) throw new Error(await readError(response, 'Could not open conversation.'))
  return response.json()
}

async function deleteConversation(id: number) {
  const response = await fetch(`${API_URL}/api/conversations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not delete conversation.'))
  return response.json()
}

async function sendConversationMessage(id: number, message: string) {
  const response = await fetch(`${API_URL}/api/conversations/${id}/messages`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not send message.'))
  return response.json()
}

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('secondbrain_token') || '')
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('secondbrain_user')
      return saved ? JSON.parse(saved) as AuthUser : null
    } catch {
      return null
    }
  })
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirm, setAuthConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [activePage, setActivePage] = useState('Home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [submittedPrompt, setSubmittedPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [conversationError, setConversationError] = useState('')
  const [deletingConversationId, setDeletingConversationId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [askDocumentsOnly, setAskDocumentsOnly] = useState(false)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('secondbrain_settings')
      return saved
        ? { theme: 'dark', accent: 'violet', responseStyle: 'balanced', language: 'English', animations: true, ...JSON.parse(saved) }
        : { theme: 'dark', accent: 'violet', responseStyle: 'balanced', language: 'English', animations: true }
    } catch {
      return { theme: 'dark', accent: 'violet', responseStyle: 'balanced', language: 'English', animations: true }
    }
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = async () => {
    setDocumentsLoading(true)
    setDocumentsError('')
    try {
      const items = await fetchDocuments()
      setDocuments(items)
    } catch (err) {
      setDocumentsError(
        err instanceof Error
          ? err.message
          : 'Could not load your document library.',
      )
    } finally {
      setDocumentsLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('secondbrain_settings', JSON.stringify(settings))
    document.documentElement.dataset.sbTheme = settings.theme
    document.documentElement.dataset.sbAccent = settings.accent
    document.documentElement.dataset.sbAnimations = settings.animations ? 'on' : 'off'
  }, [settings])

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings((current: any) => ({ ...current, [key]: value }))
  }

  const loadConversations = async () => {
    setConversationsLoading(true)
    setConversationError('')
    try {
      setConversations(await fetchConversations())
    } catch (err) {
      setConversationError(err instanceof Error ? err.message : 'Could not load conversation history.')
    } finally {
      setConversationsLoading(false)
    }
  }

  const openConversation = async (conversation: ConversationItem) => {
    setConversationError('')
    try {
      const data = await fetchConversation(conversation.id)
      setActiveConversationId(conversation.id)
      setMessages((data.messages || []).map((message: { role: 'user' | 'assistant'; content: string }) => ({
        role: message.role,
        content: message.content,
      })))
      setSubmittedPrompt('')
      setPrompt('')
      setError('')
      setActivePage('AI Conversations')
    } catch (err) {
      setConversationError(err instanceof Error ? err.message : 'Could not open conversation.')
    }
  }

  const handleDeleteConversation = async (conversation: ConversationItem) => {
    if (!window.confirm(`Delete "${conversation.title}" and its messages?`)) return
    setDeletingConversationId(conversation.id)
    try {
      await deleteConversation(conversation.id)
      setConversations((items) => items.filter((item) => item.id !== conversation.id))
      if (activeConversationId === conversation.id) {
        setActiveConversationId(null)
        setMessages([])
        setSubmittedPrompt('')
        setActivePage('Home')
      }
    } catch (err) {
      setConversationError(err instanceof Error ? err.message : 'Could not delete conversation.')
    } finally {
      setDeletingConversationId(null)
    }
  }

  useEffect(() => {
    if (authToken) {
      void loadDocuments()
      void loadConversations()
    }
  }, [authToken])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadMessage('Please choose a PDF file.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadMessage('This PDF is larger than 15 MB.')
      return
    }

    setUploading(true)
    setUploadMessage('')
    setDocumentsError('')

    try {
      const result = await uploadPdf(file)
      setUploadMessage(result.message || `${file.name} uploaded successfully.`)
      await loadDocuments()
    } catch (err) {
      setUploadMessage(
        err instanceof Error ? err.message : 'PDF upload failed.',
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (document: DocumentItem) => {
    const confirmed = window.confirm(`Delete "${document.filename}"?`)
    if (!confirmed) return

    setDeletingId(document.id)
    setDocumentsError('')
    setUploadMessage('')

    try {
      await deletePdf(document.id)
      setDocuments((current) => current.filter((item) => item.id !== document.id))
      setUploadMessage(`Deleted ${document.filename}.`)
    } catch (err) {
      setDocumentsError(
        err instanceof Error ? err.message : 'Could not delete this document.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (question?: string) => {
    const message = (question ?? prompt).trim()
    if (!message || isLoading) return

    setSubmittedPrompt(message)
    setPrompt('')
    setError('')
    setConversationError('')
    setActivePage('AI Conversations')
    setMessages((previous) => [...previous, { role: 'user', content: message }])
    setIsLoading(true)

    try {
      if (!askDocumentsOnly) {
        let conversationId = activeConversationId
        if (!conversationId) {
          const title = message.length > 54 ? `${message.slice(0, 51).trim()}...` : message
          const created = await createConversation(title || 'New conversation')
          conversationId = created.id
          setActiveConversationId(created.id)
        }

        const data = await sendConversationMessage(conversationId, message)
        setMessages((previous) => [
          ...previous,
          { role: 'assistant', content: data.reply ?? 'The AI returned an empty answer.' },
        ])
        await loadConversations()
      } else {
        const response = await fetch(`${API_URL}/api/documents/ask`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ question: message }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.detail || `Request failed with status ${response.status}`)
        }
        setMessages((previous) => [
          ...previous,
          {
            role: 'assistant',
            content: data.answer ?? 'The AI returned an empty answer.',
            sources: Array.isArray(data.sources) ? data.sources : [],
          },
        ])
      }
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Something went wrong while contacting your AI.'
      setError(
        messageText.includes('Failed to fetch')
          ? 'Could not reach the backend. Make sure FastAPI is running on port 8000.'
          : messageText,
      )
      // Remove the optimistic user message if the request failed.
      setMessages((previous) => previous.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')

    const email = authEmail.trim().toLowerCase()
    if (authMode === 'register' && authPassword !== authConfirm) {
      setAuthError('Your passwords do not match.')
      return
    }
    if (authPassword.length < 8) {
      setAuthError('Use a password with at least 8 characters.')
      return
    }

    setAuthBusy(true)
    try {
      if (authMode === 'register') {
        const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: authName.trim(), email, password: authPassword }),
        })
        if (!registerResponse.ok) {
          throw new Error(await readError(registerResponse, 'Could not create your account.'))
        }
      }

      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: authPassword }),
      })
      if (!loginResponse.ok) {
        throw new Error(await readError(loginResponse, 'Sign in failed.'))
      }

      const data = await loginResponse.json()
      const token = String(data.access_token || '')
      const user = data.user as AuthUser | undefined
      if (!token || !user) throw new Error('The server returned an incomplete login response.')

      localStorage.setItem('secondbrain_token', token)
      localStorage.setItem('secondbrain_user', JSON.stringify(user))
      setAuthToken(token)
      setAuthUser(user)
      setAuthPassword('')
      setAuthConfirm('')
      setActivePage('Home')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('secondbrain_token')
    localStorage.removeItem('secondbrain_user')
    setAuthToken('')
    setAuthUser(null)
    setDocuments([])
    setConversations([])
    setActiveConversationId(null)
    setMessages([])
    setPrompt('')
    setSubmittedPrompt('')
    setActivePage('Home')
    setAuthMode('login')
  }

  if (!authToken) {
    return (
      <div className="auth-shell">
        <div className="cosmic-background">
          <div className="ambient-glow glow-one" />
          <div className="ambient-glow glow-two" />
          <div className="ambient-glow glow-three" />
          <div className="star-field" />
        </div>
        <div className="auth-brand">
          <div className="brand-icon"><BrainCircuit size={25} /></div>
          <div>
            <div className="brand-name">second<span>brain</span></div>
            <div className="brand-caption">YOUR PERSONAL UNIVERSE</div>
          </div>
        </div>
        <main className="auth-layout">
          <section className="auth-panel">
            <div className="auth-eyebrow"><Sparkles size={14} /> YOUR KNOWLEDGE, CONNECTED</div>
            <h1>{authMode === 'login' ? <>Welcome back to<br /><span>your second brain.</span></> : <>Build a mind<br /><span>that remembers.</span></>}</h1>
            <p className="auth-intro">{authMode === 'login' ? 'Sign in to pick up where your curiosity left off.' : 'Create your own private space for ideas, documents, and discoveries.'}</p>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Full name</span>
                  <div className="auth-input-wrap"><UserRound size={17} /><input autoComplete="name" value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="How should we call you?" minLength={2} maxLength={80} required /></div>
                </label>
              )}
              <label className="auth-field">
                <span>Email address</span>
                <div className="auth-input-wrap"><Mail size={17} /><input type="email" autoComplete="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" required /></div>
              </label>
              <label className="auth-field">
                <span>Password</span>
                <div className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} maxLength={128} required /><button className="auth-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              </label>
              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Confirm password</span>
                  <div className="auth-input-wrap"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={authConfirm} onChange={(e) => setAuthConfirm(e.target.value)} placeholder="Enter your password again" minLength={8} maxLength={128} required /></div>
                </label>
              )}
              {authError && <div className="auth-error" role="alert"><AlertCircle size={16} /><span>{authError}</span></div>}
              <button className="auth-submit" type="submit" disabled={authBusy}>
                {authBusy ? <LoaderCircle size={17} className="spin-icon" /> : <ArrowRight size={17} />}
                {authBusy ? 'Please wait...' : authMode === 'login' ? 'Sign in to workspace' : 'Create my account'}
              </button>
            </form>
            <div className="auth-switch">
              {authMode === 'login' ? "New to SecondBrain?" : 'Already have an account?'}
              <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>
                {authMode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </div>
            <div className="auth-security"><LockKeyhole size={13} /> Local AI. Your own workspace. Sign in required.</div>
          </section>

          <aside className="auth-visual">
            <div className="visual-orbit orbit-a" /><div className="visual-orbit orbit-b" />
            <div className="visual-grid" />
            <div className="visual-core"><BrainCircuit size={64} strokeWidth={1.2} /><span /></div>
            <div className="knowledge-node node-one"><FileText size={17} /><span>Documents</span></div>
            <div className="knowledge-node node-two"><Sparkles size={17} /><span>Ideas</span></div>
            <div className="knowledge-node node-three"><MessageSquare size={17} /><span>Conversations</span></div>
            <div className="visual-caption"><span className="visual-caption-kicker">YOUR PERSONAL KNOWLEDGE ENGINE</span><strong>Everything you learn.<br />One place to think.</strong><p>Connect your documents, questions, and ideas in a private AI workspace.</p></div>
            <div className="visual-glow" />
          </aside>
        </main>
        <footer className="auth-footer"><span><span className="footer-status" /> POWERED BY YOUR LOCAL AI</span><span>SECOND BRAIN · BUILT FOR THE CURIOUS</span></footer>
      </div>
    )
  }

  const startNewChat = () => {
    setPrompt('')
    setSubmittedPrompt('')
    setMessages([])
    setActiveConversationId(null)
    setError('')
    setConversationError('')
    setIsLoading(false)
    setAskDocumentsOnly(false)
    setActivePage('Home')
  }

  return (
    <div className="app-shell">
      <div className="cosmic-background">
        <div className="ambient-glow glow-one" />
        <div className="ambient-glow glow-two" />
        <div className="ambient-glow glow-three" />
        <div className="star-field" />
      </div>

      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            className="sidebar"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="brand">
              <div className="brand-icon">
                <BrainCircuit size={23} strokeWidth={1.8} />
              </div>
              <div className="brand-copy">
                <span className="brand-name">
                  second<span>brain</span>
                </span>
                <span className="brand-caption">YOUR PERSONAL UNIVERSE</span>
              </div>
              <button
                className="icon-button sidebar-toggle"
                onClick={() => setSidebarOpen(false)}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={17} />
              </button>
            </div>

            <button className="new-chat-button" onClick={startNewChat}>
              <Plus size={17} />
              <span>New conversation</span>
              <span className="shortcut">⌘ K</span>
            </button>

            <button
              className="sidebar-search"
              onClick={() => setActivePage('Documents')}
              type="button"
            >
              <Search size={15} />
              <span>Search your knowledge</span>
              <span className="search-shortcut">⌘ F</span>
            </button>

            <div className="nav-section">
              <span className="section-label">WORKSPACE</span>
              <nav className="navigation">
                {[
                  { name: 'Home', icon: House },
                  { name: 'My Knowledge', icon: BrainCircuit },
                  { name: 'Documents', icon: Library },
                  { name: 'AI Conversations', icon: MessageSquare },
                ].map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    className={`nav-item ${activePage === name ? 'active' : ''}`}
                    onClick={() => {
                      setActivePage(name)
                      if (name === 'Documents') void loadDocuments()
                    }}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{name}</span>
                    {name === 'Documents' && (
                      <span className="nav-count">{documents.length}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="recent-section">
              <div className="recent-heading">
                <span className="section-label">RECENT CONVERSATIONS</span>
                <button className="icon-button" type="button" onClick={() => void loadConversations()} aria-label="Refresh conversations" title="Refresh conversations" disabled={conversationsLoading}>
                  {conversationsLoading ? <LoaderCircle size={14} className="spin-icon" /> : <RefreshCw size={14} />}
                </button>
              </div>
              {conversationError && <div className="conversation-sidebar-error" role="alert">{conversationError}</div>}
              {conversationsLoading && conversations.length === 0 ? (
                <div className="recent-empty">Loading history...</div>
              ) : conversations.length === 0 ? (
                <div className="recent-empty">Your saved chats will appear here.</div>
              ) : (
                conversations.slice(0, 8).map((conversation) => (
                  <div className={`recent-conversation ${activeConversationId === conversation.id ? 'active' : ''}`} key={conversation.id}>
                    <button className="recent-chat" type="button" title={conversation.title} onClick={() => void openConversation(conversation)}>
                      <MessageSquare size={14} />
                      <span>{conversation.title}</span>
                    </button>
                    <button className="recent-delete" type="button" title="Delete conversation" aria-label={`Delete ${conversation.title}`} onClick={() => void handleDeleteConversation(conversation)} disabled={deletingConversationId === conversation.id}>
                      {deletingConversationId === conversation.id ? <LoaderCircle size={13} className="spin-icon" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="sidebar-bottom">
              <div className="storage-card">
                <div className="storage-icon"><Zap size={16} /></div>
                <div className="storage-copy">
                  <strong>{documents.length ? `${documents.length} documents stored` : 'Your brain is empty.'}</strong>
                  <span>{documents.length ? 'Your knowledge, in one place.' : "Let's change that."}</span>
                </div>
                <div className="storage-indicator" />
              </div>

              <button
                className={`nav-item settings-item ${activePage === 'Settings' ? 'active' : ''}`}
                onClick={() => setActivePage('Settings')}
              >
                <Settings2 size={17} />
                <span>Settings</span>
              </button>

              <div className="profile">
                <div className="avatar">SB</div>
                <div className="profile-copy">
                  <strong>{authUser?.full_name || 'My Second Brain'}</strong>
                  <span>{authUser?.email || 'Personal workspace'}</span>
                </div>
                <button className="icon-button" aria-label="Log out" title="Log out" onClick={handleLogout}>
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <PanelLeft size={18} />
              </button>
            )}
            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-current">{activePage}</span>
            </div>
          </div>
          <div className="topbar-right">
            <div className="system-status">
              <span className="status-dot" />
              LOCAL WORKSPACE
            </div>
            <div className="topbar-divider" />
            <button
              className="icon-button"
              aria-label="Settings"
              onClick={() => setActivePage('Settings')}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activePage === 'Home' ? (
            <motion.section
              key="home"
              className="home-content"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="welcome-label">
                <Stars size={14} />
                <span>YOUR INTELLIGENCE, EXPANDED</span>
              </div>
              <h1 className="hero-title">
                Your mind,
                <br />
                <span>without limits.</span>
              </h1>
              <p className="hero-description">
                A universe for everything you learn, discover,
                <br className="desktop-break" />
                and never want to forget.
              </p>

              <div className="prompt-container">
                <div className="prompt-topline">
                  <Sparkles size={15} />
                  <span>ASK YOUR SECOND BRAIN</span>
                  <span className="prompt-model">LOCAL QWEN AI</span>
                </div>

                <label className="document-mode-toggle">
                  <input
                    type="checkbox"
                    checked={askDocumentsOnly}
                    onChange={(event) => setAskDocumentsOnly(event.target.checked)}
                  />
                  <span>Answer using my uploaded PDFs</span>
                </label>

                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault()
                      void handleSubmit()
                    }
                  }}
                  placeholder="Ask anything. Explore everything..."
                  rows={2}
                  aria-label="Ask your second brain"
                  disabled={isLoading}
                />
                <div className="prompt-bottom">
                  <div className="prompt-hint">
                    <span className="keyboard-key">↵</span>
                    <span>to ask</span>
                    <span className="keyboard-key">⇧ ↵</span>
                    <span>for a new line</span>
                  </div>
                  <button
                    className="send-button"
                    onClick={() => void handleSubmit()}
                    disabled={!prompt.trim() || isLoading}
                    aria-label="Send message"
                  >
                    {isLoading ? <LoaderCircle size={18} className="spin-icon" /> : <ArrowUp size={18} />}
                  </button>
                </div>
              </div>

              <div className="suggestions-heading">
                <span>START EXPLORING</span>
                <span className="suggestions-line" />
                <Sparkles size={14} />
              </div>
              <div className="suggestion-grid">
                {suggestions.map(({ icon: Icon, title, description, prompt: suggestionPrompt }, index) => (
                  <motion.button
                    key={title}
                    className="suggestion-card"
                    onClick={() => setPrompt(suggestionPrompt)}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 + index * 0.08 }}
                    whileHover={{ y: -4, transition: { duration: 0.18 } }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <div className="suggestion-icon"><Icon size={19} strokeWidth={1.7} /></div>
                    <div className="suggestion-copy">
                      <strong>{title}</strong>
                      <span>{description}</span>
                    </div>
                    <ArrowRight className="suggestion-arrow" size={16} />
                  </motion.button>
                ))}
              </div>

              <div className="empty-state">
                <div className="empty-orbit">
                  <div className="orbit-ring orbit-ring-one" />
                  <div className="orbit-ring orbit-ring-two" />
                  <div className="orbit-core"><BrainCircuit size={24} strokeWidth={1.5} /></div>
                </div>
                <span className="empty-title">An infinite mind. A fresh start.</span>
                <span className="empty-description">
                  Upload your first document to give your AI something to remember.
                </span>
                <button className="text-button" onClick={() => setActivePage('Documents')}>
                  Explore your knowledge <ArrowRight size={14} />
                </button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key={activePage}
              className="secondary-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {activePage === 'Documents' ? (
                <div className="documents-page">
                  <div className="secondary-icon"><Library size={25} /></div>
                  <h2>Your Documents</h2>
                  <p>Upload PDFs and build your private, local knowledge library.</p>

                  <div className="document-upload-card">
                    <div className="upload-symbol"><FileUp size={25} /></div>
                    <strong>{uploading ? 'Uploading your PDF...' : 'Add a PDF to your SecondBrain'}</strong>
                    <span>PDF files only, up to 15 MB each.</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => void handleUpload(event)}
                      hidden
                    />
                    <button
                      className="back-home-button"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <LoaderCircle size={16} className="spin-icon" /> : <Upload size={16} />}
                      {uploading ? 'Uploading...' : 'Choose PDF'}
                    </button>
                  </div>

                  {uploadMessage && (
                    <div className="document-notice success-notice">
                      <CheckCircle2 size={17} />
                      <span>{uploadMessage}</span>
                    </div>
                  )}
                  {documentsError && (
                    <div className="chat-error" role="alert">
                      <AlertCircle size={18} /><span>{documentsError}</span>
                    </div>
                  )}

                  <div className="documents-list-heading">
                    <div>
                      <h3>Your library</h3>
                      <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
                    </div>
                    <button className="icon-button" type="button" onClick={() => void loadDocuments()} aria-label="Refresh documents" disabled={documentsLoading}>
                      {documentsLoading ? <LoaderCircle size={17} className="spin-icon" /> : <RefreshCw size={17} />}
                    </button>
                  </div>

                  {documentsLoading && documents.length === 0 ? (
                    <div className="document-empty"><LoaderCircle size={18} className="spin-icon" /> Loading your library...</div>
                  ) : documents.length === 0 ? (
                    <div className="document-empty">
                      <BookOpen size={24} />
                      <strong>Your library is waiting</strong>
                      <span>Upload a PDF to start asking questions about your notes.</span>
                    </div>
                  ) : (
                    <div className="documents-list">
                      {documents.map((document) => (
                        <div className="document-row" key={document.id}>
                          <div className="document-file-icon"><FileText size={20} /></div>
                          <div className="document-info">
                            <strong title={document.filename}>{document.filename}</strong>
                            <span>{document.total_pages} pages · {document.pages_with_text} with readable text</span>
                          </div>
                          <button
                            className="icon-button delete-document-button"
                            type="button"
                            onClick={() => void handleDelete(document)}
                            disabled={deletingId === document.id}
                            aria-label={`Delete ${document.filename}`}
                            title="Delete document"
                          >
                            {deletingId === document.id ? <LoaderCircle size={17} className="spin-icon" /> : <Trash2 size={17} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="back-home-button" onClick={() => { setAskDocumentsOnly(true); setActivePage('Home') }}>
                    Ask your documents <ArrowRight size={15} />
                  </button>
                </div>
              ) : activePage === 'AI Conversations' ? (
                <>
                  <div className="secondary-icon"><MessageSquare size={25} /></div>
                  <h2>AI Conversations</h2>
                  <p>{activeConversationId ? 'Continue where you left off.' : 'Your saved conversations stay available in the sidebar.'}</p>
                  {conversationError && <div className="chat-error" role="alert"><AlertCircle size={18} /><span>{conversationError}</span></div>}

                  <div className="chat-mode-note">
                    <Sparkles size={15} />
                    {askDocumentsOnly ? 'Using your uploaded documents for answers' : 'Chatting with local Qwen AI'}
                  </div>

                  {messages.length > 0 && (
                    <div className="chat-thread">
                      {messages.map((message, index) => (
                        <div key={`${index}-${message.role}`} className={`chat-message ${message.role}`}>
                          <div className="chat-message-label">
                            {message.role === 'user' ? <MessageSquare size={15} /> : <BrainCircuit size={16} />}
                            <strong>{message.role === 'user' ? 'You' : 'SecondBrain AI'}</strong>
                          </div>
                          <p>{message.content}</p>
                          {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                            <div className="answer-sources">
                              <strong>Sources</strong>
                              {message.sources.map((source, sourceIndex) => (
                                <div className="answer-source" key={`${source.document_id}-${source.page}-${sourceIndex}`}>
                                  <FileText size={14} />
                                  <span>{source.filename}, page {source.page}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {isLoading && (
                        <div className="chat-message assistant">
                          <div className="chat-message-label"><BrainCircuit size={16} /><strong>SecondBrain AI</strong></div>
                          <p className="thinking-indicator"><LoaderCircle size={16} className="spin-icon" /> Thinking with Qwen...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {error && <div className="chat-error" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

                  {!isLoading && (
                    <form
                      className="chat-followup"
                      onSubmit={(event) => { event.preventDefault(); void handleSubmit() }}
                    >
                      <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            void handleSubmit()
                          }
                        }}
                        placeholder="Ask a follow-up question..."
                        rows={2}
                        aria-label="Ask a follow-up question"
                      />
                      <button className="send-button" type="submit" disabled={!prompt.trim() || isLoading} aria-label="Send follow-up">
                        <ArrowUp size={18} />
                      </button>
                    </form>
                  )}

                  {!submittedPrompt && messages.length === 0 && (
                    <div className="coming-card">
                      <MessageSquare size={20} />
                      <div><strong>Ready for your first question</strong><span>Return home and ask your local AI anything.</span></div>
                    </div>
                  )}
                </>
              ) : activePage === 'My Knowledge' ? (
                <>
                  <div className="secondary-icon"><BrainCircuit size={25} /></div>
                  <h2>My Knowledge</h2>
                  <p>Your documents and connected concepts will live here.</p>
                  <button className="back-home-button" onClick={() => setActivePage('Documents')}>Browse documents <ArrowRight size={15} /></button>
                </>
              ) : activePage === 'Settings' ? (
                <div className="settings-page">
                  <div className="secondary-icon"><Settings2 size={25} /></div>
                  <div className="settings-heading">
                    <h2>Settings</h2>
                    <p>Make your SecondBrain feel like yours. Your preferences save automatically on this device.</p>
                  </div>

                  <section className="settings-card">
                    <div className="settings-card-title"><UserRound size={18} /><div><h3>Account</h3><p>Your signed-in workspace identity</p></div></div>
                    <div className="settings-account-row">
                      <div className="settings-avatar">{(authUser?.full_name || 'SB').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
                      <div className="settings-account-copy"><strong>{authUser?.full_name || 'SecondBrain user'}</strong><span>{authUser?.email || 'No account email available'}</span><small>Account ID: {authUser?.id ?? 'Unavailable'}</small></div>
                      <span className="settings-status"><span /> Signed in</span>
                    </div>
                    <div className="settings-inline-note"><LockKeyhole size={15} /> Account changes such as password updates are managed by the authentication service.</div>
                  </section>

                  <section className="settings-card">
                    <div className="settings-card-title"><Sparkles size={18} /><div><h3>AI preferences</h3><p>Choose how SecondBrain responds</p></div></div>
                    <div className="settings-control">
                      <label htmlFor="sb-response-style">Response detail</label>
                      <select id="sb-response-style" value={settings.responseStyle} onChange={(e) => updateSetting('responseStyle', e.target.value)}>
                        <option value="concise">Concise · Straight to the point</option>
                        <option value="balanced">Balanced · Helpful detail</option>
                        <option value="detailed">Detailed · Thorough explanations</option>
                      </select>
                    </div>
                    <div className="settings-control">
                      <label htmlFor="sb-language">Preferred language</label>
                      <select id="sb-language" value={settings.language} onChange={(e) => updateSetting('language', e.target.value)}>
                        <option>English</option><option>Hindi</option><option>Kannada</option><option>Tamil</option><option>Telugu</option><option>Malayalam</option>
                      </select>
                    </div>
                    <div className="settings-inline-note"><BrainCircuit size={15} /> Current local model: <strong>qwen2.5:3b</strong>. These preferences are saved locally; they will affect AI responses after the chat request is wired to include them.</div>
                  </section>

                  <section className="settings-card">
                    <div className="settings-card-title"><Sparkles size={18} /><div><h3>Appearance</h3><p>Fine-tune the look of your workspace</p></div></div>
                    <div className="settings-control">
                      <label htmlFor="sb-theme">Theme</label>
                      <select id="sb-theme" value={settings.theme} onChange={(e) => updateSetting('theme', e.target.value)}>
                        <option value="dark">Cosmic dark</option><option value="light">Light</option><option value="system">Follow system</option>
                      </select>
                    </div>
                    <div className="settings-control">
                      <label>Accent colour</label>
                      <div className="settings-choice-row">
                        {[
                          { value: 'violet', label: 'Violet', color: '#a879ff' },
                          { value: 'blue', label: 'Blue', color: '#6d8cff' },
                          { value: 'cyan', label: 'Cyan', color: '#49d9e8' },
                        ].map((choice) => (
                          <button type="button" key={choice.value} className={`settings-accent ${settings.accent === choice.value ? 'selected' : ''}`} onClick={() => updateSetting('accent', choice.value)} aria-pressed={settings.accent === choice.value}>
                            <span style={{ background: choice.color }} />{choice.label}{settings.accent === choice.value ? <CheckCircle2 size={14} /> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="settings-toggle-row"><span><strong>Motion effects</strong><small>Use subtle transitions and floating animations</small></span><input type="checkbox" checked={settings.animations} onChange={(e) => updateSetting('animations', e.target.checked)} /></label>
                  </section>

                  <section className="settings-card">
                    <div className="settings-card-title"><Library size={18} /><div><h3>Workspace & privacy</h3><p>Local-first overview</p></div></div>
                    <div className="settings-stats">
                      <div><span>PDF documents</span><strong>{documents.length}</strong></div>
                      <div><span>AI model</span><strong>Qwen 2.5 3B</strong></div>
                      <div><span>Processing</span><strong>Local API</strong></div>
                    </div>
                    <div className="settings-inline-note"><CheckCircle2 size={15} /> Preferences are stored in this browser on this computer. Clearing browser storage resets them.</div>
                  </section>

                  <div className="settings-footer-actions">
                    <button className="back-home-button" type="button" onClick={() => { setSettings({ theme: 'dark', accent: 'violet', responseStyle: 'balanced', language: 'English', animations: true }); }}>
                      <RefreshCw size={15} /> Reset preferences
                    </button>
                    <button className="back-home-button settings-logout" type="button" onClick={handleLogout}>
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="secondary-icon"><Settings2 size={25} /></div>
                  <h2>{activePage}</h2>
                  <p>This section is ready for your knowledge workspace.</p>
                </>
              )}

              {activePage !== 'Documents' && (
                <button className="back-home-button" onClick={() => setActivePage('Home')}>
                  Return home <ArrowRight size={15} />
                </button>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <footer className="app-footer">
          <span><span className="footer-status" /> YOUR SPACE. YOUR KNOWLEDGE.</span>
          <span>BUILT FOR THE CURIOUS <Sparkles size={12} /></span>
        </footer>
      </main>
    </div>
  )
}

export default App
