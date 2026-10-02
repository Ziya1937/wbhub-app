import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Splash } from "./components/Splash";
import { UpdateDialog } from "./components/UpdateDialog";
import { IssuancePage } from "./pages/IssuancePage";
import { InventoryPage } from "./pages/InventoryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AuditsPage } from "./pages/AuditsPage";
import { RepairsPage } from "./pages/RepairsPage";
import { TransfersPage } from "./pages/TransfersPage";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      <UpdateDialog />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<IssuancePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/audits" element={<AuditsPage />} />
          <Route path="/audits/:id" element={<AuditsPage />} />
          <Route path="/repairs" element={<RepairsPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
