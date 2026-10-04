// Układ ekranu: pełnoekranowa mapa, nad nią pasek wyszukiwania, panel boczny i kontrolki.
// Stan: src/app/, widoki: src/views/.
import { AppProvider } from '../app/AppState'
import { MapArea } from '../views/MapArea'
import { SettingsDrawer } from '../views/SettingsDrawer'
import { Sidebar } from '../views/Sidebar'
import { StartScreen } from '../views/StartScreen'
import { TopSearchBar } from '../views/TopSearchBar'

export function HomePage() {
  return (
    <AppProvider>
      <div className="shell">
        {/* kolejność w DOM = kolejność Tab: wyszukiwarka, panel, mapa */}
        <TopSearchBar />
        <Sidebar />
        <MapArea />
      </div>
      <SettingsDrawer />
      <StartScreen />
    </AppProvider>
  )
}
