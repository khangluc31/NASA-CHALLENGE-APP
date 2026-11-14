import { ArrowUpRight, Headphones } from 'lucide-react'
import { EarthArtwork } from './EarthArtwork'

export function BookCover({ onOpen, active = true, chapterCount = 3 }: { onOpen: () => void; active?: boolean; chapterCount?: number }) {
  return <main id={active ? 'main-content' : undefined} className="landing grid items-center gap-12 lg:grid-cols-2">
    <section className="landing-copy">
      <p className="eyebrow">AN INTERACTIVE SCIENTIFIC ATLAS</p>
      <h1>Listen to our<br />changing planet.</h1>
      <p className="landing-description">Explore NASA visualizations and discover<br className="desktop-break" /> how scientific data can become sound.</p>
      <button className="open-link inline-flex items-center gap-3" onClick={onOpen}>Open the atlas <ArrowUpRight size={20} /></button>
      <p className="landing-hint">Click the cover to explore <span>•</span> {chapterCount} chapters</p>
    </section>
    <button className="book-cover" onClick={onOpen} aria-label="Open Earth Jukebox atlas">
      <span className="cover-spine" />
      <span className="cover-edition">EARTH OBSERVATIONS / VOL. 01</span>
      <span className="cover-title">EARTH<br />JUKEBOX</span>
      <EarthArtwork />
      <span className="cover-subtitle">A SCIENTIFIC SOUND ATLAS</span>
      <span className="cover-bottom"><Headphones size={17} /> SEE. LISTEN. DISCOVER. <ArrowUpRight size={18} /></span>
      <span className="cover-lines" />
    </button>
  </main>
}
