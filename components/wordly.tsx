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

async function fetchWordFromDatamuse(length: WordLength): Promise<string> {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)]
  const pattern = `${randomLetter}${'?'.repeat(length - 1)}`
  const url = `https://api.datamuse.com/words?sp=${pattern}&sort=frequency&max=30`

  const response = await fetch(url)
  const words = await response.json()

  if (words.length === 0) {
    throw new Error('No words found')
  }

  const randomIndex = Math.floor(Math.random() * words.length)
  return words[randomIndex].word.toUpperCase()
}

async function generateTargetWord(length: WordLength): Promise<string> {
  try {
    return await fetchWordFromDatamuse(length)
  } catch (error) {
    console.error('Error fetching word:', error)
    // Fallback to a default word list if API fails
    const fallbackWords = {
      4: ['WORD', 'PLAY', 'GAME'],
      5: ['HELLO', 'WORLD', 'REACT'],
      6: ['WORDLE', 'CODING', 'TYPING']
    }
    return fallbackWords[length][Math.floor(Math.random() * fallbackWords[length].length)]
  }
}

export default function WordleClone() {
  const [wordLength, setWordLength] = useState<WordLength>(5)
  const maxAttempts = 6
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [nextWordTime, setNextWordTime] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [isUnlimitedMode, setIsUnlimitedMode] = useState(false)
  const [cooldownTime, setCooldownTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastResetDate, setLastResetDate] = useState<string | null>(null)

  const [gameStates, setGameStates] = useState<{ [key in WordLength]: GameState | null }>({
    4: null,
    5: null,
    6: null
  })

  async function initializeGameState(length: WordLength): Promise<GameState> {
    const targetWord = await generateTargetWord(length)
    return {
      currentAttempt: 0,
      currentGuess: "",
      guesses: Array(maxAttempts).fill(""),
      targetWord,
      gameStatus: 'playing',
      letterStatuses: {}
    }
  }

  const resetAllGameStates = useCallback(async () => {
    const newStates = {
      4: await initializeGameState(4),
      5: await initializeGameState(5),
      6: await initializeGameState(6)
    }
    setGameStates(newStates)
    setLastResetDate(new Date().toDateString())
  }, [])

  useEffect(() => {
    const initializeStates = async () => {
      setIsLoading(true)
      const savedState = localStorage.getItem('wordleState')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        setGameStates(parsedState.gameStates)
        setWordLength(parsedState.wordLength)
        setIsUnlimitedMode(parsedState.isUnlimitedMode)
        setIsDarkMode(parsedState.isDarkMode)
        setLastResetDate(parsedState.lastResetDate)
      } else {
        await resetAllGameStates()
      }
      setIsLoading(false)
    }

    initializeStates()
  }, [resetAllGameStates])

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('wordleState', JSON.stringify({
        gameStates,
        wordLength,
        isUnlimitedMode,
        isDarkMode,
        lastResetDate
      }))
    }
  }, [gameStates, wordLength, isUnlimitedMode, isDarkMode, isLoading, lastResetDate])

  const currentGameState = gameStates[wordLength]

  const validateGuess = useCallback((guess: string) => {
    if (!currentGameState) return Array(wordLength).fill('absent')
    const result = Array(wordLength).fill('absent')
    const targetLetters = currentGameState.targetWord.split('')
    
    // First pass: mark correct letters
    for (let i = 0; i < wordLength; i++) {
      if (guess[i] === targetLetters[i]) {
        result[i] = 'correct'
        targetLetters[i] = null
      }
    }
    
    // Second pass: mark present letters
    for (let i = 0; i < wordLength; i++) {
      if (result[i] !== 'correct' && targetLetters.includes(guess[i])) {
        result[i] = 'present'
        targetLetters[targetLetters.indexOf(guess[i])] = null
      }
    }
    
    return result
  }, [currentGameState, wordLength])

  const startNewGame = useCallback(async () => {
    if (!isUnlimitedMode || cooldownTime > 0) return
    await resetAllGameStates()
    setCooldownTime(30)
    const timer = setInterval(() => {
      setCooldownTime((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          return 0
        }
        return prevTime - 1
      })
    }, 1000)
  }, [isUnlimitedMode, cooldownTime, resetAllGameStates])

  const handleGameOver = useCallback(() => {
    if (isUnlimitedMode) {
      setCooldownTime(30)
      const timer = setInterval(() => {
        setCooldownTime((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer)
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    }
  }, [isUnlimitedMode])

  const handleKeyPress = useCallback((key: string) => {
    if (!currentGameState || currentGameState.gameStatus !== 'playing') return

    setGameStates(prevStates => {
      const newState = { ...prevStates[wordLength] }
      if (!newState) return prevStates

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
  }, [currentGameState, validateGuess, wordLength, handleGameOver])

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
      tomorrow.setHours(0, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setNextWordTime({ hours, minutes, seconds })

      // Reset game state at midnight for Limited Mode
      if (!isUnlimitedMode && lastResetDate !== now.toDateString()) {
        resetAllGameStates()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [isUnlimitedMode, lastResetDate, resetAllGameStates])

  const getLetterStyle = (letter: string, index: number, rowIndex: number) => {
    if (!currentGameState || rowIndex >= currentGameState.currentAttempt && currentGameState.gameStatus === 'playing') return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
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

  const handleModeChange = async (newMode: boolean) => {
    setIsUnlimitedMode(newMode)
    if (newMode) {
      // Switching to Unlimited Mode
      await startNewGame() // Start a new game immediately when switching to Unlimited Mode
    } else {
      // Switching to Limited Mode
      await resetAllGameStates()
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={resetAllGameStates}>
      <div className={`flex flex-col min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <div className="flex-1 bg-white dark:bg-gray-900 transition-colors duration-200">
          <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(true)}>
              <HelpCircle className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              <span className="sr-only">Help</span>
            </Button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">WORDLY IN ENGLISH</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6 text-gray-500" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                <span className="sr-only">Menu</span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 flex flex-col items-center justify-between p-4 max-w-lg mx-auto">
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
            
            <Card className="w-full p-4 bg-white dark:bg-gray-800 shadow-md">
              {currentGameState && [...Array(maxAttempts)].map((_, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-2 mb-2">
                  {[...Array(wordLength)].map((_, colIndex) => (
                    <div
                      key={colIndex}
                      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-2 flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold
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
            
            {currentGameState && currentGameState.gameStatus === 'won' && <div className="text-green-500 font-bold mt-4">Congratulations! You guessed the word!</div>}
            {currentGameState && currentGameState.gameStatus === 'lost' && <div className="text-red-500 font-bold mt-4">Game over. The word was {currentGameState.targetWord}.</div>}
            
            {currentGameState && (currentGameState.gameStatus === 'won' || currentGameState.gameStatus === 'lost') && (
              <div className="mt-4">
                {isUnlimitedMode ? (
                  cooldownTime > 0 ? (
                    <p className="text-gray-700 dark:text-gray-300">Next game available in: {cooldownTime} seconds</p>
                  ) : (
                    <Button onClick={startNewGame}>New Game</Button>
                  )
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">Next game available in: {formatTime(nextWordTime)}</p>
                )}
              </div>
            )}
            
            <div className="w-full mt-8 px-1 sm:px-2 md:px-4">
              {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM←'].map((row, index) => (
                <div key={index} className="flex justify-center gap-1 mb-2">
                  {row.split('').map((letter) => (
                    <Button
                      key={letter}
                      variant="outline"
                      className={`${letter === '←' ? 'w-12 sm:w-14 md:w-16' : 'w-6 sm:w-8 md:w-10'} h-8 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base p-0 ${
                        currentGameState && currentGameState.letterStatuses[letter] === 'correct' ? 'bg-green-500 text-white' :
                        currentGameState && currentGameState.letterStatuses[letter] === 'present' ? 'bg-yellow-500 text-white' :
                        currentGameState && currentGameState.letterStatuses[letter] === 'absent' ? 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300' :
                        'dark:bg-gray-700 dark:text-white'
                      }`}
                      onClick={() => handleKeyPress(letter)}
                    >
                      {letter}
                    </Button>
                  ))}
                  {index === 2 && (
                    <Button
                      className="w-12 sm:w-14 md:w-16 h-8 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base p-0 dark:bg-gray-700 dark:text-white"
                      onClick={() => handleKeyPress("ENTER")}
                    >
                      ENTER
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="unlimited-mode"
                checked={isUnlimitedMode}
                onCheckedChange={handleModeChange}
              />
              <Label htmlFor="unlimited-mode" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
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
                <p className="mb-4">Hit the ENTER button or ENTER on the keyboard to check your answer.</p>
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
                  Unlimited Mode: Wait 30 seconds between games!
                </p>
                <p className="mb-4">
                  Limited Mode: Wait until the next daily word.
                </p>
                <a href="https://x.com/buttonwang" target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:text-blue-600">
                  <Twitter className="mr-2" /> Follow us on X
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