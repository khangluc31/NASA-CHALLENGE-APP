// Hai cụm của Audio Lab để nhúng vào trang sách: trái = phần 1-3, phải = phần 4-5 + nhật ký.
// Không bọc <main>/<h1> như AudioLabPage; mỗi cụm tự cuộn riêng trong trang của nó.
import { useEffect } from 'react'
import { engine } from '../../../audio'
import { DataSource } from './components/DataSource'
import { Transport } from './components/Transport'
import { FeatureGrid } from './components/FeatureGrid'
import { Swatches } from './components/Swatches'
import { ImageProbe } from './components/ImageProbe'
import { LogPanel } from './components/LogPanel'
import { bindEngineToStore } from './store'

/**
 * Trang trái của chương Audio Lab: nguồn dữ liệu, điều khiển phát, lưới.
 * Cụm này cũng nối engine vào store (playhead/frame) và dừng phát khi rời chương,
 * vì ở chương Audio Lab không có DataSonification lo việc đó.
 */
export function AudioLabLeft() {
  useEffect(() => {
    const unbind = bindEngineToStore()
    return () => {
      unbind()
      engine.stop()
    }
  }, [])

  return (
    <div className="audio-lab audio-lab-panel text-lab-fg">
      <DataSource />
      <Transport />
      <FeatureGrid />
    </div>
  )
}

/** Trang phải của chương Audio Lab: bảng màu, thử ảnh, nhật ký. */
export function AudioLabRight() {
  return (
    <div className="audio-lab audio-lab-panel text-lab-fg">
      <Swatches />
      <ImageProbe />
      <LogPanel />
    </div>
  )
}
