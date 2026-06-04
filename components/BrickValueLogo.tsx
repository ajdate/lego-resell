type BrickValueLogoProps = {
  className?: string;
};

export function BrickValueLogo({ className = "h-7 w-auto" }: BrickValueLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brickvalue-logo.png"
      alt="BrickValue"
      className={className}
    />
  );
}
