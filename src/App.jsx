import { useState, useEffect, useRef, useCallback } from 'react'
import { getVapi, startCall, stopCall, toggleMute, isMuted, VAPI_ASSISTANT_ID } from './vapi.js'
import './App.css'

// ── Status badges ─────────────────────────────────────────────────────────────
const STATUS = {
  idle:       { label: 'ready',      color: 'var(--text-dim)' },
  connecting: { label: 'connecting', color: '#f59e0b' },
  active:     { label: 'live',       color: 'var(--accent)' },
  speaking:   { label: 'speaking',   color: 'var(--accent)' },
  listening:  { label: 'listening',  color: '#818cf8' },
  error:      { label: 'error',      color: 'var(--red)' },
}

// ── Waveform bars ─────────────────────────────────────────────────────────────
function Waveform({ active }) {
  const BARS = 28
  return (
    <div className="waveform" aria-hidden="true">
      {Array.from({ length: BARS }).map((_, i) => (
        <span
          key={i}
          className={`bar ${active ? 'animated' : ''}`}
          style={{ animationDelay: `${(i * 40) % 700}ms` }}
        />
      ))}
    </div>
  )
}

// ── Transcript message ────────────────────────────────────────────────────────
function Message({ role, text, partial }) {
  return (
    <div className={`message ${role} ${partial ? 'partial' : ''}`}>
      <span className="role-tag">{role === 'assistant' ? 'AI' : 'YOU'}</span>
      <p className="msg-text">
        {text}
        {partial && <span className="cursor" />}
      </p>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [callStatus, setCallStatus]       = useState('idle')
  const [muted, setMuted]                 = useState(false)
  const [messages, setMessages]           = useState([])
  const [partialSpeech, setPartialSpeech] = useState(null)   // { role, text }
  const [volumeLevel, setVolumeLevel]     = useState(0)
  const [elapsed, setElapsed]             = useState(0)
  const timerRef  = useRef(null)
  const bottomRef = useRef(null)

  // ── Wire Vapi events ──────────────────────────────────────────────────────
  useEffect(() => {
    const vapi = getVapi()

    const onCallStart = () => {
      setCallStatus('active')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    }

    const onCallEnd = () => {
      setCallStatus('idle')
      setPartialSpeech(null)
      clearInterval(timerRef.current)
    }

    const onSpeechStart = () => setCallStatus('speaking')
    const onSpeechEnd   = () => setCallStatus('listening')

    const onMessage = (msg) => {
      if (msg.type === 'transcript') {
        const role = msg.role   // 'assistant' | 'user'
        if (msg.transcriptType === 'partial') {
          setPartialSpeech({ role, text: msg.transcript })
        } else {
          setPartialSpeech(null)
          setMessages(prev => [...prev, { id: Date.now(), role, text: msg.transcript }])
        }
      }
    }

    const onVolume = (v) => setVolumeLevel(v)
    const onError  = (e) => {
      console.error('Vapi error:', e)
      setCallStatus('error')
      clearInterval(timerRef.current)
    }

    vapi.on('call-start',   onCallStart)
    vapi.on('call-end',     onCallEnd)
    vapi.on('speech-start', onSpeechStart)
    vapi.on('speech-end',   onSpeechEnd)
    vapi.on('message',      onMessage)
    vapi.on('volume-level', onVolume)
    vapi.on('error',        onError)

    return () => {
      vapi.off('call-start',   onCallStart)
      vapi.off('call-end',     onCallEnd)
      vapi.off('speech-start', onSpeechStart)
      vapi.off('speech-end',   onSpeechEnd)
      vapi.off('message',      onMessage)
      vapi.off('volume-level', onVolume)
      vapi.off('error',        onError)
      clearInterval(timerRef.current)
    }
  }, [])

  // ── Auto-scroll transcript ────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partialSpeech])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleCall = useCallback(async () => {
    if (callStatus === 'idle' || callStatus === 'error') {
      setCallStatus('connecting')
      setMessages([])
      setPartialSpeech(null)
      try { await startCall() }
      catch(e) { console.error(e); setCallStatus('error') }
    } else {
      await stopCall()
    }
  }, [callStatus])

  const handleMute = useCallback(() => {
    toggleMute()
    setMuted(isMuted())
  }, [])

  const handleClear = () => {
    setMessages([])
    setPartialSpeech(null)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isActive   = ['active', 'speaking', 'listening', 'connecting'].includes(callStatus)
  const status     = STATUS[callStatus] ?? STATUS.idle
  const mm         = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss         = String(elapsed % 60).padStart(2, '0')
  const allMessages = partialSpeech
    ? [...messages, { id: 'partial', ...partialSpeech, partial: true }]
    : messages

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <span className="logo">VAPI</span>
          <span className="logo-sub">voice ai</span>
        </div>
        <div className="header-right">
          <span className="status-dot" style={{ background: status.color }} />
          <span className="status-label" style={{ color: status.color }}>{status.label}</span>
          {isActive && <span className="timer">{mm}:{ss}</span>}
        </div>
      </header>

      {/* ── Center orb + waveform ── */}
      <section className="stage">
        <div className={`orb-wrap ${isActive ? 'active' : ''} ${callStatus === 'speaking' ? 'speaking' : ''}`}>
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <button
            className={`orb ${callStatus}`}
            onClick={handleToggleCall}
            aria-label={isActive ? 'End call' : 'Start call'}
          >
            {callStatus === 'connecting' ? (
              <span className="spinner" />
            ) : isActive ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="5" height="14" rx="1"/>
                <rect x="14" y="5" width="5" height="14" rx="1"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12V6.5a3.5 3.5 0 0 1 7 0V12a3.5 3.5 0 0 1-3.5 3.5zm0 0"/>
                <path d="M19 11v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8"/>
              </svg>
            )}
          </button>
        </div>

        <Waveform active={callStatus === 'speaking' || callStatus === 'listening'} />

        <p className="stage-hint">
          {callStatus === 'idle'       && 'tap to begin conversation'}
          {callStatus === 'connecting' && 'establishing connection…'}
          {callStatus === 'active'     && 'say something…'}
          {callStatus === 'listening'  && 'listening to you…'}
          {callStatus === 'speaking'   && 'ai is speaking…'}
          {callStatus === 'error'      && 'something went wrong — tap to retry'}
        </p>
      </section>

      {/* ── Transcript ── */}
      <section className="transcript-panel">
        <div className="transcript-header">
          <span className="transcript-title">transcript</span>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={handleClear} aria-label="Clear transcript">
              clear
            </button>
          )}
        </div>

        <div className="transcript-body">
          {allMessages.length === 0 ? (
            <p className="empty-hint">conversation will appear here…</p>
          ) : (
            allMessages.map(m => (
              <Message key={m.id} role={m.role} text={m.text} partial={m.partial} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </section>

      {/* ── Controls ── */}
      {isActive && (
        <footer className="controls">
          <button
            className={`ctrl-btn ${muted ? 'muted' : ''}`}
            onClick={handleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="2" y1="2" x2="22" y2="22"/>
                <path d="M18.89 13.23A7 7 0 0 0 19 12v-1M5 10v2a7 7 0 0 0 11.9 5.08M12 19v3M8 22h8"/>
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12V6.5c0-.97.39-1.84 1.02-2.48"/>
                <path d="M15.5 10.06V6.5a3.5 3.5 0 0 0-5.85-2.58"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12V6.5a3.5 3.5 0 0 1 7 0V12a3.5 3.5 0 0 1-3.5 3.5z"/>
                <path d="M19 11v1a7 7 0 0 1-14 0v-1M12 19v3M8 22h8"/>
              </svg>
            )}
            <span>{muted ? 'unmute' : 'mute'}</span>
          </button>

          <button className="ctrl-btn end" onClick={handleToggleCall} aria-label="End call">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 13.5c-.66.66-1.38 1.25-2.14 1.76l-2.26-2.26A6.3 6.3 0 0 0 13.5 11l1.3-1.3c.39-.39.39-1.02 0-1.41L11.7 5.19A.996.996 0 0 0 11 5c-.26 0-.52.1-.7.29L8.5 7.09A3.99 3.99 0 0 0 7.5 9.5c0 3.98 3.52 7.5 7.5 7.5 .9 0 1.75-.17 2.53-.47l-1.03-3.53z"/>
            </svg>
            <span>end call</span>
          </button>
        </footer>
      )}
    </div>
  )
}
