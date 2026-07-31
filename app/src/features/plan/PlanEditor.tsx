"use client";

import { Palette } from "./Palette";
import { PlanCanvas } from "./PlanCanvas";
import { Inspector } from "./Inspector";

export function PlanEditor() {
  return (
    <div className="flex h-full">
      <div className="max-lg:hidden">
        <Palette />
      </div>
      <div className="min-w-0 flex-1">
        <PlanCanvas />
      </div>
      <div className="max-md:hidden">
        <Inspector />
      </div>
    </div>
  );
}
