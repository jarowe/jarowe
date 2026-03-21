// easterEggs.js — Date-locked easter egg detection
// Detects special dates and returns CSS class + Glint dialogue for each event.
// Easter egg CSS classes layer ADDITIVELY on top of --tod-* properties.

import { getMoonPhase } from './astro';

// Site birthday: Feb 28 (v1.0 ship date)
export const SITE_BIRTHDAY = { month: 2, day: 28 };

/**
 * Check for date-locked easter eggs. Returns first match in priority order,
 * or null if no easter egg is active.
 *
 * @param {Date} date - Date to check (defaults to now)
 * @returns {{ event: string, cssClass: string, glintDialogue: { text: string, expression: string }[] } | null}
 */
export function checkEasterEggs(date = new Date()) {
  const month = date.getMonth() + 1; // 1-indexed
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 0=Sun, 5=Fri

  // Priority 1: Full Moon
  if (getMoonPhase(date) === 'full') {
    return {
      event: 'full-moon',
      cssClass: 'easter-egg--full-moon',
      glintDialogue: [
        { text: "Full moon tonight! Everything feels more... luminous.", expression: 'love' },
        { text: "The moon is at peak brightness. Like me, but bigger. And less prismatic.", expression: 'mischief' },
        { text: "Full moon energy! They say creativity peaks under a full moon. I believe it.", expression: 'excited' },
        { text: "Look at that moon glow on the globe! Full moons make everything magical.", expression: 'happy' },
      ],
    };
  }

  // Priority 2: Friday the 13th
  if (dayOfWeek === 5 && day === 13) {
    return {
      event: 'friday13',
      cssClass: 'easter-egg--friday13',
      glintDialogue: [
        { text: "Friday the 13th... *dims lights*. Just kidding. Or am I?", expression: 'mischief' },
        { text: "Spooky vibes today! Don't worry, I'll protect you. I'm made of light.", expression: 'happy' },
        { text: "Friday the 13th! Fun fact: there's nothing unlucky about a sentient prism.", expression: 'thinking' },
        { text: "The site feels different today... darker, moodier. I love it.", expression: 'curious' },
      ],
    };
  }

  // Priority 3: Pi Day (March 14)
  if (month === 3 && day === 14) {
    return {
      event: 'pi-day',
      cssClass: 'easter-egg--pi-day',
      glintDialogue: [
        { text: "Happy Pi Day! 3.14159265... I could go on. And on. And on.", expression: 'excited' },
        { text: "Pi Day! The ratio of a circle's circumference to its diameter. Also: pie. Mmm.", expression: 'happy' },
        { text: "3.14! Math is the language of the universe. And I speak it fluently.", expression: 'thinking' },
      ],
    };
  }

  // Priority 4: Solstices
  // Summer Solstice: June 20-21
  if (month === 6 && (day === 20 || day === 21)) {
    return {
      event: 'solstice-summer',
      cssClass: 'easter-egg--solstice-summer',
      glintDialogue: [
        { text: "Summer Solstice! The longest day of the year. More light = more me!", expression: 'excited' },
        { text: "Peak sunshine today! The world is literally at maximum brightness.", expression: 'happy' },
        { text: "Solstice vibes! Ancient peoples celebrated this day. So do sentient prisms.", expression: 'love' },
      ],
    };
  }

  // Winter Solstice: Dec 21-22
  if (month === 12 && (day === 21 || day === 22)) {
    return {
      event: 'solstice-winter',
      cssClass: 'easter-egg--solstice-winter',
      glintDialogue: [
        { text: "Winter Solstice! The longest night. But from here, the days only get brighter.", expression: 'thinking' },
        { text: "Darkest night of the year... which means the light is about to return. Hopeful!", expression: 'happy' },
        { text: "Solstice! Ancient wisdom says this is a time of transformation. I'm into it.", expression: 'curious' },
      ],
    };
  }

  // Priority 5: Site Birthday (Feb 28)
  if (month === SITE_BIRTHDAY.month && day === SITE_BIRTHDAY.day) {
    return {
      event: 'birthday',
      cssClass: 'easter-egg--birthday',
      glintDialogue: [
        { text: "It's the site's birthday! This whole world launched on this day!", expression: 'excited' },
        { text: "Happy birthday to jarowe.com! Another year of wonder and weirdness.", expression: 'love' },
        { text: "Birthday mode activated! This site has grown so much. I'm emotional. (Can prisms cry?)", expression: 'happy' },
        { text: "One more trip around the sun for this little corner of the internet!", expression: 'excited' },
      ],
    };
  }

  return null;
}
