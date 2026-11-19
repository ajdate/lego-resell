/**
 * Image sources in order of preference. BrickLink goes offline at times and
 * lacks images for some vintage sets, so fall back to Brickset, then Rebrickable.
 */
export function getSetImageUrls(setNumber: string): string[] {
  const id = `${setNumber}-1`;
  return [
    `https://img.bricklink.com/ItemImage/SN/0/${id}.png`,
    `https://images.brickset.com/sets/images/${id}.jpg`,
    `https://cdn.rebrickable.com/media/sets/${id}.jpg`,
  ];
}

export function getSetImageUrl(setNumber: string): string {
  return getSetImageUrls(setNumber)[0];
}

export function getSetImageFallback(): string {
  return "/lego-placeholder.svg";
}

/** Img props with BrickLink src and placeholder fallback */
export function getImageProps(setNumber: string, setName?: string) {
  return {
    src: getSetImageUrl(setNumber),
    onError: (e: { currentTarget: HTMLImageElement }) => {
      const img = e.currentTarget;
      const urls = getSetImageUrls(setNumber);
      const next = urls[urls.indexOf(img.src) + 1];
      img.src = next ?? getSetImageFallback();
    },
    alt: setName ? `LEGO ${setName}` : `LEGO Set ${setNumber}`,
    loading: "lazy" as const,
  };
}
