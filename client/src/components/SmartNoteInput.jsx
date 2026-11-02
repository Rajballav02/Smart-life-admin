import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api.js';
import RecordCard from './RecordCard.jsx';

const STAGES = [
  'Understanding your note...',
  'Finding important details...',
  'Organizing your information...',
];

const EXAMPLES = [
  'Pay electricity bill ₹1200 on 18 September.',
  'Friday 5 PM project meeting.',
  'Bike insurance expires on 20 October.',
  'Spent ₹500 on shopping today.',
];

const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'EN' },
  { code: 'hi-IN', label: 'HI' },
];

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function SmartNoteInput({ onCreated }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { records }
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [voiceError, setVoiceError] = useState('');
  const timers = useRef([]);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef(''); // text already in the box before this listening session started

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => () => {
    // Stop any active recognition session when the component unmounts.
    recognitionRef.current?.stop();
  }, []);

  const startListening = () => {
    if (!SpeechRecognitionAPI) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    setVoiceError('');

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    baseTextRef.current = text ? `${text.trim()} ` : '';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += `${transcript} `;
        else interimTranscript += transcript;
      }
      if (finalTranscript) baseTextRef.current += finalTranscript;
      setText((baseTextRef.current + interimTranscript).trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError('Microphone access was blocked. Please allow microphone permission.');
      } else if (event.error !== 'no-speech') {
        setVoiceError("Couldn't hear that clearly. Please try again.");
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    if (isListening) stopListening();
    setError('');
    setResult(null);
    setStageIndex(0);

    timers.current.push(setTimeout(() => setStageIndex(1), 650));
    timers.current.push(setTimeout(() => setStageIndex(2), 1300));

    try {
      const [{ data }] = await Promise.all([
        api.post('/notes', { text }),
        new Promise((resolve) => { timers.current.push(setTimeout(resolve, 1900)); }),
      ]);
      setResult(data);
      setText('');
      onCreated?.(data.records);
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't organize that note. Try writing a little more detail.");
    } finally {
      setStageIndex(-1);
      clearTimers();
    }
  };

  const isProcessing = stageIndex >= 0;

  return (
    <div>
      <div className={`smart-note-shell ${focused ? 'is-focused' : ''}`}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-stars text-personal" />
            <span className="fw-semibold small text-muted">SMART NOTE</span>
          </div>
          {SpeechRecognitionAPI && (
            <div className="btn-group btn-group-sm">
              {VOICE_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`btn ${voiceLang === l.code ? 'btn-primary' : 'btn-light'}`}
                  style={{ padding: '0.15rem 0.55rem', fontSize: '0.72rem' }}
                  disabled={isListening || isProcessing}
                  onClick={() => setVoiceLang(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="position-relative">
          <textarea
            className="smart-note-textarea"
            placeholder={isListening ? 'Listening... speak naturally.' : 'What do you need to remember?'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            rows={3}
            disabled={isProcessing}
            style={{ paddingRight: '3rem' }}
          />
          <button
            type="button"
            className={`btn btn-icon position-absolute ${isListening ? 'mic-listening' : 'btn-light'}`}
            style={{ right: 0, bottom: 2 }}
            onClick={toggleListening}
            disabled={isProcessing}
            title={isListening ? 'Stop listening' : 'Speak your note'}
          >
            <i className={`bi ${isListening ? 'bi-mic-fill' : 'bi-mic'}`} />
          </button>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-2 flex-wrap gap-2">
          <div className="d-flex flex-wrap gap-2">
            {!text && EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="btn btn-sm btn-light"
                onClick={() => setText(ex)}
                style={{ fontSize: '0.78rem' }}
              >
                {ex}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isProcessing || !text.trim()}>
            {isProcessing ? (
              <span className="d-flex align-items-center gap-2">
                <span className="dot-spinner" /><span className="dot-spinner" /><span className="dot-spinner" />
              </span>
            ) : (
              <>Organize it <i className="bi bi-arrow-right ms-1" /></>
            )}
          </button>
        </div>

        {isListening && (
          <div className="mt-2 d-flex align-items-center gap-2 small text-danger">
            <span className="mic-pulse-dot" /> Listening — tap the mic again to stop.
          </div>
        )}

        {isProcessing && (
          <div className="mt-3">
            <span className="processing-pill">{STAGES[stageIndex]}</span>
          </div>
        )}

        {voiceError && (
          <div className="alert alert-warning mt-3 mb-0 py-2 small">{voiceError}</div>
        )}

        {error && (
          <div className="alert alert-danger mt-3 mb-0 py-2 small">{error}</div>
        )}
      </div>

      {result && (
        <div className="mt-3 page-fade">
          <div className="d-flex align-items-center gap-2 mb-2 text-finance fw-semibold small">
            <i className="bi bi-check-circle-fill" />
            {result.records.length} item{result.records.length > 1 ? 's' : ''} organized successfully.
          </div>
          <div className="d-flex flex-column gap-2">
            {result.records.map((r, i) => (
              <div key={r._id} style={{ animationDelay: `${i * 90}ms` }}>
                <RecordCard record={r} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
