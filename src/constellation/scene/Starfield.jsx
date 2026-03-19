import { Stars } from '@react-three/drei';
import { getCfg } from '../constellationDefaults';

/**
 * Background twinkling star field.
 * Uses Drei <Stars> positioned well outside the helix radius.
 * Intensity kept low to avoid triggering bloom.
 * Reads config values for live editor tuning.
 */
export default function Starfield({ starCount }) {
  if (!starCount || starCount <= 0) return null;

  return (
    <Stars
      radius={getCfg('starRadius')}
      depth={getCfg('starDepth')}
      count={starCount}
      factor={getCfg('starBrightness')}
      saturation={0}
      fade
      speed={getCfg('starTwinkleSpeed')}
    />
  );
}
