import { Hero } from "@/components/Hero";
import { Milestones } from "@/components/Milestones";
import { ProductCarousel } from "@/components/ProductCarousel";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductCarousel />
      <Milestones />
    </>
  );
}
