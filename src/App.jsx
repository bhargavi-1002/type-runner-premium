import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { db, collection, addDoc, getDocs, query, orderBy, limit } from './firebase';

const WORDS = [
  // Level 1: Very Easy (3-4 letters)
  'CAT', 'DOG', 'RUN', 'FUN', 'SUN', 'WEB', 'API', 'BUG', 'DEV', 'APP', 'NET', 'BOT',
  'CODE', 'DATA', 'NODE', 'HTML', 'USER', 'FILE', 'LINK', 'TEXT', 'VIEW', 'PLAY', 'GAME',
  
  // Level 2: Easy (5-6 letters)
  'REACT', 'STATE', 'PROPS', 'HOOKS', 'BUILD', 'DEBUG', 'LOGIC', 'FETCH', 'ASYNC', 'AWAIT',
  'SERVER', 'CLIENT', 'OBJECT', 'STRING', 'NUMBER', 'BOOLEAN', 'ARRAY', 'DESIGN', 'SYSTEM',
  
  // Level 3: Medium (7-8 letters)
  'FRONTEND', 'BACKEND', 'DATABASE', 'FUNCTION', 'VARIABLE', 'CONSTANT', 'PROMISE',
  'NETWORK', 'BROWSER', 'STORAGE', 'COMPILER', 'TERMINAL', 'CONSOLE', 'ELEMENT',
  
  // Level 4: Hard (9-10 letters)
  'JAVASCRIPT', 'TYPESCRIPT', 'COMPONENT', 'INTERFACE', 'FRAMEWORK', 'MIDDLEWARE',
  'DEPLOYMENT', 'REPOSITORY', 'PAGINATION', 'NAVIGATION', 'VALIDATION', 'ENCRYPTION',
  
  // Level 5: Extreme (11+ letters)
  'PERFORMANCE', 'ASYNCHRONOUS', 'ARCHITECTURE', 'OPTIMIZATION', 'AUTHENTICATION',
  'AUTHORIZATION', 'DEPENDENCY', 'ENVIRONMENT', 'POLYMORPHISM', 'ENCAPSULATION',
  'MICROSERVICES', 'VIRTUALIZATION', 'SCALABILITY', 'ACCESSIBILITY'
];

const CHARACTERS = [
  { id: 'fox', emoji: '🦊', name: 'Firefox', color: '#F97316', bg: '#FFF7ED' },
  { id: 'wolf', emoji: '🐺', name: 'Cyber Wolf', color: '#6366F1', bg: '#EEF2FF' },
  { id: 'dragon', emoji: '🐲', name: 'Neon Dragon', color: '#10B981', bg: '#ECFDF5' },
  { id: 'alien', emoji: '👽', name: 'Zeta Reticulan', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'lion', emoji: '🦁', name: 'Golden Lion', color: '#FBBF24', bg: '#FFFBEB' },
  { id: 'panda', emoji: '🐼', name: 'Quantum Panda', color: '#14B8A6', bg: '#F0FDFA' },
  { id: 'unicorn', emoji: '🦄', name: 'Astro Unicorn', color: '#F472B6', bg: '#FDF2F8' },
  { id: 'owl', emoji: '🦉', name: 'Night Owl', color: '#60A5FA', bg: '#EFF6FF' }
];

const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'complete') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'combo') {
      // Arpeggio chord for combo!
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => { // C5, E5, G5, C6
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const time = ctx.currentTime + (i * 0.05);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.start(time); osc.stop(time + 0.2);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
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
  const [scorePopups, setScorePopups] = useState([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const [usedWords, setUsedWords] = useState([]);
  
  const currentLevel = Math.floor(wordsCleared / 5) + 1;
  
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
    setUsedWords([]);
    pickNewWord([], 1);
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

  const pickNewWord = (currentUsed = usedWords, level = currentLevel) => {
    // Filter words based on difficulty/level to make it progressively harder
    let availableWords = WORDS.filter(w => !currentUsed.includes(w));
    
    if (level === 1) availableWords = availableWords.filter(w => w.length <= 4);
    else if (level === 2) availableWords = availableWords.filter(w => w.length === 5 || w.length === 6);
    else if (level === 3) availableWords = availableWords.filter(w => w.length === 7 || w.length === 8);
    else if (level === 4) availableWords = availableWords.filter(w => w.length === 9 || w.length === 10);
    else availableWords = availableWords.filter(w => w.length >= 11);

    // Fallback if we run out of words for a specific difficulty
    if (availableWords.length === 0) {
      availableWords = WORDS.filter(w => !currentUsed.includes(w));
    }
    
    // If absolutely all words are used, reset used words
    if (availableWords.length === 0) {
      availableWords = WORDS;
      setUsedWords([]);
    }

    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    setCurrentWord(randomWord);
    setTypedChars('');
    
    // Track the word as used
    if (availableWords !== WORDS) {
      setUsedWords(prev => [...prev, randomWord]);
    } else {
      setUsedWords([randomWord]); // Reset occurred
    }
    
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
        const newCleared = wordsCleared + 1;
        setWordsCleared(newCleared);
        const newCombo = combo + 1;
        setCombo(newCombo);
        
        // Time bonus depending on level (harder levels give less bonus)
        // Level 1: +3s, Level 2: +2s, Level 3: +1s, Level 4+: 0s
        const currentLevelObj = Math.floor(newCleared / 5) + 1;
        const timeBonus = Math.max(0, 4 - currentLevelObj);
        setTimeLeft(prev => prev + timeBonus);
        
        if (newCombo % 5 === 0) {
          playSound('combo');
          const msgs = ["🔥 ON FIRE!", "⚡ AMAZING!", "🚀 LEVEL UP!", "✨ PERFECT!"];
          setComment(msgs[Math.floor(Math.random() * msgs.length)]);
          setIsFlipping(true);
          setTimeout(() => { setComment(''); setIsFlipping(false); }, 1500);
        } else {
          playSound('complete');
        }
        
        // Add floaty popup
        const popId = Date.now();
        setScorePopups(prev => [...prev, { id: popId, text: `+${10 + combo*5}` }]);
        setTimeout(() => setScorePopups(prev => prev.filter(p => p.id !== popId)), 800);

        setTimeout(() => pickNewWord(usedWords, Math.floor(newCleared / 5) + 1), 150);
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
          <h1><span className="text-gradient">Type Runner</span> <span className="text-gradient-accent">Dashboard</span></h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1rem' }}>
            Select your avatar and race against time in this luxury dashboard experience.
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
              <span className={`char-emoji bounce-continuous ${isFlipping ? 'flip-anim' : ''}`} style={{ fontSize: '2.5rem' }}>{selectedChar.emoji}</span>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>LEVEL {currentLevel}</div>
                <div style={{ color: selectedChar.color, fontWeight: 900, fontSize: '1.2rem' }}>
                  {currentLevel >= 5 ? 'GRANDMASTER' : currentLevel === 4 ? 'EXPERT' : currentLevel === 3 ? 'PRO' : currentLevel === 2 ? 'INTERMEDIATE' : 'NOVICE'}
                </div>
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
            {scorePopups.map(p => (
              <div key={p.id} className="score-popup">{p.text}</div>
            ))}
            
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
