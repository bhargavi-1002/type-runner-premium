import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { db, collection, addDoc, getDocs, query, orderBy, limit } from './firebase';

const WORDS = [
  'REACT', 'JAVASCRIPT', 'TYPESCRIPT', 'FRONTEND', 'BACKEND', 'DATABASE',
  'ALGORITHM', 'COMPONENT', 'INTERFACE', 'PROMISE', 'ASYNC', 'AWAIT',
  'DEPLOYMENT', 'VERCEL', 'FIREBASE', 'VARIABLE', 'FUNCTION', 'PERFORMANCE'
];

const CHARACTERS = [
  { id: 'fox', emoji: '🦊', name: 'Firefox', color: '#F97316', bg: '#FFF7ED' },
  { id: 'wolf', emoji: '🐺', name: 'Cyber Wolf', color: '#6366F1', bg: '#EEF2FF' },
  { id: 'dragon', emoji: '🐲', name: 'Neon Dragon', color: '#10B981', bg: '#ECFDF5' },
  { id: 'alien', emoji: '👽', name: 'Zeta Reticulan', color: '#8B5CF6', bg: '#F5F3FF' }
];

const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'complete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'combo') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
  } catch(e) {}
};

export default function App() {
  const [gameState, setGameState] = useState('menu'); 
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);
  const [currentWord, setCurrentWord] = useState('');
  const [typedChars, setTypedChars] = useState('');
  const [wrongChar, setWrongChar] = useState(false);
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [wordsCleared, setWordsCleared] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  
  const [globalHighScores, setGlobalHighScores] = useState([]);
  const [comment, setComment] = useState('');
  
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('typeRunnerHighScore');
    if (saved) setHighScore(parseInt(saved, 10));
    fetchGlobalHighScores();
  }, []);

  const fetchGlobalHighScores = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      const scores = [];
      querySnapshot.forEach((doc) => scores.push(doc.data()));
      setGlobalHighScores(scores);
    } catch (error) {
      console.error("Error fetching scores:", error);
    }
  };

  const saveScoreToGlobal = async (finalScore) => {
    if (!db || finalScore === 0) return;
    try {
      await addDoc(collection(db, "highscores"), {
        score: finalScore,
        character: selectedChar.name,
        timestamp: new Date()
      });
      fetchGlobalHighScores();
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setWordsCleared(0);
    setTimeLeft(30);
    setComment('');
    pickNewWord();
    setGameState('playing');
    
    setTimeout(() => focusInput(), 100);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame(0); 
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    clearInterval(timerRef.current);
    setGameState('gameover');
    
    setScore(finalScore => {
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('typeRunnerHighScore', finalScore);
      }
      saveScoreToGlobal(finalScore);
      return finalScore;
    });
  };

  const pickNewWord = () => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setCurrentWord(randomWord);
    setTypedChars('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInput = (e) => {
    if (gameState !== 'playing') return;
    const val = e.target.value;
    const lastChar = val.slice(-1);
    e.target.value = ''; // clear immediately
    
    if (!lastChar) return;

    const expectedChar = currentWord[typedChars.length];
    
    if (lastChar.toLowerCase() === expectedChar.toLowerCase()) {
      const newTyped = typedChars + expectedChar;
      setTypedChars(newTyped);
      setWrongChar(false);
      
      const newScore = score + 10 + combo * 5;
      setScore(newScore);
      
      if (newTyped.length === currentWord.length) {
        setWordsCleared(prev => prev + 1);
        const newCombo = combo + 1;
        setCombo(newCombo);
        
        if (newCombo % 5 === 0) {
          playSound('combo');
          const msgs = ["🔥 ON FIRE!", "⚡ AMAZING!", "🚀 UNSTOPPABLE!", "✨ PERFECT!"];
          setComment(msgs[Math.floor(Math.random() * msgs.length)]);
          setTimeout(() => setComment(''), 1500);
        } else {
          playSound('complete');
        }
        
        setTimeout(() => pickNewWord(), 150);
      }
    } else {
      playSound('wrong');
      setWrongChar(true);
      setCombo(0);
      setComment("Oops!");
      setTimeout(() => setComment(''), 1000);
      setTimeout(() => setWrongChar(false), 300);
    }
  };

  const resetToMenu = () => {
    setGameState('menu');
  };

  return (
    <div className="app-container" onClick={focusInput}>
      <div className="space-bg"></div>
      <div className="animated-grid"></div>
      
      {/* Hidden input for mobile keyboard support */}
      <input 
        ref={inputRef}
        type="text"
        className="hidden-mobile-input"
        onChange={handleInput}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />

      {gameState === 'menu' && (
        <div className="glass-panel" style={{ width: '800px', maxWidth: '95vw', textAlign: 'center' }}>
          <h1><span className="text-gradient">Type Runner</span> <span className="text-gradient-accent">Premium</span></h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1rem' }}>
            Select your avatar and race against time in this luxury typing experience.
          </p>
          
          <div className="char-selection-grid">
            {CHARACTERS.map(char => (
              <div 
                key={char.id}
                className={`char-card ${selectedChar.id === char.id ? 'selected' : ''}`}
                style={{ '--hover-color': char.color, '--bg-color': char.bg }}
                onClick={() => setSelectedChar(char)}
              >
                <div className="char-emoji bounce-hover">{char.emoji}</div>
                <div style={{ fontWeight: 600, color: char.color }}>{char.name}</div>
              </div>
            ))}
          </div>
          
          <button className="premium-btn breathe" onClick={startGame}>Initialize Run ⚡</button>
          
          {globalHighScores.length > 0 && (
            <div className="leaderboard-box">
              <h3 style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>Global Leaderboard</h3>
              {globalHighScores.map((s, i) => (
                <div key={i} className="leaderboard-row">
                  <span>{i + 1}. {s.character}</span>
                  <span style={{ fontWeight: 'bold' }}>{s.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="glass-panel playing-panel" style={{ borderColor: selectedChar.color }}>
          
          <div className="hud-top">
            <div className="hud-avatar">
              <span className="char-emoji bounce-continuous" style={{ fontSize: '2.5rem' }}>{selectedChar.emoji}</span>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>RUNNING AS</div>
                <div style={{ color: selectedChar.color, fontWeight: 700 }}>{selectedChar.name}</div>
              </div>
            </div>
            
            <div className="timer-display">
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: timeLeft <= 5 ? 'var(--accent)' : 'var(--text-main)', animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none' }}>
                00:{timeLeft.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
          
          <div className="play-area">
            {comment && <div className="encouraging-comment">{comment}</div>}
            
            <div className="word-display">
              {currentWord.split('').map((char, index) => {
                let className = 'letter ';
                if (index < typedChars.length) className += 'typed ';
                else if (index === typedChars.length) className += (wrongChar ? 'current wrong ' : 'current ');
                
                return (
                  <span key={index} className={className}>{char}</span>
                );
              })}
            </div>
            <div className="mobile-tap-hint">Tap here to open keyboard</div>
          </div>
          
          <div className="stats-container">
            <div className="stat-box">
              <div className="stat-label">Score</div>
              <div className="stat-value text-gradient">{score}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Combo</div>
              <div className="stat-value" style={{ color: combo >= 5 ? selectedChar.color : 'inherit', textShadow: combo >= 5 ? `0 0 10px ${selectedChar.color}` : 'none' }}>
                {combo}x
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-label">High Score</div>
              <div className="stat-value">{highScore}</div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="glass-panel game-over-panel" style={{ width: '600px', maxWidth: '95vw' }}>
          <div className="char-emoji bounce-continuous" style={{ fontSize: '4rem', marginBottom: '1rem' }}>{selectedChar.emoji}</div>
          <h2>RUN COMPLETE</h2>
          
          <div className="score-huge text-gradient-accent">{score}</div>
          {score >= highScore && score > 0 && <div className="new-highscore">NEW HIGH SCORE!</div>}
          
          <div className="stats-container" style={{ marginBottom: '2rem', justifyContent: 'center' }}>
            <div className="stat-box">
              <div className="stat-label">Words Cleared</div>
              <div className="stat-value">{wordsCleared}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="premium-btn" onClick={resetToMenu} style={{ background: 'var(--panel-border)' }}>
              Return to Base
            </button>
            <button className="premium-btn" onClick={startGame}>
              Run Again ⚡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
