import Layout from '@/components/Layout'
import { useState, useRef, useEffect } from 'react'
import { useDarkMode } from '@/lib/useDarkMode'
import { Send } from 'lucide-react'
import dynamic from 'next/dynamic'

const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false })

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type PendingComparison = {
  class1: string
  class2: string
  location: string
  bbox?: [number, number, number, number]
} | null

export default function Chat(){
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingComparison, setPendingComparison] = useState<PendingComparison>(null)
  const [lastConfirmedComparison, setLastConfirmedComparison] = useState<PendingComparison>(null)
  const [showMap, setShowMap] = useState(false)
  const [displayedComparison, setDisplayedComparison] = useState<PendingComparison>(null)
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
    buttonHover: darkMode ? '#1557b0' : '#1557b0'
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize displayedComparison from lastConfirmedComparison if it has a bbox
  useEffect(() => {
    if (lastConfirmedComparison?.bbox && !displayedComparison?.bbox) {
      setDisplayedComparison(lastConfirmedComparison)
    }
  }, [lastConfirmedComparison, displayedComparison])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    console.log('Sending to API:', {
      message: input,
      pendingComparison: pendingComparison?.bbox ? null : pendingComparison, // Don't send if it has bbox (already confirmed)
      lastConfirmedComparison: lastConfirmedComparison
    })

    try {
      // Call your API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          pendingComparison: pendingComparison?.bbox ? null : pendingComparison,
          lastConfirmedComparison: lastConfirmedComparison
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

      // Update pending comparison state
      if (data.pendingComparison !== undefined) {
        setPendingComparison(data.pendingComparison)
        // Don't update displayedComparison - keep current map view during confirmation
      }

      // Handle confirmation and show map
      if (data.confirmed && data.bbox) {
        const confirmed = data.pendingComparison
        const withBbox = { ...confirmed, bbox: data.bbox }
        setPendingComparison(withBbox)
        setLastConfirmedComparison(confirmed)
        setDisplayedComparison(withBbox) // Update map NOW
      } else {
        // Clear pending if no new pending in response
        if (!data.pendingComparison) {
          setPendingComparison(null)
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Layout darkMode={darkMode}>
      <div style={{ 
        background: theme.bg,
        minHeight: '100vh',
        transition: 'background 0.3s ease',
        padding: '40px 24px'
      }}>
        <div style={{ 
          maxWidth: 1400, 
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          height: 'calc(100vh - 120px)'
        }}>
          {/* Chat Panel */}
          <div style={{ 
            background: theme.cardBg,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            {/* Header */}
            <div style={{ 
              padding: '20px 24px',
              borderBottom: `1px solid ${theme.border}`,
              background: theme.inputBg
            }}>
              <h1 style={{ 
                margin: 0,
                fontSize: 20,
                fontWeight: 500,
                color: theme.textPrimary
              }}>AlphaEarth Chat</h1>
              <p style={{ 
                margin: '4px 0 0 0',
                color: theme.textSecondary,
                fontSize: 13
              }}>Ask about land cover classifications</p>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              {messages.length === 0 && (
                <div style={{ 
                  textAlign: 'center',
                  color: theme.textSecondary,
                  padding: 40,
                  fontSize: 14
                }}>
                  <p style={{ marginBottom: 16, fontSize: 16, color: theme.textPrimary }}>
                    👋 Hello! I can help you explore land cover data.
                  </p>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                    Try asking: &quot;Show me mangroves vs water in the Florida Keys&quot;
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: 16,
                      background: msg.role === 'user' ? theme.userBubble : theme.assistantBubble,
                      color: msg.role === 'user' ? '#fff' : theme.textPrimary,
                      fontSize: 14,
                      lineHeight: 1.5,
                      wordWrap: 'break-word'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 16,
                    background: theme.assistantBubble,
                    color: theme.textSecondary,
                    fontSize: 14
                  }}>
                    <span style={{ 
                      display: 'inline-block',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}>●</span>
                    <span style={{ 
                      display: 'inline-block',
                      animation: 'pulse 1.5s ease-in-out infinite 0.2s',
                      marginLeft: 4
                    }}>●</span>
                    <span style={{ 
                      display: 'inline-block',
                      animation: 'pulse 1.5s ease-in-out infinite 0.4s',
                      marginLeft: 4
                    }}>●</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ 
              padding: 20,
              borderTop: `1px solid ${theme.border}`,
              background: theme.inputBg
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about land cover classifications..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: theme.cardBg,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 24,
                    color: theme.textPrimary,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.userBubble
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.inputBorder
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  style={{
                    padding: '12px 20px',
                    background: input.trim() && !isLoading ? theme.buttonBg : theme.border,
                    border: 'none',
                    borderRadius: 24,
                    color: '#fff',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (input.trim() && !isLoading) {
                      e.currentTarget.style.background = theme.buttonHover
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (input.trim() && !isLoading) {
                      e.currentTarget.style.background = theme.buttonBg
                    }
                  }}
                >
                  Send <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Map Panel - Always visible */}
          <div style={{ 
            background: theme.cardBg,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            padding: 20,
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {displayedComparison?.bbox ? (
              <>
                <div>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 500,
                    color: theme.textPrimary,
                    marginBottom: 8
                  }}>Classification Preview</h2>
                  <div style={{ 
                    padding: 12,
                    background: theme.inputBg,
                    borderRadius: 6,
                    fontSize: 13,
                    color: theme.textSecondary,
                    border: `1px solid ${theme.border}`
                  }}>
                    <div><strong style={{ color: theme.textPrimary }}>Comparing:</strong> {displayedComparison.class1} vs {displayedComparison.class2}</div>
                    <div style={{ marginTop: 4 }}><strong style={{ color: theme.textPrimary }}>Location:</strong> {displayedComparison.location}</div>
                  </div>
                </div>
                
                <div style={{ flex: 1, minHeight: 400 }}>
                  <div style={{ height: '100%', width: '100%' }}>
                    <LeafletMap 
                      geojson={{
                        type: 'FeatureCollection',
                        features: [{
                          type: 'Feature',
                          properties: { 
                            id: 'query-region',
                            location: displayedComparison.location
                          },
                          geometry: {
                            type: 'Polygon',
                            coordinates: [[
                              [displayedComparison.bbox[0], displayedComparison.bbox[1]],
                              [displayedComparison.bbox[0], displayedComparison.bbox[3]],
                              [displayedComparison.bbox[2], displayedComparison.bbox[3]],
                              [displayedComparison.bbox[2], displayedComparison.bbox[1]],
                              [displayedComparison.bbox[0], displayedComparison.bbox[1]]
                            ]]
                          }
                        }]
                      }}
                      bounds={[
                        [displayedComparison.bbox[1], displayedComparison.bbox[0]],
                        [displayedComparison.bbox[3], displayedComparison.bbox[2]]
                      ]}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, minHeight: 500 }}>
                <h2 style={{ 
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 500,
                  color: theme.textPrimary,
                  marginBottom: 16
                }}>Map Preview</h2>
                {/* Show last displayed map if available, otherwise default world view */}
                <LeafletMap 
                  bounds={displayedComparison?.bbox ? [
                    [displayedComparison.bbox[1], displayedComparison.bbox[0]],
                    [displayedComparison.bbox[3], displayedComparison.bbox[2]]
                  ] : undefined}
                />
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </Layout>
  )
}