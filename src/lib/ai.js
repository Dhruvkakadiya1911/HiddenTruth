import { GoogleGenerativeAI } from '@google/generative-ai';
import { scenarioSchema, clueSchema, accusationResponseSchema, revealSchema } from './schemas.js';
import { buildScenarioPrompt, buildCluePrompt, buildAccusationPrompt, buildRevealPrompt } from './prompts.js';
import { ROLES } from './constants.js';



const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

// Active Gemini model candidates supporting v1beta generateContent
export const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

// Fallback scenario generator for offline testing or API fallback — Natural, human party-game themes
function generateFallbackScenario(players) {
  const PRESET_THEMES = [
    {
      title: 'The Midnight Penthouse Mystery',
      setting: 'A glamorous 40th-floor rooftop penthouse during a summer thunderstorm.',
      victim: 'Julian Ross, flashy tech investor and party host',
      weapon: 'Heavy brass ice tongs from the cocktail bar',
      motive: 'Julian threatened to leak private photos and ruin a guest’s reputation',
      solutionTemplate: (k) =>
        `${k} cornered Julian by the terrace at 11:38 PM, struck him with the brass ice tongs, hid them in the bar ice bucket, and slipped back inside pretending to grab soda.`,
      killerBio: 'The charming VIP guest who arrived uninvited.',
      detBio: 'The sharp-eyed guest trying to keep everyone calm.',
      witBio: 'The party guest who stayed by the balcony all night.',
      suspBio: 'A close friend who was overheard shouting at Julian earlier.',
      killerSecret: (w) =>
        `YOU ARE THE KILLER. You grabbed the ${w} and shoved Julian into the terrace pool. If asked, claim you were getting a refill in the kitchen. Point suspicion at anyone asking too many questions!`,
      detSecret:
        'YOU ARE THE DETECTIVE. You found wet sneaker prints leading from the pool terrace to the kitchen bar. Ask everyone where they were when the terrace lights flickered!',
      witSecret:
        'YOU ARE THE WITNESS. Right before the lights flickered, you saw someone slipping out through the patio curtains wearing dark clothes. Share this clue when the time is right!',
      suspSecret:
        'YOU ARE A PRIME SUSPECT. Julian lent you $5,000 last month and was threatening to tell your friends tonight. You were arguing near the hallway, but you didn’t kill him. Defend yourself!',
    },
    {
      title: 'The Snowed-In Ski Chalet',
      setting: 'A cozy luxury mountain chalet in Aspen cut off by a sudden midnight blizzard.',
      victim: 'Victor Stone, wealthy lodge owner and retired poker champion',
      weapon: 'Heavy cast-iron fireplace poker',
      motive: 'Victor caught a guest stealing a rare diamond heirloom from his safe',
      solutionTemplate: (k) =>
        `${k} ambushed Victor in the study at 11:35 PM with the iron poker, stashed the stolen ring behind the ski rack, and pretended to be asleep by the fireplace.`,
      killerBio: 'The guest who kept pacing near the fireplace.',
      detBio: 'The observant guest who noticed the study door was unlocked.',
      witBio: 'The night owl who was reading in the loft.',
      suspBio: 'The guest who had mud on their boots from the back shed.',
      killerSecret: (w) =>
        `YOU ARE THE KILLER. You took the ${w} from the hearth and struck Victor in the study. Your alibi: you were heating water in the kitchen. Blame whoever was acting nervous!`,
      detSecret:
        'YOU ARE THE DETECTIVE. You noticed the study safe was wide open and a fresh scrape mark was near the fireplace. Press everyone on who knew the safe code!',
      witSecret:
        'YOU ARE THE WITNESS. At 11:32 PM, you heard a loud thud followed by footsteps rushing toward the ski racks. Watch how people react when the ski racks are mentioned!',
      suspSecret:
        'YOU ARE A PRIME SUSPECT. You were caught snooping around Victor’s desk earlier today looking for a contract. You are innocent, but you look guilty. Prove your alibi!',
    },
    {
      title: 'The Streamer Mansion Scandal',
      setting: 'A lavish Hollywood creator mansion during a live 24-hour party broadcast.',
      victim: 'Chad Vance, superstar gaming creator and channel owner',
      weapon: 'Solid gold esports championship trophy',
      motive: 'Chad took all the channel sponsorship money and fired his crew',
      solutionTemplate: (k) =>
        `${k} struck Chad behind the streaming setup during a 5-minute internet outage, wiped the trophy, and put it back on the prize shelf.`,
      killerBio: 'The top editor who was arguing with Chad on the live chat.',
      detBio: 'The co-host checking timestamp logs on the router.',
      witBio: 'The friend who was snacking in the pantry during the outage.',
      suspBio: 'The former team member who threatened to delete the channel.',
      killerSecret: (w) =>
        `YOU ARE THE KILLER. You pulled the router cable, grabbed the ${w}, and took out Chad. Tell everyone you were resetting your phone in the bathroom. Blame the person who owes Chad money!`,
      detSecret:
        'YOU ARE THE DETECTIVE. The router cable was deliberately cut at 11:41 PM. Someone in this room had access to the master setup. Interrogate the room and catch the liar!',
      witSecret:
        'YOU ARE THE WITNESS. Right when the Wi-Fi dropped, you saw someone sprinting past the hallway holding something heavy in a black towel. Share what you saw!',
      suspSecret:
        'YOU ARE A PRIME SUSPECT. You threw a drink at Chad an hour ago during the livestream. You were cooling off on the roof, but nobody saw you there. Defend your innocence!',
    },
  ];

  // Pick a random fun preset theme
  const theme = PRESET_THEMES[Math.floor(Math.random() * PRESET_THEMES.length)];

  const roles = [ROLES.KILLER, ROLES.DETECTIVE, ROLES.WITNESS];
  while (roles.length < players.length) {
    roles.push(ROLES.SUSPECT);
  }

  // Shuffle roles randomly
  const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

  let killerName = '';

  const playerRoles = players.map((p, idx) => {
    const role = shuffledRoles[idx];
    if (role === ROLES.KILLER) {
      killerName = p.name;
    }

    let secretInfo = '';
    let publicBio = '';

    if (role === ROLES.KILLER) {
      secretInfo = theme.killerSecret(theme.weapon);
      publicBio = theme.killerBio;
    } else if (role === ROLES.DETECTIVE) {
      secretInfo = theme.detSecret;
      publicBio = theme.detBio;
    } else if (role === ROLES.WITNESS) {
      secretInfo = theme.witSecret;
      publicBio = theme.witBio;
    } else {
      secretInfo = theme.suspSecret;
      publicBio = theme.suspBio;
    }

    return {
      playerId: p.id,
      playerName: p.name,
      characterName: `Guest ${p.name}`,
      role,
      publicBio,
      secretInfo,
    };
  });

  return {
    title: theme.title,
    setting: theme.setting,
    victim: theme.victim,
    intro: `Lights cut out for a few moments, and now ${theme.victim} is dead. The doors are locked, nobody is leaving, and the killer is standing among you right now.`,
    killerName,
    weapon: theme.weapon,
    motive: theme.motive,
    solution: theme.solutionTemplate(killerName),
    playerRoles,
  };
}

// Programmatically enforce balanced, strict role distribution:
// Exactly 1 Killer, 1 Detective, 1 Witness, and (N - 3) Prime Suspects.
function enforceRoleDistribution(scenario, players) {
  if (!scenario) scenario = {};
  const rawRoles = Array.isArray(scenario.playerRoles) ? scenario.playerRoles : [];

  const normRole = (r) => {
    const s = String(r || '').toLowerCase().trim();
    if (s.includes('kill')) return ROLES.KILLER;
    if (s.includes('detec')) return ROLES.DETECTIVE;
    if (s.includes('witn')) return ROLES.WITNESS;
    return ROLES.SUSPECT;
  };

  const killerCandidates = rawRoles.filter((r) => normRole(r.role) === ROLES.KILLER);
  const detectiveCandidates = rawRoles.filter((r) => normRole(r.role) === ROLES.DETECTIVE);
  const witnessCandidates = rawRoles.filter((r) => normRole(r.role) === ROLES.WITNESS);
  const suspectCandidates = rawRoles.filter((r) => normRole(r.role) === ROLES.SUSPECT);

  const playerRemaining = [...players];
  const assignments = new Map();

  // 1. Assign Killer (Exactly 1)
  let killerIdx = -1;
  if (scenario.killerName) {
    killerIdx = playerRemaining.findIndex(
      (p) => p.name && p.name.trim().toLowerCase() === scenario.killerName.trim().toLowerCase()
    );
  }
  if (killerIdx === -1 && killerCandidates.length > 0) {
    killerIdx = playerRemaining.findIndex((p) =>
      killerCandidates.some((c) => c.playerName && c.playerName.trim().toLowerCase() === p.name.trim().toLowerCase())
    );
  }
  if (killerIdx === -1) {
    killerIdx = Math.floor(Math.random() * playerRemaining.length);
  }
  const [killerPlayer] = playerRemaining.splice(killerIdx, 1);
  const killerLore = killerCandidates[0] || {};
  assignments.set(killerPlayer.id || killerPlayer.name, {
    playerId: killerPlayer.id,
    playerName: killerPlayer.name,
    characterName: killerLore.characterName || `Guest ${killerPlayer.name}`,
    role: ROLES.KILLER,
    publicBio: killerLore.publicBio || 'The guest who slipped away from the room right before the lights flickered.',
    secretInfo:
      killerLore.secretInfo ||
      `YOU ARE THE KILLER. You committed the crime using the ${scenario.weapon || 'murder weapon'}. Cover your tracks, say you were grabbing a drink in the kitchen, and point fingers at someone else!`,
  });

  // 2. Assign Detective (Exactly 1 if >= 2 players)
  if (playerRemaining.length > 0) {
    let detIdx = -1;
    if (detectiveCandidates.length > 0) {
      detIdx = playerRemaining.findIndex((p) =>
        detectiveCandidates.some((c) => c.playerName && c.playerName.trim().toLowerCase() === p.name.trim().toLowerCase())
      );
    }
    if (detIdx === -1) {
      detIdx = Math.floor(Math.random() * playerRemaining.length);
    }
    const [detPlayer] = playerRemaining.splice(detIdx, 1);
    const detLore = detectiveCandidates[0] || {};
    assignments.set(detPlayer.id || detPlayer.name, {
      playerId: detPlayer.id,
      playerName: detPlayer.name,
      characterName: detLore.characterName || `Detective ${detPlayer.name}`,
      role: ROLES.DETECTIVE,
      publicBio: detLore.publicBio || 'The observant guest who noticed the patio door was unlocked.',
      secretInfo:
        detLore.secretInfo ||
        'YOU ARE THE DETECTIVE. You noticed physical evidence that someone is lying about their alibi. Interrogate everyone, spot the contradiction, and lead the group to the real culprit.',
    });
  }

  // 3. Assign Witness (Exactly 1 if >= 3 players)
  if (playerRemaining.length > 0) {
    let witIdx = -1;
    if (witnessCandidates.length > 0) {
      witIdx = playerRemaining.findIndex((p) =>
        witnessCandidates.some((c) => c.playerName && c.playerName.trim().toLowerCase() === p.name.trim().toLowerCase())
      );
    }
    if (witIdx === -1) {
      witIdx = Math.floor(Math.random() * playerRemaining.length);
    }
    const [witPlayer] = playerRemaining.splice(witIdx, 1);
    const witLore = witnessCandidates[0] || {};
    assignments.set(witPlayer.id || witPlayer.name, {
      playerId: witPlayer.id,
      playerName: witPlayer.name,
      characterName: witLore.characterName || `Witness ${witPlayer.name}`,
      role: ROLES.WITNESS,
      publicBio: witLore.publicBio || 'The party guest who stayed near the hallway and saw people coming and going.',
      secretInfo:
        witLore.secretInfo ||
        'YOU ARE THE WITNESS. Right before it happened, you saw someone slipping out toward the back terrace. Share your clue carefully without making yourself the next target!',
    });
  }

  // 4. Remaining players are ALL Prime Suspects (ROLES.SUSPECT)
  let suspIdx = 0;
  while (playerRemaining.length > 0) {
    const suspPlayer = playerRemaining.shift();
    const suspLore = suspectCandidates[suspIdx] || rawRoles[suspIdx] || {};
    suspIdx++;
    assignments.set(suspPlayer.id || suspPlayer.name, {
      playerId: suspPlayer.id,
      playerName: suspPlayer.name,
      characterName: suspLore.characterName || `Guest ${suspPlayer.name}`,
      role: ROLES.SUSPECT,
      publicBio: suspLore.publicBio || 'A guest present at the party who was seen arguing near the study.',
      secretInfo:
        suspLore.secretInfo ||
        'YOU ARE A PRIME SUSPECT. You are innocent, but you had a heated argument with the victim earlier and look guilty. Defend your innocence and help find the real killer!',
    });
  }

  const finalRoles = players.map((p) => assignments.get(p.id || p.name));
  scenario.playerRoles = finalRoles;
  scenario.killerName = finalRoles.find((r) => r.role === ROLES.KILLER)?.playerName || players[0]?.name || 'The Killer';
  return scenario;
}

// Generate scenario using Google Gemini
export async function generateMysteryScenario(players) {
  if (!apiKey || apiKey === 'your-gemini-api-key-placeholder') {
    console.log('No Gemini API key provided. Using fallback scenario generator.');
    return enforceRoleDistribution(generateFallbackScenario(players), players);
  }

  const candidateModels = CANDIDATE_MODELS;

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const prompt = buildScenarioPrompt(players);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanedJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);

      // Pre-sanitize role casing / naming from LLM output so Zod validation passes smoothly
      if (Array.isArray(parsed?.playerRoles)) {
        parsed.playerRoles = parsed.playerRoles.map((r) => {
          const s = String(r.role || '').toLowerCase();
          let sanitized = ROLES.SUSPECT;
          if (s.includes('kill')) sanitized = ROLES.KILLER;
          else if (s.includes('detec')) sanitized = ROLES.DETECTIVE;
          else if (s.includes('witn')) sanitized = ROLES.WITNESS;
          return { ...r, role: sanitized };
        });
      }

      const validated = scenarioSchema.parse(parsed);
      return enforceRoleDistribution(validated, players);
    } catch (err) {
      console.warn(`Attempt with ${modelName} failed (${err.message}). Trying next...`);
    }
  }

  console.error('All Gemini model candidates failed. Using fallback scenario generator.');
  return enforceRoleDistribution(generateFallbackScenario(players), players);
}

// Generate round clue using Google Gemini
export async function generateRoundClue(scenario, round, existingClues = []) {
  const fallbackClues = {
    2: {
      title: 'Cracked Phone with Unsent Text',
      content: `A phone found under the couch has an unsent text from 11:38 PM: "Meet me by the back terrace right now." It was sent to someone in this room.`,
      narratorComment: `Someone has some serious explaining to do!`,
    },
    3: {
      title: 'Spilled Red Wine on a Sneaker',
      content: `Fresh red wine droplets and a crumpled napkin were found leading from the terrace straight toward the guest lounge.`,
      narratorComment: `Time is ticking down, and someone's alibi is falling apart fast.`,
    },
  };

  const defaultFallback = fallbackClues[round] || {
    title: `Scrape Marks by the Door (#${round})`,
    content: `New scratches on the doorframe show someone forced their way out right after the lights cut.`,
    narratorComment: `The room is getting tense!`,
  };

  if (!apiKey || apiKey === 'your-gemini-api-key-placeholder') {
    return defaultFallback;
  }

  const candidateModels = CANDIDATE_MODELS;

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const prompt = buildCluePrompt(scenario, round, existingClues);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanedJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      return clueSchema.parse(parsed);
    } catch (err) {
      console.warn(`Clue generation with ${modelName} failed (${err.message}).`);
    }
  }

  return defaultFallback;
}

// Generate dramatic reaction to player accusation
export async function generateAccusationReaction(scenario, accuserName, accusedName, reason, round) {
  const defaultFallback = {
    narratorReaction: `Oh, snap! ${accuserName} just called out ${accusedName} in front of everyone! Are they onto something, or are they just deflecting heat? Let's see how ${accusedName} answers!`,
  };

  if (!apiKey || apiKey === 'your-gemini-api-key-placeholder') {
    return defaultFallback;
  }

  const candidateModels = CANDIDATE_MODELS;

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const prompt = buildAccusationPrompt(scenario, accuserName, accusedName, reason, round);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanedJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      return accusationResponseSchema.parse(parsed);
    } catch (err) {
      console.warn(`Accusation reaction with ${modelName} failed (${err.message}). Trying next...`);
    }
  }

  return defaultFallback;
}

// Generate dramatic finale reveal monologue
export async function generateRevealMonologue(scenario, killerName, mostVotedName, groupWon) {
  const defaultFallback = {
    narratorMonologue: groupWon
      ? `The truth is out! ${killerName} was the killer all along. They tried to hide the ${scenario.weapon || 'murder weapon'} and pretend they were innocent, but their shaky alibi gave them away. Justice has been served!`
      : `Total chaos! The group voted against ${mostVotedName || 'an innocent person'}, while ${killerName} watched silently with a grin. The real killer walks away scot-free!`,
    verdictSummary: groupWon
      ? `Victory! The room saw through ${killerName}'s lies and caught the killer!`
      : `The killer got away! ${killerName} fooled the entire room.`,
  };

  if (!apiKey || apiKey === 'your-gemini-api-key-placeholder') {
    return defaultFallback;
  }

  const candidateModels = CANDIDATE_MODELS;

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        },
      });

      const prompt = buildRevealPrompt(scenario, killerName, mostVotedName, groupWon);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const cleanedJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      return revealSchema.parse(parsed);
    } catch (err) {
      console.warn(`Reveal monologue generation with ${modelName} failed (${err.message}). Trying next...`);
    }
  }

  return defaultFallback;
}

// Generate confidential forensic scan for Detective's special ability
export async function generateDetectiveScan(scenario, suspectName, suspectRole, isKiller) {
  const defaultFallback = isKiller
    ? {
        finding: `⚠️ FORENSIC ANOMALY: Microscopic traces consistent with the ${scenario.weapon || 'crime scene'} were identified. ${suspectName}'s stated timeline has a 20-minute gap around the time of the murder!`,
        confidence: 'HIGHLY SUSPICIOUS',
        isSuspicious: true,
      }
    : {
        finding: `✓ FORENSIC SCAN CLEAN: No physical residue of the ${scenario.weapon || 'weapon'} found on ${suspectName}. Their attire and physical demeanor corroborate their presence away from the primary murder scene.`,
        confidence: 'LIKELY INNOCENT',
        isSuspicious: false,
      };

  if (!apiKey || apiKey === 'your-gemini-api-key-placeholder') {
    return defaultFallback;
  }

  const candidateModels = CANDIDATE_MODELS;

  const prompt = `You are the lead forensic examiner in a gritty, high-stakes murder mystery party game.
A detective is conducting a confidential forensic examination on suspect "${suspectName}".

Case Scenario:
- Title: ${scenario.title || 'The Case'}
- Victim: ${scenario.victim || 'Victim'}
- Weapon: ${scenario.weapon || 'Weapon'}
- Setting: ${scenario.setting || 'Setting'}
- Target Suspect is ${isKiller ? 'THE ACTUAL KILLER' : 'AN INNOCENT PERSON'}.

Return JSON:
{
  "finding": "A punchy, atmospheric 1-2 sentence forensic observation. If killer, mention a subtle physical clue linking them to the crime. If innocent, mention a detail that supports their alibi.",
  "confidence": "${isKiller ? 'HIGHLY SUSPICIOUS' : 'CLEARED OF WEAPON TRACES'}",
  "isSuspicious": ${isKiller}
}`;

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.75,
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleanedJson = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanedJson);
      if (parsed.finding) return parsed;
    } catch (err) {
      console.warn(`Detective scan with ${modelName} failed (${err.message}). Trying next...`);
    }
  }

  return defaultFallback;
}


