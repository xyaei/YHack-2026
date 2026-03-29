import { ForseenProvider } from '@/store/forseen-context'
import { AppShell } from '@/components/layout/AppShell'

export default function App() {
  return (
    <ForseenProvider>
      <AppShell />
    </ForseenProvider>
  )
}
