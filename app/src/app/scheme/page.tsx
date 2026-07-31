import { Suspense } from "react";
import { WorkspaceShell } from "@/features/workspace/WorkspaceShell";

export default function SchemePage() {
  return (
    <Suspense>
      <WorkspaceShell />
    </Suspense>
  );
}
