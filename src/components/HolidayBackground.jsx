import { lazy, Suspense } from 'react';
import { useHoliday } from '../context/HolidayContext';

const SnowBackground = lazy(() => import('./backgrounds/SnowBackground'));
const FogBackground = lazy(() => import('./backgrounds/FogBackground'));
const FireworksBackground = lazy(() => import('./backgrounds/FireworksBackground'));

export default function HolidayBackground() {
  const ctx = useHoliday();
  if (!ctx) return null;

  const { holiday, tier, isBirthday } = ctx;

  // Only T3 holidays with a bgEffect, not birthday
  if (tier < 3 || isBirthday || !holiday.bgEffect || holiday.bgEffect === 'none') return null;

  return (
    <Suspense fallback={null}>
      {holiday.bgEffect === 'snow' && <SnowBackground />}
      {holiday.bgEffect === 'fog' && <FogBackground />}
      {holiday.bgEffect === 'fireworks' && <FireworksBackground />}
    </Suspense>
  );
}
