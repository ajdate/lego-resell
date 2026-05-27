export function getSetImageUrl(setNumber: string): string {
  return `https://img.bricklink.com/ItemImage/SN/0/${setNumber}-1.png`;
}

export function getSetImageFallback(): string {
  return "/lego-placeholder.svg";
}

/** Img props with BrickLink src and placeholder fallback */
export function getImageProps(setNumber: string, setName?: string) {
  return {
    src: getSetImageUrl(setNumber),
    onError: (e: { currentTarget: HTMLImageElement }) => {
      e.currentTarget.src = getSetImageFallback();
    },
    alt: setName ? `LEGO ${setName}` : `LEGO Set ${setNumber}`,
    loading: "lazy" as const,
  };
}
