'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { HelpCircle, Menu, Sun, Moon, Twitter, Infinity } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { ErrorBoundary } from "react-error-boundary"

// Mock word lists (replace with actual word lists in a real application)
const wordLists = {
  4: ['FINE', 'WORD', 'PLAY', 'GAME'],
  5: ['HELLO', 'WORLD', 'REACT', 'GUESS'],
  6: ['WORDLE', 'CODING', 'TYPING', 'LETTER']
}

type WordLength = 4 | 5 | 6

interface GameState {
  currentAttempt: number
  currentGuess: string
  guesses: string[]
  targetWord: string
  gameStatus: 'playing' | 'won' | 'lost'
  letterStatuses: { [key: string]: 'correct' | 'present' | 'absent' | 'unused' }
}

function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert" className="text-center p-4">
      <p>Something went wrong:</p>
      <pre className="text-red-500">{error.message}</pre>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  )
}

export function WordleClone() {
  const [wordLength, setWordLength] = useState<WordLength>(5)
  const maxAttempts = 6
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [nextWordTime, setNextWordTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [isUnlimitedMode, setIsUnlimitedMode] = useState(false)
  const [canStartNewGame, setCanStartNewGame] = useState(true)

  const [gameStates, setGameStates] = useState<{ [key in WordLength]: GameState }>({
    4: initializeGameState(4),
    5: initializeGameState(5),
    6: initializeGameState(6)
  })

  function initializeGameState(length: WordLength): GameState {
    return {
      currentAttempt: 0,
      currentGuess: "",
      guesses: Array(maxAttempts).fill(""),
      targetWord: generateTargetWord(length),
      gameStatus: 'playing',
      letterStatuses: {}
    }
  }

  function generateTargetWord(length: WordLength): string {
    const words = wordLists[length]
    return words[Math.floor(Math.random() * words.length)]
  }

  const currentGameState = gameStates[wordLength]

  const validateGuess = useCallback((guess: string) => {
    const result = Array(wordLength).fill('absent')
    const targetLetters = currentGameState.targetWord.split('')
    
    // First pass: mark correct letters
    for (let i = 0; i < wordLength; i++) {
      if (guess[i] === targetLetters[i]) {
        result[i] = 'correct'
        targetLetters[i] = ''
      }
    }
    
    // Second pass: mark present letters
    for (let i = 0; i < wordLength; i++) {
      if (result[i] !== 'correct' && targetLetters.includes(guess[i])) {
        result[i] = 'present'
        targetLetters[targetLetters.indexOf(guess[i])] = ''
      }
    }
    
    return result
  }, [currentGameState.targetWord, wordLength])

  const startNewGame = useCallback(() => {
    if (!canStartNewGame) return
    setGameStates(prevStates => ({
      ...prevStates,
      [wordLength]: initializeGameState(wordLength)
    }))
    setCanStartNewGame(false)
  }, [wordLength, canStartNewGame])

  const handleGameOver = useCallback(() => {
    if (isUnlimitedMode) {
      setTimeout(() => {
        startNewGame()
        setCanStartNewGame(true)
      }, 2000)
    } else {
      setTimeout(() => setCanStartNewGame(true), 5 * 60 * 1000) // 5 minutes cooldown
    }
  }, [isUnlimitedMode, startNewGame])

  const handleKeyPress = useCallback((key: string) => {
    if (currentGameState.gameStatus !== 'playing') return

    setGameStates(prevStates => {
      const newState = { ...prevStates[wordLength] }

      if (key === "Backspace" || key === "←") {
        newState.currentGuess = newState.currentGuess.slice(0, -1)
      } else if (key === "Enter" || key === "ENTER") {
        if (newState.currentGuess.length === wordLength) {
          const newGuesses = [...newState.guesses]
          newGuesses[newState.currentAttempt] = newState.currentGuess

          const validation = validateGuess(newState.currentGuess)
          const newLetterStatuses = { ...newState.letterStatuses }
          newState.currentGuess.split('').forEach((letter, index) => {
            const status = validation[index]
            if (status === 'correct' || (status === 'present' && newLetterStatuses[letter] !== 'correct') || !newLetterStatuses[letter]) {
              newLetterStatuses[letter] = status
            }
          })

          if (newState.currentGuess === newState.targetWord) {
            newState.gameStatus = 'won'
            handleGameOver()
          } else if (newState.currentAttempt === maxAttempts - 1) {
            newState.gameStatus = 'lost'
            handleGameOver()
          } else {
            newState.currentAttempt += 1
          }
          newState.currentGuess = ""
          newState.guesses = newGuesses
          newState.letterStatuses = newLetterStatuses
        }
      } else if (/^[A-Za-z]$/.test(key) && newState.currentGuess.length < wordLength) {
        newState.currentGuess += key.toUpperCase()
      }

      return { ...prevStates, [wordLength]: newState }
    })
  }, [currentGameState.gameStatus, validateGuess, wordLength, handleGameOver])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleKeyPress(event.key)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyPress])

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const diff = tomorrow.getTime() - now.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setNextWordTime({ hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getLetterStyle = (letter: string, index: number, rowIndex: number) => {
    if (rowIndex >= currentGameState.currentAttempt && currentGameState.gameStatus === 'playing') return 'bg-white dark:bg-gray-800'
    const validation = validateGuess(currentGameState.guesses[rowIndex])
    switch (validation[index]) {
      case 'correct': return 'bg-green-500 text-white'
      case 'present': return 'bg-yellow-500 text-white'
      default: return 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
    }
  }

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev)
    document.documentElement.classList.toggle('dark')
  }

  const formatTime = (time: { hours: number, minutes: number, seconds: number }) => {
    return `${time.hours > 0 ? `${time.hours}h ` : ''}${time.minutes}m ${time.seconds}s`
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {
      // Reset the game state when the error boundary is reset
      setGameStates({
        4: initializeGameState(4),
        5: initializeGameState(5),
        6: initializeGameState(6)
      })
    }}>
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="flex-1 bg-background dark:bg-gray-900 transition-colors duration-200">
          <header className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(true)}>
              <HelpCircle className="h-6 w-6 dark:text-gray-300" />
              <span className="sr-only">Help</span>
            </Button>
            <h1 className="text-xl font-bold dark:text-white">WORDLE IN ENGLISH</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6 text-gray-500" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 dark:text-gray-300" />
                <span className="sr-only">Menu</span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 flex flex-col items-center justify-between p-4">
            <div className="flex gap-2 mb-8">
              {[4, 5, 6].map((num) => (
                <Button
                  key={num}
                  onClick={() => setWordLength(num as WordLength)}
                  variant={num === wordLength ? "default" : "outline"}
                  className={`w-8 h-8 p-0 rounded-full ${
                    num === wordLength ? 'bg-green-500 text-white hover:bg-green-600' : ''
                  }`}
                >
                  {num}
                </Button>
              ))}
            </div>
            
            <Card className="w-full max-w-sm p-4 bg-white dark:bg-gray-800">
              {[...Array(maxAttempts)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-2 mb-2">
                  {[...Array(wordLength)].map((_, colIndex) => (
                    <div
                      key={colIndex}
                      className={`w-12 h-12 border-2 flex items-center justify-center text-2xl font-bold
                        ${rowIndex === currentGameState.currentAttempt && currentGameState.gameStatus === 'playing' ? 'border-gray-500 dark:border-gray-400' : 'border-gray-300 dark:border-gray-600'}
                        ${getLetterStyle(currentGameState.guesses[rowIndex][colIndex], colIndex, rowIndex)}
                      `}
                    >
                      {rowIndex < currentGameState.currentAttempt || (rowIndex === currentGameState.currentAttempt && currentGameState.gameStatus !== 'playing')
                        ? currentGameState.guesses[rowIndex][colIndex]
                        : rowIndex === currentGameState.currentAttempt && colIndex < currentGameState.currentGuess.length
                        ? currentGameState.currentGuess[colIndex]
                        : ''}
                    </div>
                  ))}
                </div>
              ))}
            </Card>
            
            {currentGameState.gameStatus === 'won' && <div className="text-green-500 font-bold mt-4">Congratulations! You guessed the word!</div>}
            {currentGameState.gameStatus === 'lost' && <div className="text-red-500 font-bold mt-4 dark:text-red-400">Game over. The word was {currentGameState.targetWord}.</div>}
            
            {(currentGameState.gameStatus === 'won' || currentGameState.gameStatus === 'lost') && !isUnlimitedMode && (
              <div className="mt-4">
                {canStartNewGame ? (
                  <Button onClick={startNewGame}>New Game</Button>
                ) : (
                  <p>Next game available in: {formatTime(nextWordTime)}</p>
                )}
              </div>
            )}
            
            <div className="w-full max-w-lg mt-8">
              {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, index) => (
                <div key={index} className="flex justify-center gap-1 mb-2">
                  {index === 2 && (
                    <Button className="w-16 h-14 dark:bg-gray-700 dark:text-white" onClick={() => handleKeyPress("ENTER")}>
                      ENTER
                    </Button>
                  )}
                  {row.split('').map((letter) => (
                    <Button
                      key={letter}
                      variant="outline"
                      className={`w-10 h-14 ${
                        currentGameState.letterStatuses[letter] === 'correct' ? 'bg-green-500 text-white' :
                        currentGameState.letterStatuses[letter] === 'present' ? 'bg-yellow-500 text-white' :
                        currentGameState.letterStatuses[letter] === 'absent' ? 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300' :
                        'dark:bg-gray-700 dark:text-white'
                      }`}
                      onClick={() => handleKeyPress(letter)}
                    >
                      {letter}
                    </Button>
                  ))}
                  {index === 2 && (
                    <Button className="w-16 h-14 dark:bg-gray-700 dark:text-white" onClick={() => handleKeyPress("←")}>
                      ←
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="unlimited-mode"
                checked={isUnlimitedMode}
                onCheckedChange={setIsUnlimitedMode}
              />
              <Label htmlFor="unlimited-mode" className="flex items-center space-x-2">
                <Infinity className="h-4 w-4" />
                <span>Unlimited Mode</span>
              </Label>
            </div>
          </main>

          <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How to Play</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                <p className="mb-4">Guess the word in six tries. New word every day! Each try has to be a valid word.</p>
                <p className="mb-4">Hit the CHECK button or ENTER on the keyboard to check your answer.</p>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-500 text-white flex items-center justify-center mr-2">A</div>
                    <span>Right letter, right place</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-yellow-500 text-white flex items-center justify-center mr-2">B</div>
                    <span>Right letter, wrong place</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 text-gray-700 flex items-center justify-center mr-2">C</div>
                    <span>Letter not in the word</span>
                  </div>
                </div>
                <p className="mb-4">Next daily word in: {formatTime(nextWordTime)}</p>
                <p className="mb-4">
                  <Infinity className="inline-block h-4 w-4 mr-2" />
                  Unlimited Mode: Keep playing without waiting for the next word!
                </p>
                <p className="mb-4">
                  Limited Mode: Wait 5 minutes between games or until the next daily word.
                </p>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:text-blue-600">
                  <Twitter className="mr-2" /> Follow us on Twitter
                </a>
              </DialogDescription>
              <DialogFooter>
                <Button onClick={() => setIsHelpOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ErrorBoundary>
  )
}