import { Component } from 'react'
import type { ReactNode } from 'react'

export class MapErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div role="alert">
      <p>The map could not be displayed.</p>
      <button type="button" className="viewer-retry" onClick={this.props.onRetry}>Retry map</button>
    </div>
    return this.props.children
  }
}
