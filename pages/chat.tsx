import Layout from '@/components/Layout'
import { useState, useRef, useEffect } from 'react'
import { useDarkMode } from '@/lib/useDarkMode'
import { Send, ExternalLink, Settings, MessageSquare } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Rectangle = dynamic(
  () => import('react-leaflet').then(mod => mod.Rectangle),
  { ssr: false }
)

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type AnalysisParams = {
  classACode: number
  classBCode: number
  bbox: [number, number, number, number]
  location: string
  algorithm: string
  testSize: number
  samplesPerClass: number
  scale: number
  seed: number
}

type PendingComparison = {
  class1?: string
  class2?: string
  location?: string
  algorithm?: string
  testSize?: number
  samplesPerClass?: number
  scale?: number
  seed?: number
  bbox?: [number, number, number, number]
} | null

const INITIAL_PROMPTS = [
  { icon: '🌲', text: 'Compare forest vs water in Maine' },
  { icon: '🏙️', text: 'Urban vs cropland in California' },
  { icon: '❓', text: 'What are the 64 embeddings?' },
  { icon: '📊', text: 'Which algorithm should I use?' },
]

const PENDING_PROMPTS = [
  { icon: '✅', text: 'Yes, that looks correct' },
  { icon: '🔄', text: 'Change the location' },
  { icon: '🔀', text: 'Use different classes' },
  { icon: '⚙️', text: 'Use XGBoost instead' },
]

const CONFIRMED_PROMPTS = [
  { icon: '🌍', text: 'Try another region' },
  { icon: '❓', text: 'Why these embeddings?' },
  { icon: '📈', text: 'How can I improve accuracy?' },
  { icon: '🔬', text: 'Explain the results' },
]

const QUESTION_PROMPTS = [
  { icon: '🌲', text: 'Compare forest vs water in Maine' },
  { icon: '🏙️', text: 'Urban vs cropland in California' },
  { icon: '🔢', text: 'How many embeddings do I need?' },
  { icon: '🌊', text: 'Why are coasts more accurate?' },
]

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingComparison, setPendingComparison] = useState<PendingComparison>(null)
  const [lastConfirmedComparison, setLastConfirmedComparison] = useState<PendingComparison>(null)
  const [displayedComparison, setDisplayedComparison] = useState<PendingComparison>(null)
  const [notebookLink, setNotebookLink] = useState<string | null>(null)
  const [analysisParams, setAnalysisParams] = useState<AnalysisParams | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { darkMode } = useDarkMode()

  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0',
    inputBg: darkMode ? '#242424' : '#fff',
    inputBorder: darkMode ? '#404040' : '#dadce0',
    userBubble: darkMode ? '#1967d2' : '#1967d2',
    assistantBubble: darkMode ? '#2a2a2a' : '#f1f3f4',
    buttonBg: darkMode ? '#1967d2' : '#1967d2',
    accentGreen: darkMode ? '#34a853' : '#34a853',
  }

  // Determine which prompts to show based on conversation state
  const getActivePrompts = () => {
    if (messages.length === 0) return INITIAL_PROMPTS
    if (displayedComparison?.bbox) return CONFIRMED_PROMPTS
    if (pendingComparison && !pendingComparison.bbox) return PENDING_PROMPTS
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'assistant' && !pendingComparison) return QUESTION_PROMPTS
    return INITIAL_PROMPTS
  }

  const activePrompts = getActivePrompts()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (lastConfirmedComparison?.bbox && !displayedComparison?.bbox) {
      setDisplayedComparison(lastConfirmedComparison)
    }
  }, [lastConfirmedComparison, displayedComparison])

  const handleSend = async (customMessage?: string) => {
    const messageToSend = customMessage || input
    if (!messageToSend.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          pendingComparison: pendingComparison?.bbox ? null : pendingComparison,
          lastConfirmedComparison
        })
      })

      const data = await response.json()
      console.log('API response:', data)

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.pendingComparison !== undefined) {
        setPendingComparison(data.pendingComparison)
      }

      if (data.confirmed && data.bbox) {
        const confirmed = data.pendingComparison
        setLastConfirmedComparison(confirmed)
        setDisplayedComparison(confirmed)
        setAnalysisParams(data.analysisParams)

        if (data.showNotebookButton) {
          setNotebookLink('http://mybinder.org/v2/gh/FelipeBenavidesMz/Alpha-Earth-Land-Cover-Classifier/main?labpath=alpha_earth_app.ipynb')
        }
      } else if (data.pendingComparison === null) {
        setPendingComparison(null)
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (content: string) => {
    let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/\n/g, '<br/>')
    return formatted
  }

  // Calculate map bounds with padding
  const getMapBounds = (): [[number, number], [number, number]] | undefined => {
    if (displayedComparison?.bbox) {
      const [minLon, minLat, maxLon, maxLat] = displayedComparison.bbox
      const latPad = (maxLat - minLat) * 0.1
      const lonPad = (maxLon - minLon) * 0.1
      return [
        [minLat - latPad, minLon - lonPad],
        [maxLat + latPad, maxLon + lonPad]
      ]
    }
    return undefined
  }

  const mapBounds = getMapBounds()

  return (
    <Layout darkMode={darkMode}>
      <div style={{
        height: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg,
        overflow: 'hidden'
      }}>
        {/* Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${theme.border}`,
          background: theme.cardBg,
          flexShrink: 0
        }}>
          {/* Left: Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageSquare size={24} color={theme.buttonBg} />
            <div>
              <h1 style={{
                fontSize: 20,
                fontWeight: 500,
                color: theme.textPrimary,
                margin: 0
              }}>AlphaEarth Assistant</h1>
              <p style={{
                fontSize: 12,
                color: theme.textSecondary,
                margin: 0
              }}>Land cover classification companion</p>
            </div>
          </div>

          {/* Right: Quick Prompts */}
          <div style={{ display: 'flex', gap: 8 }}>
            {activePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt.text)}
                disabled={isLoading}
                style={{
                  padding: '8px 14px',
                  background: darkMode ? '#242424' : '#f8f9fa',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 20,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  color: theme.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                  opacity: isLoading ? 0.5 : 1
                }}
                onMouseOver={e => {
                  if (!isLoading) e.currentTarget.style.borderColor = theme.buttonBg
                }}
                onMouseOut={e => e.currentTarget.style.borderColor = theme.border}
              >
                <span>{prompt.icon}</span>
                <span>{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          overflow: 'hidden',
          minHeight: 0
        }}>
          {/* Chat Area */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: theme.cardBg,
            borderRadius: 12,
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
            minWidth: 0
          }}>
            {/* Messages */}
            <div style={{
              flex: 1,
              padding: 16,
              overflowY: 'auto',
              minHeight: 0
            }}>
              {messages.length === 0 ? (
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.textSecondary,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🌍</div>
                  <p style={{ fontSize: 15, marginBottom: 8 }}>
                    Welcome! Try one of the suggestions above, or type your own query.
                  </p>
                  <p style={{ fontSize: 13, opacity: 0.8 }}>
                    Examples: "Compare urban vs forest in Tokyo" or "What embeddings matter most?"
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: 12
                    }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user' ? theme.userBubble : theme.assistantBubble,
                      color: msg.role === 'user' ? '#fff' : theme.textPrimary,
                      fontSize: 13,
                      lineHeight: 1.5
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '16px 16px 16px 4px',
                    background: theme.assistantBubble,
                    color: theme.textSecondary,
                    fontSize: 13
                  }}>
                    <span className="thinking-pulse">Thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: 12,
              borderTop: `1px solid ${theme.border}`,
              display: 'flex',
              gap: 10,
              flexShrink: 0
            }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Ask a question or describe a classification..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 20,
                  background: theme.inputBg,
                  color: theme.textPrimary,
                  fontSize: 13,
                  outline: 'none'
                }}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '10px 20px',
                  background: isLoading || !input.trim() ? theme.border : theme.buttonBg,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 20,
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </div>

          {/* Right Panel */}
          <div style={{
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            {/* Map */}
            <div style={{
              background: theme.cardBg,
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              padding: 12,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: 13,
                fontWeight: 500,
                color: theme.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0
              }}>
                🗺️ Region of Interest
              </h3>

              <div style={{
                flex: 1,
                borderRadius: 8,
                overflow: 'hidden',
                background: darkMode ? '#242424' : '#e8e8e8',
                minHeight: 150
              }}>
                {typeof window !== 'undefined' && (
                  <MapContainer
                    key={displayedComparison?.bbox?.join(',') || 'default'}
                    center={mapBounds 
                      ? [(mapBounds[0][0] + mapBounds[1][0]) / 2, (mapBounds[0][1] + mapBounds[1][1]) / 2] 
                      : [39.8283, -98.5795]
                    }
                    zoom={mapBounds ? undefined : 3}
                    bounds={mapBounds}
                    style={{ width: '100%', height: '100%' }}
                    scrollWheelZoom={true}
                    dragging={true}
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; Esri'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    {displayedComparison?.bbox && (
                      <Rectangle
                        bounds={[
                          [displayedComparison.bbox[1], displayedComparison.bbox[0]],
                          [displayedComparison.bbox[3], displayedComparison.bbox[2]]
                        ]}
                        pathOptions={{
                          color: '#3b82f6',
                          weight: 3,
                          fillColor: '#3b82f6',
                          fillOpacity: 0.15
                        }}
                      />
                    )}
                  </MapContainer>
                )}
              </div>

              {!displayedComparison?.bbox && (
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: 11,
                  color: theme.textSecondary,
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  Region will appear after you confirm a classification
                </p>
              )}
            </div>

            {/* Parameters */}
            {analysisParams && (
              <div style={{
                background: theme.cardBg,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                padding: 12,
                flexShrink: 0
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  color: theme.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Settings size={14} />
                  Notebook Parameters
                </h3>

                <div style={{ fontSize: 11, color: theme.textSecondary }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px 12px'
                  }}>
                    <div><strong>Class A:</strong> {displayedComparison?.class1}</div>
                    <div><strong>Code:</strong> {analysisParams.classACode}</div>
                    <div><strong>Class B:</strong> {displayedComparison?.class2}</div>
                    <div><strong>Code:</strong> {analysisParams.classBCode}</div>
                  </div>
                  
                  <div style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: `1px solid ${theme.border}`,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '3px 12px',
                    fontSize: 10
                  }}>
                    <div>Algorithm: {analysisParams.algorithm.toUpperCase()}</div>
                    <div>Test: {analysisParams.testSize}%</div>
                    <div>Samples: {analysisParams.samplesPerClass}</div>
                    <div>Scale: {analysisParams.scale}m</div>
                  </div>
                </div>
              </div>
            )}

            {/* Notebook Link */}
            {notebookLink && (
              <a
                href={notebookLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: theme.accentGreen,
                  color: '#fff',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: 12,
                  flexShrink: 0
                }}
              >
                <ExternalLink size={14} />
                Open Jupyter Notebook
              </a>
            )}

            {/* Tips */}
            <div style={{
              background: darkMode ? '#1a2332' : '#e8f4fd',
              borderRadius: 10,
              padding: 10,
              fontSize: 10,
              color: theme.textSecondary,
              flexShrink: 0
            }}>
              <strong style={{ color: theme.textPrimary, fontSize: 11 }}>💡 Tips</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 14, lineHeight: 1.5 }}>
                <li>Be specific: "Portland, Oregon" not just "Portland"</li>
                <li>Customize: "Use XGBoost with 200 samples"</li>
                <li>Ask anything about AlphaEarth embeddings</li>
              </ul>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          .thinking-pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    </Layout>
  )
}