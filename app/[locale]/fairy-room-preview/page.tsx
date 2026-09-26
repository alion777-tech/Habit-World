import TestFeatureGate from "@/app/components/TestFeatureGate";
import FairyChamberPreview from "@/app/components/FairyChamberPreview";

export default function Page() {
  return <TestFeatureGate><FairyChamberPreview /></TestFeatureGate>;
}
