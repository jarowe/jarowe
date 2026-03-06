import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighScore, playGameSound } from './shared';
import confetti from 'canvas-confetti';

const BASE_TYPES = ['Attack', 'Magic', 'Defense'];
const TYPE_EMOJI = { Attack: '⚔️', Magic: '🔮', Defense: '🛡️' };
const TYPE_COLORS = { Attack: '#ef4444', Magic: '#a855f7', Defense: '#3b82f6' };

// Attack > Magic > Defense > Attack
function getWinner(a, b) {
  if (a === b) return 'tie';
  if ((a === 'Attack' && b === 'Magic') || (a === 'Magic' && b === 'Defense') || (a === 'Defense' && b === 'Attack')) return 'player';
  return 'opponent';
}

const CARD_NAMES = {
  food:      { Attack: ['Hot Sauce Slash', 'Fork Strike', 'Pepper Punch', 'Knife Edge'], Magic: ['Spice Charm', 'Sugar Rush', 'Sizzle Spell', 'Umami Wave'], Defense: ['Iron Skillet', 'Bread Shield', 'Cheese Wall', 'Dough Guard'] },
  space:     { Attack: ['Laser Blast', 'Meteor Strike', 'Nova Burst', 'Ion Cannon'], Magic: ['Warp Field', 'Dark Matter', 'Star Charm', 'Nebula Pulse'], Defense: ['Plasma Shield', 'Gravity Well', 'Hull Armor', 'Force Bubble'] },
  tech:      { Attack: ['Overclock', 'Byte Strike', 'DDoS Wave', 'Virus Inject'], Magic: ['AI Predict', 'Quantum Link', 'Neural Hack', 'Debug Hex'], Defense: ['Firewall', 'Encryption', 'Backup Drive', 'Antivirus'] },
  nature:    { Attack: ['Thorn Whip', 'Storm Gust', 'Rock Slide', 'Vine Lash'], Magic: ['Pollen Cloud', 'Bloom Burst', 'Moonlight', 'Root Charm'], Defense: ['Bark Armor', 'Leaf Shield', 'Stone Wall', 'Moss Cover'] },
  music:     { Attack: ['Bass Drop', 'Power Chord', 'Sonic Boom', 'Beat Rush'], Magic: ['Melody Hex', 'Rhythm Jinx', 'Harmony Orb', 'Echo Charm'], Defense: ['Sound Barrier', 'Mute Shield', 'Tempo Block', 'Rest Note'] },
  family:    { Attack: ['Group Hug', 'Pillow Fight', 'Tickle Rush', 'Dance Off'], Magic: ['Love Spell', 'Joy Charm', 'Unity Bond', 'Warm Glow'], Defense: ['Family Shield', 'Heart Guard', 'Trust Wall', 'Safe Haven'] },
  scifi:     { Attack: ['Plasma Bolt', 'Phase Strike', 'Mech Punch', 'Rail Gun'], Magic: ['Mind Warp', 'Clone Trick', 'Teleport', 'Time Bend'], Defense: ['Force Field', 'Stealth Mode', 'Nano Shield', 'Phase Wall'] },
  humor:     { Attack: ['Pie Throw', 'Banana Slip', 'Joke Slam', 'Prank Bomb'], Magic: ['Laugh Spell', 'Silly Curse', 'Meme Magic', 'Gag Hex'], Defense: ['Comedy Shield', 'Clown Car', 'Joke Dodge', 'Pun Block'] },
  adventure: { Attack: ['Sword Slash', 'Arrow Rain', 'Battle Cry', 'Spear Throw'], Magic: ['Map Reveal', 'Compass Hex', 'Gold Charm', 'Quest Bolt'], Defense: ['Iron Shield', 'Dodge Roll', 'Camp Guard', 'Trap Sense'] },
  arts:      { Attack: ['Paint Splash', 'Chisel Strike', 'Ink Blast', 'Stage Crash'], Magic: ['Color Burst', 'Muse Charm', 'Sketch Hex', 'Film Edit'], Defense: ['Canvas Block', 'Frame Guard', 'Clay Wall', 'Curtain Call'] },
  spooky:    { Attack: ['Ghost Strike', 'Bone Throw', 'Web Shot', 'Claw Swipe'], Magic: ['Hex Curse', 'Shadow Cast', 'Spirit Call', 'Moon Spell'], Defense: ['Coffin Guard', 'Fog Screen', 'Grave Wall', 'Ward Ring'] },
  winter:    { Attack: ['Ice Shard', 'Snowball', 'Frost Bite', 'Blizzard'], Magic: ['Freeze Ray', 'Snow Charm', 'Aurora Hex', 'Chill Wave'], Defense: ['Ice Wall', 'Snow Fort', 'Frost Armor', 'Igloo Hide'] },
  default:   { Attack: ['Quick Strike', 'Power Hit', 'Rush Blow', 'Dash Cut'], Magic: ['Spark Bolt', 'Prism Hex', 'Glow Charm', 'Wave Pulse'], Defense: ['Guard Up', 'Block Wall', 'Shield Bash', 'Iron Stance'] },
};

const CARD_EMOJI = {
  food: { Attack: '🔪', Magic: '🌶️', Defense: '🍳' },
  space: { Attack: '💥', Magic: '🌀', Defense: '🛡️' },
  tech: { Attack: '⚡', Magic: '🧬', Defense: '🔒' },
  nature: { Attack: '🌪️', Magic: '🌸', Defense: '🪨' },
  music: { Attack: '🎸', Magic: '🎵', Defense: '🎧' },
  scifi: { Attack: '🔫', Magic: '🌀', Defense: '🛡️' },
  default: { Attack: '⚔️', Magic: '🔮', Defense: '🛡️' },
};

const OPPONENT_POOLS = {
  food:      ['Chef Bot', 'Sous Chef', 'Master Chef'],
  space:     ['Probe Alpha', 'Star Captain', 'Galaxy Lord'],
  tech:      ['Bug v1.0', 'Trojan.exe', 'Mainframe'],
  nature:    ['Wild Boar', 'Storm Eagle', 'Ancient Oak'],
  music:     ['DJ Rookie', 'Beatmaster', 'Maestro'],
  family:    ['Cousin Ed', 'Aunt Martha', 'Grandpa Joe'],
  scifi:     ['Scout Droid', 'Mech Unit', 'Commander'],
  humor:     ['Punster', 'Trickster', 'Comedy King'],
  adventure: ['Goblin Scout', 'Dark Knight', 'Dragon Lord'],
  arts:      ['Art Student', 'Gallery Boss', 'Grand Master'],
  spooky:    ['Skeleton', 'Vampire', 'Lich King'],
  winter:    ['Snowman', 'Frost Giant', 'Ice Queen'],
  default:   ['Challenger', 'Champion', 'Grand Master'],
};

const VARIANTS = {
  jedi: {
    types: ['Force Push', 'Lightsaber', 'Force Shield'],
    typeEmoji: { 'Force Push': '🌀', Lightsaber: '⚔️', 'Force Shield': '🛡️' },
    typeColors: { 'Force Push': '#3b82f6', Lightsaber: '#22c55e', 'Force Shield': '#fbbf24' },
    opponents: ['Stormtrooper', 'Darth Maul', 'Vader'],
    title: 'May the Force...',
    cardNames: {
      'Force Push': ['Mind Trick', 'Force Wave', 'Telekinesis', 'Repulse'],
      Lightsaber: ['Duel Strike', 'Saber Throw', 'Form VII', 'Whirlwind'],
      'Force Shield': ['Absorb', 'Deflect', 'Barrier', 'Fortify'],
    },
    cardEmoji: { 'Force Push': '🌀', Lightsaber: '⚔️', 'Force Shield': '🛡️' },
  },
};

function generateCard(types, cat, cardNames, cardEmoji) {
  const type = types[Math.floor(Math.random() * types.length)];
  const power = Math.floor(Math.random() * 8) + 2;
  const names = cardNames?.[type] || CARD_NAMES[cat]?.[type] || CARD_NAMES.default[type] || ['Card'];
  const name = names[Math.floor(Math.random() * names.length)];
  const emoji = cardEmoji?.[type] || CARD_EMOJI[cat]?.[type] || CARD_EMOJI.default[type] || TYPE_EMOJI[type] || '?';
  return { type, power, name, emoji, id: Math.random().toString(36).slice(2, 8) };
}

function generateHand(count, types, cat, cardNames, cardEmoji) {
  return Array.from({ length: count }, () => generateCard(types, cat, cardNames, cardEmoji));
}

export default function CardBattle({ onComplete, holiday, theme, variant }) {
  const vcfg = variant ? VARIANTS[variant] : null;
  const cat = holiday?.category || 'default';
  const types = vcfg?.types || BASE_TYPES;
  const typeEmoji = vcfg?.typeEmoji || TYPE_EMOJI;
  const typeColors = vcfg?.typeColors || TYPE_COLORS;
  const opponents = vcfg?.opponents || OPPONENT_POOLS[cat] || OPPONENT_POOLS.default;
  const cardNames = vcfg?.cardNames || null;
  const cardEmoji = vcfg?.cardEmoji || null;

  const [hand, setHand] = useState(() => generateHand(5, types, cat, cardNames, cardEmoji));
  const [opponentCard, setOpponentCard] = useState(null);
  const [playerCard, setPlayerCard] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState(null); // 'win' | 'lose' | 'tie'
  const [score, setScore] = useState(0);
  const [opponentIdx, setOpponentIdx] = useState(0);
  const [roundWins, setRoundWins] = useState(0);
  const [roundLosses, setRoundLosses] = useState(0);
  const [roundNum, setRoundNum] = useState(1);
  const [battleNum, setBattleNum] = useState(1);
  const [phase, setPhase] = useState('pick'); // pick, reveal, result, next, done
  const [feedback, setFeedback] = useState(null);
  const { best, submit } = useHighScore('card-battle');
  const scoreRef = useRef(0);

  const opponentName = opponents[Math.min(opponentIdx, opponents.length - 1)];

  // Win function for type triangle (works for custom types too)
  const getTypeWinner = useCallback((a, b) => {
    if (a === b) return 'tie';
    const aIdx = types.indexOf(a);
    const bIdx = types.indexOf(b);
    // aIdx beats (aIdx+1)%3
    if ((aIdx + 1) % 3 === bIdx) return 'player';
    return 'opponent';
  }, [types]);

  const playCard = useCallback((card) => {
    if (phase !== 'pick') return;

    // Generate opponent card
    const oCard = generateCard(types, cat, cardNames, cardEmoji);
    // Slightly bias opponent power by opponent index
    oCard.power = Math.min(10, oCard.power + opponentIdx);

    setPlayerCard(card);
    setOpponentCard(oCard);
    setPhase('reveal');
    playGameSound('tick');

    // Reveal after delay
    setTimeout(() => {
      setRevealed(true);
      const winner = getTypeWinner(card.type, oCard.type);
      let roundResult;

      if (winner === 'tie') {
        // Same type: higher power wins
        if (card.power > oCard.power) roundResult = 'win';
        else if (card.power < oCard.power) roundResult = 'lose';
        else roundResult = 'tie';
      } else {
        roundResult = winner === 'player' ? 'win' : 'lose';
      }

      setResult(roundResult);

      if (roundResult === 'win') {
        const pts = 100;
        setScore(s => { const n = s + pts; scoreRef.current = n; return n; });
        setRoundWins(w => w + 1);
        setFeedback({ text: `+${pts}!`, color: '#22c55e' });
        playGameSound('correct');
      } else if (roundResult === 'lose') {
        setRoundLosses(l => l + 1);
        setFeedback({ text: 'Blocked!', color: '#f43f5e' });
        playGameSound('wrong');
      } else {
        setFeedback({ text: 'Draw!', color: '#fbbf24' });
        playGameSound('pop');
      }

      // Remove played card from hand
      setHand(h => h.filter(c => c.id !== card.id));

      setPhase('result');
    }, 800);
  }, [phase, types, cat, cardNames, cardEmoji, opponentIdx, getTypeWinner]);

  // Handle continuing after result
  const continueGame = useCallback(() => {
    if (phase !== 'result') return;

    const newRound = roundNum + 1;
    const wins = roundWins + (result === 'win' ? 0 : 0); // already updated
    const losses = roundLosses + (result === 'lose' ? 0 : 0);

    // Check if opponent battle is decided (best of 3)
    const actualWins = result === 'win' ? roundWins : roundWins;
    const actualLosses = result === 'lose' ? roundLosses : roundLosses;

    if (actualWins >= 2 || actualLosses >= 2 || newRound > 3) {
      // Opponent battle resolved
      if (actualWins >= 2 && actualLosses === 0) {
        // Sweep bonus
        const bonus = 50;
        setScore(s => { const n = s + bonus; scoreRef.current = n; return n; });
        setFeedback({ text: `SWEEP! +50 bonus!`, color: '#fbbf24' });
        playGameSound('win');
      }

      if (opponentIdx + 1 >= opponents.length) {
        // All opponents defeated (or lost)
        setPhase('done');
        if (scoreRef.current > 0) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: [theme.primary, theme.secondary, '#fbbf24'] });
        }
        submit(scoreRef.current);
        setTimeout(() => onComplete(scoreRef.current), 1200);
        return;
      }

      // Next opponent
      setOpponentIdx(i => i + 1);
      setBattleNum(b => b + 1);
      setRoundNum(1);
      setRoundWins(0);
      setRoundLosses(0);
      setHand(generateHand(5, types, cat, cardNames, cardEmoji));
    } else {
      setRoundNum(newRound);
      // Refill a card if hand is low
      if (hand.length <= 2) {
        setHand(h => [...h, generateCard(types, cat, cardNames, cardEmoji)]);
      }
    }

    setPlayerCard(null);
    setOpponentCard(null);
    setRevealed(false);
    setResult(null);
    setFeedback(null);
    setPhase('pick');
  }, [phase, roundNum, roundWins, roundLosses, result, opponentIdx, opponents, hand, types, cat, cardNames, cardEmoji, theme, submit, onComplete]);

  // Type advantage label
  const getTypeLabel = (type) => {
    const idx = types.indexOf(type);
    const beats = types[(idx + 1) % 3];
    return `beats ${beats}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          vs {opponentName} ({battleNum}/{opponents.length})
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
          Rd {Math.min(roundNum, 3)}/3
        </span>
        <span style={{ color: theme.primary, fontWeight: 600 }}>{score} pts</span>
      </div>

      {/* Round score indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
        <span style={{ color: '#22c55e' }}>W: {roundWins}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
        <span style={{ color: '#f43f5e' }}>L: {roundLosses}</span>
      </div>

      {/* Battle field */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        minHeight: '8rem',
        padding: '0.75rem',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Player card */}
        <AnimatePresence mode="wait">
          {playerCard && (
            <motion.div
              key={'player-' + playerCard.id}
              initial={{ x: -50, opacity: 0, rotateY: 0 }}
              animate={{ x: 0, opacity: 1, rotateY: 0 }}
              style={{
                width: '5rem',
                padding: '0.5rem',
                background: `linear-gradient(135deg, ${typeColors[playerCard.type] || theme.primary}22, ${typeColors[playerCard.type] || theme.primary}44)`,
                border: `1px solid ${typeColors[playerCard.type] || theme.primary}66`,
                borderRadius: '0.6rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{playerCard.emoji}</div>
              <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, marginTop: '0.2rem' }}>{playerCard.name}</div>
              <div style={{ fontSize: '0.55rem', color: typeColors[playerCard.type] || theme.primary, marginTop: '0.15rem' }}>{playerCard.type}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.15rem' }}>{playerCard.power}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VS indicator */}
        {playerCard && (
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>VS</div>
        )}

        {/* Opponent card */}
        <AnimatePresence mode="wait">
          {opponentCard && (
            <motion.div
              key={'opp-' + opponentCard.id}
              initial={{ rotateY: 180, opacity: 1 }}
              animate={{ rotateY: revealed ? 0 : 180, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              style={{
                width: '5rem',
                padding: '0.5rem',
                background: revealed
                  ? `linear-gradient(135deg, ${typeColors[opponentCard.type] || '#666'}22, ${typeColors[opponentCard.type] || '#666'}44)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                border: `1px solid ${revealed ? (typeColors[opponentCard.type] || '#666') + '66' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '0.6rem',
                textAlign: 'center',
                transformStyle: 'preserve-3d',
              }}
            >
              {revealed ? (
                <>
                  <div style={{ fontSize: '1.5rem' }}>{opponentCard.emoji}</div>
                  <div style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600, marginTop: '0.2rem' }}>{opponentCard.name}</div>
                  <div style={{ fontSize: '0.55rem', color: typeColors[opponentCard.type] || '#aaa', marginTop: '0.15rem' }}>{opponentCard.type}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '0.15rem' }}>{opponentCard.power}</div>
                </>
              ) : (
                <div style={{ height: '4.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>?</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!playerCard && !opponentCard && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
            Pick a card to play!
          </div>
        )}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              color: feedback.color,
            }}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
      {phase === 'result' && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={continueGame}
          style={{
            padding: '0.5rem 1.5rem',
            background: `linear-gradient(135deg, ${theme.primary}44, ${theme.secondary}44)`,
            border: `1px solid ${theme.primary}66`,
            borderRadius: '0.5rem',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            margin: '0 auto',
          }}
        >
          Continue
        </motion.button>
      )}

      {/* Hand */}
      {phase === 'pick' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {types[0]} &gt; {types[1]} &gt; {types[2]} &gt; {types[0]}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(hand.length, 5)}, 1fr)`,
            gap: '0.3rem',
          }}>
            <AnimatePresence>
              {hand.map((card) => (
                <motion.button
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => playCard(card)}
                  style={{
                    padding: '0.4rem 0.25rem',
                    background: `linear-gradient(135deg, ${typeColors[card.type] || theme.primary}11, ${typeColors[card.type] || theme.primary}22)`,
                    border: `1px solid ${typeColors[card.type] || theme.primary}44`,
                    borderRadius: '0.5rem',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.1rem',
                    fontSize: '0.6rem',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{card.emoji}</span>
                  <span style={{ fontWeight: 600, lineHeight: 1.1 }}>{card.name}</span>
                  <span style={{ color: typeColors[card.type] || theme.primary, fontSize: '0.5rem' }}>
                    {card.type}
                  </span>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#fff',
                    background: `${typeColors[card.type] || theme.primary}33`,
                    borderRadius: '0.3rem',
                    padding: '0 0.3rem',
                    marginTop: '0.1rem',
                  }}>
                    {card.power}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: theme.secondary, fontWeight: 600 }}>
          Battle Complete! Final: {score} pts
        </p>
      )}

      {best > 0 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Best: {best}</p>
      )}
    </div>
  );
}
