import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { db, collection, addDoc, getDocs, query, orderBy, limit } from './firebase';

const CHARACTERS = [
  { id: 'fox', emoji: '🦊', name: 'Firefox', color: '#ff8c00', bg: 'rgba(255, 140, 0, 0.2)' },
  { id: 'wolf', emoji: '🐺', name: 'Cyber Wolf', color: '#00ffff', bg: 'rgba(0, 255, 255, 0.2)' },
  { id: 'dragon', emoji: '🐉', name: 'Neon Dragon', color: '#ff007f', bg: 'rgba(255, 0, 127, 0.2)' },
  { id: 'alien', emoji: '👽', name: 'Zeta Reticulan', color: '#8a2be2', bg: 'rgba(138, 43, 226, 0.2)' }
];

const WORDS = [
  'javascript', 'react', 'glassmorphism', 'premium', 'velocity',
  'cyberpunk', 'neon', 'gradient', 'developer', 'aesthetic',
  'interface', 'experience', 'animation', 'particles', 'backend',
  'frontend', 'database', 'deployment', 'vercel', 'supabase', 'firebase'
];

export default function App() {
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameover
  const [selectedChar, setSelectedChar] = useState(CHARACTERS[0]);
  
  const [currentWord, setCurrentWord] = useState('');
  const [typedChars, setTypedChars] = useState('');
  const [wrongChar, setWrongChar] = useState(false);
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [globalHighScores, setGlobalHighScores] = useState([]);
  
  const [combo, setCombo] = useState(0);
  const [wordsCleared, setWordsCleared] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

  useEffect(() => {
    const savedScore = localStorage.getItem('typeRunnerHighScore');
    if (savedScore) setHighScore(parseInt(savedScore, 10));
    
    // Fetch global high scores if Firebase is configured
    fetchGlobalHighScores();
  }, []);

  const fetchGlobalHighScores = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      const scores = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() });
      });
      setGlobalHighScores(scores);
    } catch (error) {
      console.error("Error fetching high scores:", error);
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
      fetchGlobalHighScores(); // Refresh scores after saving
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setWordsCleared(0);
    setTimeLeft(30);
    pickNewWord();
    setGameState('playing');
    
    // Set timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame(0); // prev is 1, so time will be 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // We need to pass score via functional state to ensure we get the latest
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
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e) => {
      if (e.key.length !== 1) return; // Ignore Shift, Ctrl, etc.
      
      const expectedChar = currentWord[typedChars.length];
      
      if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
        // Correct char
        const newTyped = typedChars + expectedChar;
        setTypedChars(newTyped);
        setWrongChar(false);
        setScore(prev => prev + 10 + combo * 5); // Combo multiplier
        
        if (newTyped.length === currentWord.length) {
          // Word complete!
          setWordsCleared(prev => prev + 1);
          setCombo(prev => prev + 1);
          setTimeout(() => pickNewWord(), 150);
        }
      } else {
        // Wrong char
        setWrongChar(true);
        setCombo(0);
        setTimeout(() => setWrongChar(false), 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, currentWord, typedChars, combo]);

  const resetToMenu = () => {
    setGameState('menu');
  };

  return (
    <>
      <div className="space-bg"></div>
      <div className="animated-grid"></div>
      
      {gameState === 'menu' && (
        <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', textAlign: 'center' }}>
          <h1><span className="text-gradient">Type Runner</span> <span className="text-gradient-accent">Premium</span></h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.2rem' }}>
            Select your avatar and race against time in this luxury typing experience.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {CHARACTERS.map(char => (
              <div 
                key={char.id}
                className={`char-card ${selectedChar.id === char.id ? 'selected' : ''}`}
                style={{ '--hover-color': char.color, '--bg-color': char.bg }}
                onClick={() => setSelectedChar(char)}
              >
                <div className="char-emoji">{char.emoji}</div>
                <div style={{ fontWeight: 600, color: char.color }}>{char.name}</div>
              </div>
            ))}
          </div>
          
          <button className="premium-btn breathe" onClick={startGame}>Initialize Run ⚡</button>
          
          {globalHighScores.length > 0 && (
            <div style={{ marginTop: '2rem', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
              <h3 style={{ color: 'var(--secondary)', marginBottom: '1rem' }}>Global Leaderboard</h3>
              {globalHighScores.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 0' }}>
                  <span>{i + 1}. {s.character}</span>
                  <span style={{ fontWeight: 'bold' }}>{s.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {gameState === 'playing' && (
        <div className="glass-panel" style={{ width: '800px', maxWidth: '90vw', borderColor: selectedChar.color }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="char-emoji" style={{ fontSize: '2.5rem' }}>{selectedChar.emoji}</span>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>RUNNING AS</div>
                <div style={{ color: selectedChar.color, fontWeight: 700 }}>{selectedChar.name}</div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: timeLeft <= 5 ? 'var(--accent)' : 'var(--text-main)' }}>
                00:{timeLeft.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
          
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
          
          <div className="stats-container">
            <div className="stat-box" style={{ flex: 1 }}>
              <div className="stat-label">Score</div>
              <div className="stat-value">{score}</div>
            </div>
            <div className="stat-box" style={{ flex: 1 }}>
              <div className="stat-label">Combo</div>
              <div className="stat-value" style={{ color: combo >= 5 ? selectedChar.color : 'inherit' }}>
                {combo}x
              </div>
            </div>
            <div className="stat-box" style={{ flex: 1 }}>
              <div className="stat-label">High Score</div>
              <div className="stat-value">{highScore}</div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="glass-panel game-over-panel" style={{ width: '600px', maxWidth: '90vw' }}>
          <div className="char-emoji" style={{ fontSize: '4rem', marginBottom: '1rem' }}>{selectedChar.emoji}</div>
          <h2>RUN COMPLETE</h2>
          
          <div className="score-huge">{score}</div>
          {score >= highScore && score > 0 && <div style={{ color: 'var(--secondary)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '2px' }}>NEW HIGH SCORE!</div>}
          
          <div className="stats-container" style={{ marginBottom: '3rem', justifyContent: 'center' }}>
            <div className="stat-box">
              <div className="stat-label">Words Cleared</div>
              <div className="stat-value">{wordsCleared}</div>
            </div>
          </div>
          
          <button className="premium-btn" onClick={resetToMenu} style={{ background: 'var(--panel-border)' }}>
            Return to Base
          </button>
          <button className="premium-btn" onClick={startGame} style={{ marginLeft: '1rem' }}>
            Run Again ⚡
          </button>
        </div>
      )}
    </>
  );
}
