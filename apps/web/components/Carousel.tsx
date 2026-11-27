"use client";

import { useRef } from "react";
import { MovieCardData } from "@/components/MovieCard";
import MovieCard from "@/components/MovieCard";

export function Carousel({ title, items, subtitle }: { title: string; items: MovieCardData[]; subtitle?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="section carousel-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="carousel-wrapper">
        <button className="carousel-nav left" onClick={() => scroll("left")} aria-label="Previous">❮</button>
        <div className="row-scroll" ref={scrollRef}>
          {items.map((item, i) => (
            <div key={`${item.type}:${item.id}-${i}`} className="row-item">
              <MovieCard item={item} />
            </div>
          ))}
        </div>
        <button className="carousel-nav right" onClick={() => scroll("right")} aria-label="Next">❯</button>
      </div>
    </section>
  );
}
