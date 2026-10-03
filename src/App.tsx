import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Splash } from "./components/Splash";
import { UpdateDialog } from "./components/UpdateDialog";
import { BaseSelectPage } from "./pages/BaseSelectPage";
import { AggregatePage } from "./pages/AggregatePage";
import { IssuancePage } from "./pages/IssuancePage";
import { InventoryPage } from "./pages/InventoryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AuditsPage } from "./pages/AuditsPage";
import { RepairsPage } from "./pages/RepairsPage";
import { TransfersPage } from "./pages/TransfersPage";
import { clearBase, getRememberedBase, setSessionBase } from "./lib/baseContext";
import { fetchBaseName } from "./lib/queries";

type Screen = "select" | "aggregate" | "app";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<Screen>(() => {
    const remembered = getRememberedBase();
    if (remembered) {
      setSessionBase(remembered);
      return "app";
    }
    return "select";
  });

  useEffect(() => {
    const remembered = getRememberedBase();
    if (!remembered) return;
    fetchBaseName(remembered.id)
      .then((name) => {
        if (name === null) {
          clearBase();
          setScreen("select");
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      {screen === "select" && (
        <BaseSelectPage onSelected={() => setScreen("app")} onAggregate={() => setScreen("aggregate")} />
      )}

      {screen === "aggregate" && <AggregatePage onBack={() => setScreen("select")} />}

      {screen === "app" && (
        <>
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
      )}
    </>
  );
}

export default App;
