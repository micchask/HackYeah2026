// Sam układ ekranu (plan §2). Stan: src/app/, widoki: src/views/.
// Po #86 ten plik edytuje tylko autor zmian układu - funkcje trafiają do plików w views/.
import { AppProvider } from '../app/AppState'
import { MapArea } from '../views/MapArea'
import { Panel } from '../views/Panel'
import { SettingsDrawer } from '../views/SettingsDrawer'
import { StartScreen } from '../views/StartScreen'

export function HomePage() {
  return (
    <AppProvider>
      <div className="layout">
        <Panel />
        <MapArea />
      </div>
      <SettingsDrawer />
      <StartScreen />
    </AppProvider>
  )
}
