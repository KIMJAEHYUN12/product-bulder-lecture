"use client";

import { useCapacitor } from "@/hooks/useCapacitor";

export default function NativeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useCapacitor();
  return <>{children}</>;
}
