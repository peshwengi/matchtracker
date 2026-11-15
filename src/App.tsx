import { useState } from 'react'
import { LoadDetailScreen } from './ui/LoadDetailScreen.tsx'
import { LoadFormScreen } from './ui/LoadFormScreen.tsx'
import { LoadsScreen } from './ui/LoadsScreen.tsx'
import type { Route } from './ui/nav.ts'

function App() {
  const [route, setRoute] = useState<Route>({ screen: 'loads' })
  const navigate = (next: Route) => {
    setRoute(next)
    window.scrollTo(0, 0)
  }

  switch (route.screen) {
    case 'loads':
      return <LoadsScreen navigate={navigate} />
    case 'load':
      return <LoadDetailScreen key={route.id} id={route.id} navigate={navigate} />
    case 'load-form':
      return <LoadFormScreen key={route.id ?? route.fromId ?? 'new'} id={route.id} fromId={route.fromId} navigate={navigate} />
  }
}

export default App
