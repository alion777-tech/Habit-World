import TestFeatureGate from "@/app/components/TestFeatureGate";
import FairyBirthPreview from "@/app/components/FairyBirthPreview";
export default function Page() {
  return <TestFeatureGate><FairyBirthPreview /></TestFeatureGate>;
}
