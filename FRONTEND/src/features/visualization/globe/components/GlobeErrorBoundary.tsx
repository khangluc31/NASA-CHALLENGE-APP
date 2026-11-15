import { Component } from 'react'
import type { ReactNode } from 'react'

export class GlobeErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (this.state.failed) {
      return <div role="alert">
        <p>The globe could not be displayed. WebGL may be unavailable.</p>
        <button type="button" className="viewer-retry" onClick={this.props.onRetry}>Retry globe</button>
      </div>
    }
    return this.props.children
  }
}
