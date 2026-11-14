import { MotionConfig } from 'motion/react'
import { useRef, useState } from 'react'
import { EarthBackdrop } from './features/book/components/EarthBackdrop'
import { BookExperience } from './features/book/components/BookExperience'
import { PREVIEW_CREDIT } from './features/book/chapters'
import './styles/book.css'

function App() {
  const book = useRef<{ close: () => void }>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  return <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}><div className={`atlas-app ${reduceMotion ? 'reduce-motion' : ''}`}>
    <EarthBackdrop />
    <a href="#main-content" className="skip-link">Skip to atlas</a>
    <header className="site-header flex items-center justify-between gap-4">
      <button className="wordmark" onClick={() => book.current?.close()} aria-label="Earth Jukebox home">EARTH <span>/</span> JUKEBOX</button>
      <div className="header-right flex items-center gap-6"><span>NASA DATA / FIELD ATLAS</span><button className="motion-toggle" aria-pressed={reduceMotion} onClick={() => setReduceMotion(value => !value)}>Reduce motion {reduceMotion ? 'ON' : 'OFF'}</button></div>
    </header>
    <BookExperience ref={book} reduceMotion={reduceMotion} />
    <footer className="site-footer flex flex-wrap items-center justify-between gap-3"><span>NASA SPACE APPS CHALLENGE <span className="footer-dot">/</span> THE EARTH INFORMATION JUKEBOX</span><a href={PREVIEW_CREDIT} target="_blank" rel="noreferrer">Earth imagery: NASA GSFC / SVS / Earth Observatory ↗</a></footer>
  </div></MotionConfig>
}
export default App
