import type { Metadata } from "next";
import AvatarStudio from "./wardrobe-studio";
import TestFeatureGate from "@/app/components/TestFeatureGate";

export const metadata: Metadata = { title: "妖精のアトリエ | ハビットワールド" };
export default async function AvatarPage({searchParams}:{searchParams:Promise<{entry?:string}>}) { const {entry}=await searchParams; return <TestFeatureGate><AvatarStudio entry={entry==='shops'?'shops':'closet'} /></TestFeatureGate>; }
