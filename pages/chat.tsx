import Layout from '@/components/Layout'
import { useState } from 'react'
import { useDarkMode } from '@/lib/useDarkMode'

export default function Chat(){
  const [place, setPlace] = useState('Boston, MA')
  const [usecase, setUsecase] = useState('Tree cover')
  const [resp, setResp] = useState<any>(null)
  const { darkMode } = useDarkMode()
  
  const theme = {
    bg: darkMode ? '#0f0f0f' : '#fafafa',
    cardBg: darkMode ? '#1a1a1a' : '#fff',
    textPrimary: darkMode ? '#e8e8e8' : '#202124',
    textSecondary: darkMode ? '#a8a8a8' : '#5f6368',
    border: darkMode ? '#333' : '#dadce0',
    inputBg: darkMode ? '#2a2a2a' : '#fff',
    inputBorder: darkMode ? '#404040' : '#dadce0',
    buttonBg: darkMode ? '#1967d2' : '#1967d2',
    buttonHover: darkMode ? '#1557b0' : '#1557b0',
    preBg: darkMode ? '#242424' : '#fafafa'
  }
  
  return (
    <Layout darkMode={darkMode}>
      <div style={{ 
        maxWidth: 1600, 
        margin: '0 auto', 
        padding: '40px 24px',
        background: theme.bg,
        minHeight: '100vh',
        transition: 'background 0.3s ease'
      }}>
        <h1 style={{ 
          textAlign: 'center',
          fontSize: 36,
          fontWeight: 300,
          color: theme.textPrimary,
          marginBottom: 8,
          letterSpacing: '-0.5px',
          transition: 'color 0.3s ease'
        }}>Chat Interface</h1>
        <p style={{ 
          textAlign: 'center',
          color: theme.textSecondary,
          fontSize: 15,
          marginBottom: 32,
          transition: 'color 0.3s ease'
        }}>Function-calling flow: parse place + use case → call /api/suggest → update map + ranks</p>
        
        <div style={{ 
          background: theme.cardBg,
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          padding: 24,
          maxWidth: 800,
          margin: '0 auto',
          transition: 'all 0.3s ease'
        }}>
          <div style={{display:'flex', gap:12, marginBottom: 16, flexWrap: 'wrap'}}>
            <input 
              value={place} 
              onChange={e=>setPlace(e.target.value)} 
              placeholder="Location"
              style={{
                flex: 1,
                minWidth: 200,
                padding: '12px 16px',
                background: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 6,
                color: theme.textPrimary,
                fontSize: 14,
                transition: 'all 0.3s ease'
              }}
            />
            <input 
              value={usecase} 
              onChange={e=>setUsecase(e.target.value)} 
              placeholder="Use case"
              style={{
                flex: 1,
                minWidth: 200,
                padding: '12px 16px',
                background: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 6,
                color: theme.textPrimary,
                fontSize: 14,
                transition: 'all 0.3s ease'
              }}
            />
            <button 
              onClick={async ()=>{
                const r = await fetch('/api/suggest?place='+encodeURIComponent(place)+'&usecase='+encodeURIComponent(usecase))
                const j = await r.json()
                setResp(j)
              }}
              style={{
                padding: '12px 24px',
                background: theme.buttonBg,
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.buttonHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme.buttonBg
              }}
            >
              Ask
            </button>
          </div>
          
          {resp && (
            <pre style={{
              background: theme.preBg, 
              padding: 16, 
              border: `1px solid ${theme.border}`, 
              borderRadius: 6,
              color: theme.textPrimary,
              fontSize: 12,
              overflow: 'auto',
              transition: 'all 0.3s ease'
            }}>
              {JSON.stringify(resp, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </Layout>
  )
}