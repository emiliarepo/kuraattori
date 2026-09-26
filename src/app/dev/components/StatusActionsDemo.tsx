"use client";

import { useState } from "react";

import {
  StatusActions,
  type ExhibitionStatus,
} from "~/app/_components/StatusActions";

export function StatusActionsDemo() {
  const [status, setStatus] = useState<ExhibitionStatus | null>(null);

  return <StatusActions status={status} onChange={setStatus} />;
}
