import { BackgroundMusic } from './features/audio/BackgroundMusic'
import { MotionConfig } from 'motion/react'
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { EarthBackdrop } from './features/book/components/EarthBackdrop'
import { BookExperience } from './features/book/components/BookExperience'
import './styles/book.css'
import { useBookVisualization } from './features/visualization/useBookVisualization'

function App() {
  const visualization = useBookVisualization()
  const book = useRef<{ close: () => void }>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  return <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}><div style={{
    '--book-paper-image': `url("${import.meta.env.BASE_URL}media/book-paper.png")`,
    '--book-cover-paper-image': `url("${import.meta.env.BASE_URL}media/book-cover-page.jpg")`,
  } as CSSProperties} className={`atlas-app ${reduceMotion ? 'reduce-motion' : ''}`}>
    <EarthBackdrop />
    <a href="#main-content" className="skip-link">Skip to atlas</a>
    <header className="site-header flex items-center justify-between gap-4">
      <button className="wordmark" onClick={() => book.current?.close()} aria-label="Earth Jukebox home">EARTH <span>/</span> JUKEBOX</button>
      <div className="header-right flex items-center gap-6"><span>NASA DATA / FIELD ATLAS</span><button className="motion-toggle" aria-pressed={reduceMotion} onClick={() => setReduceMotion(value => !value)}>Reduce motion {reduceMotion ? 'ON' : 'OFF'}</button><BackgroundMusic /></div>
    </header>
    <BookExperience ref={book} reduceMotion={reduceMotion} bookProps={visualization} />
  </div></MotionConfig>
}
export default App
