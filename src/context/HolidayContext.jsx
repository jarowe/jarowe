import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getTodayHoliday, CATEGORIES } from '../data/holidayCalendar';

const HolidayContext = createContext(null);

export function useHoliday() {
  return useContext(HolidayContext);
}

// Backward-compatible alias — all existing useBirthday() imports still work
export function useBirthday() {
  return useContext(HolidayContext);
}

export function HolidayProvider({ children }) {
  const now = new Date();
  const params = new URLSearchParams(window.location.search);
  const debugBirthday = params.get('birthday') === 'true';
  const debugHoliday = params.get('holiday');

  const holiday = useMemo(() => getTodayHoliday(), []);

  // Birthday triggers on: real March 3, ?birthday=true, or ?holiday=03-03
  const isBirthday = debugBirthday || debugHoliday === '03-03' || (now.getMonth() === 2 && now.getDate() === 3);
  const age = now.getFullYear() - 1986;
  const isMilestone = age % 10 === 0;
  const year = now.getFullYear();

  const [hasOpenedPresent, setHasOpenedPresent] = useState(() => {
    return localStorage.getItem(`jarowe_birthday_present_${year}`) === 'true';
  });

  const [birthdayXpAwarded, setBirthdayXpAwarded] = useState(() => {
    return localStorage.getItem(`jarowe_birthday_xp_${year}`) === 'true';
  });

  const openPresent = () => {
    setHasOpenedPresent(true);
    localStorage.setItem(`jarowe_birthday_present_${year}`, 'true');
  };

  const markBirthdayXpAwarded = () => {
    setBirthdayXpAwarded(true);
    localStorage.setItem(`jarowe_birthday_xp_${year}`, 'true');
  };

  // Set global flags for R3F / non-React components
  useEffect(() => {
    window.__birthdayMode = isBirthday;
    window.__holidayMode = {
      tier: holiday.tier,
      category: holiday.category,
      name: holiday.name,
      emoji: holiday.emoji,
      glintMood: holiday.glintMood,
      accentPrimary: holiday.accentPrimary,
      accentSecondary: holiday.accentSecondary,
    };
    return () => {
      window.__birthdayMode = false;
      window.__holidayMode = null;
    };
  }, [isBirthday, holiday]);

  // Set CSS custom properties for holiday accent colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--holiday-accent-primary', holiday.accentPrimary);
    root.style.setProperty('--holiday-accent-secondary', holiday.accentSecondary);
    root.style.setProperty('--holiday-accent-glow', holiday.accentGlow);

    // T2+ override site accent colors (birthday handled by birthday-mode body class)
    if (holiday.tier >= 2 && !isBirthday) {
      root.style.setProperty('--accent-primary', holiday.accentPrimary);
      root.style.setProperty('--accent-secondary', holiday.accentSecondary);
      root.style.setProperty('--accent-glow', holiday.accentGlow);
    }

    return () => {
      root.style.removeProperty('--holiday-accent-primary');
      root.style.removeProperty('--holiday-accent-secondary');
      root.style.removeProperty('--holiday-accent-glow');
      if (holiday.tier >= 2 && !isBirthday) {
        root.style.removeProperty('--accent-primary');
        root.style.removeProperty('--accent-secondary');
        root.style.removeProperty('--accent-glow');
      }
    };
  }, [holiday, isBirthday]);

  const value = useMemo(() => ({
    // Holiday system
    holiday,
    category: holiday.categoryData,
    tier: holiday.tier,
    isHoliday: holiday.tier >= 2,
    isMajorHoliday: holiday.tier >= 3,
    // Birthday (backward-compat)
    isBirthday,
    age,
    isMilestone,
    year,
    hasOpenedPresent,
    openPresent,
    birthdayXpAwarded,
    markBirthdayXpAwarded,
  }), [holiday, isBirthday, age, isMilestone, year, hasOpenedPresent, birthdayXpAwarded]);

  return (
    <HolidayContext.Provider value={value}>
      {children}
    </HolidayContext.Provider>
  );
}
