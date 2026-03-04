import { lazy, Suspense } from 'react';
import { useHoliday } from '../context/HolidayContext';

const SnowBackground = lazy(() => import('./backgrounds/SnowBackground'));
const FogBackground = lazy(() => import('./backgrounds/FogBackground'));
const FireworksBackground = lazy(() => import('./backgrounds/FireworksBackground'));
const ConfettiBackground = lazy(() => import('./backgrounds/ConfettiBackground'));
const HeartsBackground = lazy(() => import('./backgrounds/HeartsBackground'));
const StarsBackground = lazy(() => import('./backgrounds/StarsBackground'));

export default function HolidayBackground() {
  const ctx = useHoliday();
  if (!ctx) return null;

  const { holiday, tier, isBirthday } = ctx;

  // T2+ holidays with a bgEffect, not birthday
  if (tier < 2 || isBirthday || !holiday.bgEffect || holiday.bgEffect === 'none') return null;

  return (
    <Suspense fallback={null}>
      {holiday.bgEffect === 'snow' && <SnowBackground />}
      {holiday.bgEffect === 'fog' && <FogBackground />}
      {holiday.bgEffect === 'fireworks' && <FireworksBackground />}
      {holiday.bgEffect === 'confetti' && <ConfettiBackground />}
      {holiday.bgEffect === 'hearts' && <HeartsBackground />}
      {holiday.bgEffect === 'stars' && <StarsBackground />}
    </Suspense>
  );
}
