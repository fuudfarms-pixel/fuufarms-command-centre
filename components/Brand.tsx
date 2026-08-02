import Image from 'next/image';

/**
 * The real brand lockups from `FUUD Design System (1)/assets/logos/`.
 *
 * There is no drawn substitute here. The brand book is explicit that the logo is
 * never recreated, recoloured or boxed — earlier versions of this app used an
 * invented "FF" tile, which is exactly the kind of thing it forbids.
 *
 * `secondary-main-logo` is the one-line "FuudFarms" lockup, which suits a
 * horizontal bar; the `-for-color` variants are the versions drawn for coloured
 * grounds, so the green nav takes those rather than a filtered white one.
 */
export function Logo({
  onColour = false,
  className,
  height = 40,
}: {
  /** True when sitting on a brand-colour field (the green bar, the auth panel). */
  onColour?: boolean;
  className?: string;
  height?: number;
}) {
  const src = onColour ? '/brand/logo-horizontal-on-colour.png' : '/brand/logo-horizontal.png';

  return (
    <Image
      src={src}
      alt="Fuud Farms Limited"
      className={className}
      height={height}
      width={Math.round(height * 4.2)}
      priority
      style={{ height, width: 'auto' }}
    />
  );
}

/** The stacked primary lockup, for the auth card. */
export function LogoStacked({ className, height = 52 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Fuud Farms Limited"
      className={className}
      height={height}
      width={Math.round(height * 2.1)}
      priority
      style={{ height, width: 'auto' }}
    />
  );
}

/**
 * The oversized thin-line leaf watermark, bled off a page edge. Decorative, so
 * it carries an empty alt and is hidden from assistive technology.
 */
export function LeafWatermark({
  className,
  tone = 'gold',
}: {
  className?: string;
  tone?: 'gold' | 'green';
}) {
  return (
    <Image
      src={tone === 'gold' ? '/brand/leaf-outline-gold.png' : '/brand/leaf-outline-green.png'}
      alt=""
      aria-hidden="true"
      className={className}
      width={620}
      height={620}
      style={{ height: 'auto' }}
    />
  );
}
