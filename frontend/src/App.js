import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProjectProvider } from "./context/ProjectContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "./components/ui/sonner";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SiteValidationPage from "./pages/SiteValidationPage";
import DesignCostingPage from "./pages/DesignCostingPage";
import AiFormulationPage from "./pages/AiFormulationPage";
import ProjectSummaryPage from "./pages/ProjectSummaryPage";
import LocalSourcingPage from "./pages/LocalSourcingPage";

console.log("[App.js Diagnostics]", {
  AuthProvider: typeof AuthProvider,
  ProjectProvider: typeof ProjectProvider,
  BrowserRouter: typeof BrowserRouter,
  Routes: typeof Routes,
  Route: typeof Route,
  Navigate: typeof Navigate,
  LoginPage: typeof LoginPage,
  ProtectedRoute: typeof ProtectedRoute,
  DashboardPage: typeof DashboardPage,
  SiteValidationPage: typeof SiteValidationPage,
  DesignCostingPage: typeof DesignCostingPage,
  AiFormulationPage: typeof AiFormulationPage,
  ProjectSummaryPage: typeof ProjectSummaryPage,
  LocalSourcingPage: typeof LocalSourcingPage,
  Toaster: typeof Toaster,
});

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/sourcing" element={<ProtectedRoute><LocalSourcingPage /></ProtectedRoute>} />
              <Route path="/project/:id/site" element={<ProtectedRoute><SiteValidationPage /></ProtectedRoute>} />
              <Route path="/project/:id/design" element={<ProtectedRoute><DesignCostingPage /></ProtectedRoute>} />
              <Route path="/project/:id/formulation" element={<ProtectedRoute><AiFormulationPage /></ProtectedRoute>} />
              <Route path="/project/:id/summary" element={<ProtectedRoute><ProjectSummaryPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" theme="dark" />
        </ProjectProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
