"use client";

import { PackageSearch } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { FoundPost } from "@/src/lib/api/types";

export function ItemImageGallery({ images, title }: { images: FoundPost["images"]; title: string }) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] min-h-64 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground lg:aspect-[5/4]">
        <div className="flex flex-col items-center gap-3">
          <PackageSearch aria-hidden="true" className="size-12" strokeWidth={1.4} />
          <span className="text-sm">No photos for this item</span>
        </div>
      </div>
    );
  }

  return (
    <Carousel opts={{ loop: images.length > 1, align: "start" }} aria-label={`${title} photos`}>
      <CarouselContent className="ml-0">
        {images.map((image, index) => (
          <CarouselItem key={`${image.url}-${index}`} className="pl-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted lg:aspect-[5/4]">
              {/* Signed image URLs are intentionally used only for this transient preview. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={`${title}, photo ${index + 1} of ${images.length}`} className="h-full w-full object-contain" />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs font-medium text-white">
                {index + 1} / {images.length}
              </span>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {images.length > 1 && (
        <>
          <CarouselPrevious aria-label="Previous photo" className="left-3 size-11 bg-background/90" />
          <CarouselNext aria-label="Next photo" className="right-3 size-11 bg-background/90" />
        </>
      )}
    </Carousel>
  );
}
