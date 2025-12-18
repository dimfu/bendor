import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { StoreProvider } from "./providers/store/storeProvider.tsx"
import { GlobalStyles } from "./styles/global.ts"
import { ThemeProvider } from "styled-components"
import { theme } from "./styles/theme.ts"

createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <GlobalStyles />
    <StoreProvider>
      <App />
    </StoreProvider>
  </ThemeProvider>
)
