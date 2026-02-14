import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/protected-route";
import { ApiKeysPage } from "@/pages/api-keys";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/api-keys"
        element={
          <ProtectedRoute>
            <ApiKeysPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
