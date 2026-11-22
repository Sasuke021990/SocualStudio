import { Suspense } from "react";
import { StudioContent } from "./studio-content";

export const metadata = {
  title: "Social Studio — Classic",
  description: "Classic studio view",
};

export default function ClassicPage() {
  return (
    <Suspense fallback={null}>
      <StudioContent />
    </Suspense>
  );
}
