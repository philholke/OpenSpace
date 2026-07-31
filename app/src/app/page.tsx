import { Suspense } from "react";
import { WorkspaceShell } from "@/features/workspace/WorkspaceShell";

/**
 * The workspace is the landing page — you arrive inside a real scheme, with
 * the welcome dialog over it explaining what you are looking at.
 */
export default function Home() {
  return (
    <Suspense>
      <WorkspaceShell />
    </Suspense>
  );
}
