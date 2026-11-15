import { Milestones } from "@/components/Milestones";
import { ProductCarousel } from "@/components/ProductCarousel";
import { site } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">{site.heading}</h1>
      <ProductCarousel />
      <Milestones />
    </>
  );
}
