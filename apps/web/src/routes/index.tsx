import { useSessionContext } from "@/context/session";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user, isLoading } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    navigate({ to: user ? "/chat" : "/login", replace: true });
  }, [isLoading, user, navigate]);

  return null;
}
