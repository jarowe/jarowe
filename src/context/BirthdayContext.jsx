import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const BirthdayContext = createContext(null);

export function useBirthday() {
  return useContext(BirthdayContext);
}

export function BirthdayProvider({ children }) {
  const now = new Date();
  const params = new URLSearchParams(window.location.search);
  const debugBirthday = params.get('birthday') === 'true';

  const isBirthday = debugBirthday || (now.getMonth() === 2 && now.getDate() === 3);
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

  // Set global flag for R3F components outside React tree
  useEffect(() => {
    window.__birthdayMode = isBirthday;
    return () => { window.__birthdayMode = false; };
  }, [isBirthday]);

  const value = useMemo(() => ({
    isBirthday,
    age,
    isMilestone,
    year,
    hasOpenedPresent,
    openPresent,
    birthdayXpAwarded,
    markBirthdayXpAwarded
  }), [isBirthday, age, isMilestone, year, hasOpenedPresent, birthdayXpAwarded]);

  return (
    <BirthdayContext.Provider value={value}>
      {children}
    </BirthdayContext.Provider>
  );
}
