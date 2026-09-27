import { useSessionContext } from "@/context/session";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function AppEntry() {
  const { user, isLoading } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate({ to: user ? "/home" : "/login", replace: true });
  }, [isLoading, user, navigate]);

  return null;
}
