import { Navigate } from "react-router-dom";
import { type ReactNode } from "react";

import { getAccessToken } from "@/lib/auth";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
