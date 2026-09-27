import { AppEntry } from "@/components/shells/app-entry";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: AppEntry });
