import type { Metadata } from "next";
import WorldPrototype from "./world-prototype";
import TestFeatureGate from "@/app/components/TestFeatureGate";

export const metadata: Metadata = {
  title: "ハビットワールド — はじまりの大樹",
  description: "あなたの一歩が、世界の物語になる。ハビットワールドの体験版。",
};

export default function WorldPage() { return <TestFeatureGate><WorldPrototype /></TestFeatureGate>; }
