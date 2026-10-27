import { GoogleGenerativeAI } from '@google/generative-ai';
import { scenarioSchema, clueSchema, accusationResponseSchema, revealSchema } from './schemas.js';
import { buildScenarioPrompt, buildCluePrompt, buildAccusationPrompt, buildRevealPrompt } from './prompts.js';
import { ROLES } from './constants.js';



const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

// Active Gemini model candidates supporting v1beta generateContent
// Note: gemini-3.5-flash-lite is proven responsive; gemini-3.5-flash and gemini-3.8-flash provide failover
export const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

export function cleanDuplicateArticles(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b(a|an|the)\s+(a|an|the)\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchNameInText(targetName, text) {
  if (!targetName || !text) return false;
  const escaped = escapeRegExp(targetName.trim());
  return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i').test(text);
}

export function replaceNameInText(text, oldName, newName) {
  if (!text || typeof text !== 'string' || !oldName || !newName) return text;
  const escaped = escapeRegExp(oldName.trim());
  const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'gi');
  return text.replace(regex, `$1${newName}$2`);
}

// Ensure suspect diversity, enforce Round 2 red herring on innocent players, and avoid killer repetition
export function sanitizeClueSuspects(parsed, scenario, round, existingClues = []) {
  if (!parsed || !parsed.content) return parsed;
  const killerName = scenario?.killerName;
  const roles = Array.isArray(scenario?.playerRoles) ? scenario.playerRoles : [];
  const innocentPlayers = roles.filter(
    (r) => r.playerName && r.playerName.trim().toLowerCase() !== (killerName || '').trim().toLowerCase()
  );

  if (!killerName || innocentPlayers.length === 0) return parsed;

  // Check if killer was already mentioned in previous clues
  const wasKillerMentionedPreviously = existingClues.some((c) => {
    const text = typeof c === 'string' ? c : c?.content || '';
    return matchNameInText(killerName, text);
  });

  // In Round 2 (MANDATORY RED HERRING), or if killer was already named in a previous clue:
  // If the clue mentions the killer, replace with an innocent suspect!
  if (round === 2 || wasKillerMentionedPreviously) {
    if (matchNameInText(killerName, parsed.content)) {
      // Pick an innocent player who has not been mentioned yet if possible
      const unmentionedInnocents = innocentPlayers.filter((p) => {
        return !existingClues.some((c) =>
          matchNameInText(p.playerName, typeof c === 'string' ? c : c?.content || '')
        );
      });
      const replacement =
        unmentionedInnocents.length > 0
          ? unmentionedInnocents[Math.floor(Math.random() * unmentionedInnocents.length)]
          : innocentPlayers[Math.floor(Math.random() * innocentPlayers.length)];

      if (replacement && replacement.playerName) {
        parsed.content = replaceNameInText(parsed.content, killerName, replacement.playerName);
        if (parsed.title) {
          parsed.title = replaceNameInText(parsed.title, killerName, replacement.playerName);
        }
        if (parsed.narratorComment) {
          parsed.narratorComment = replaceNameInText(
            parsed.narratorComment,
            killerName,
            replacement.playerName
          );
        }
      }
    }
  }

  return parsed;
}

// Generate dynamic, multi-suspect clues for offline fallback mode
export function generateDynamicFallbackClue(scenario, round, existingClues = []) {
  const killerName = scenario?.killerName || 'The Killer';
  const roles = Array.isArray(scenario?.playerRoles) ? scenario.playerRoles : [];
  const innocentPlayers = roles.filter(
    (r) => r.playerName && r.playerName.trim().toLowerCase() !== killerName.trim().toLowerCase()
  );

  const innocentA = innocentPlayers[0]?.playerName || 'a party guest';
  const innocentB = innocentPlayers[1]?.playerName || innocentPlayers[0]?.playerName || 'another guest';
  const weapon = scenario?.weapon || 'the weapon';
  const victim = scenario?.victim || 'the victim';
  const setting = scenario?.setting || 'the scene';

  if (round === 1) {
    if (scenario?.initialClue?.content) {
      return {
        title: scenario.initialClue.title || 'Crime Scene Evidence',
        content: scenario.initialClue.content,
        narratorComment: `The crime scene is fresh, and everyone here has an alibi to prove.`,
      };
    }
    return {
      title: 'Crime Scene Discovery & Timeline',
      content: `The body of ${victim} was discovered near ${setting}. The discarded weapon found nearby was ${weapon}, and a shattered timepiece frozen at 11:34 PM establishes the exact moment of the attack.`,
      narratorComment: `The clock doesn't lie, but someone in this room certainly will.`,
    };
  }

  if (round === 2) {
    // MANDATORY RED HERRING: Points suspicion at an innocent player! Killer is NOT named!
    return {
      title: 'Torn Note & Conflicting Alibi',
      content: `An unsent crumpled message found in the hallway trash reads: "I won't let you ruin me tonight." Security logs confirm ${innocentA} slipped into the corridor right around the time the lights cut out.`,
      narratorComment: `Looks like ${innocentA} has some serious explaining to do! Or are they being set up?`,
    };
  }

  // Round 3: Subtle physical breakthrough that narrows down between killer and an innocent
  return {
    title: 'Hidden Residue & The Locked Latch',
    content: `Traces of dust and scrape marks on the private back exit reveal that the latch was barred from the inside. Whoever struck ${victim} had to retreat through the main hallway where both ${innocentB} and ${killerName} claimed to be waiting.`,
    narratorComment: `The circle is closing in. Compare their alibis carefully before casting your vote!`,
  };
}

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
      initialClue: {
        title: 'Broken Cocktail Flute & Balcony Latch',
        content:
          'Julian Ross was found lifeless beside the rooftop pool at 11:35 PM, the heavy brass ice tongs discarded in a nearby planter. An overturned drink and an unlatched balcony door indicate a sudden, violent scuffle.',
      },
      redHerrings: [
        'An innocent guest was seen frantically washing red wine off their cuffs right after the blackout.',
        'A crumpled draft message was found demanding $10,000 from Julian before midnight.',
      ],
      killerBio: 'The charming VIP guest who arrived without a plus-one.',
      detBio: 'The sharp-eyed guest trying to keep everyone calm.',
      witBio: 'The party guest who stayed by the balcony all night.',
      suspectPool: [
        {
          alias: 'The Business Partner',
          bio: 'Julian’s flashy co-investor who flew in from Miami.',
          secret:
            'YOU ARE A PRIME SUSPECT. Julian was about to audit your joint offshore accounts. You were arguing near the bar at 11:15 PM, but you didn’t kill him. Defend your innocence!',
          suspicion: 'Was heard having a furious shouting match with Julian over money.',
          alibi: 'Claims they were at the cocktail bar getting a refill.',
        },
        {
          alias: 'The VIP Influencer',
          bio: 'A socialite invited to promote the penthouse party.',
          secret:
            'YOU ARE A PRIME SUSPECT. Julian caught you snooping through his desk looking for an embarrassing contract. You panicked when the lights cut out, but you are innocent. Find the real killer!',
          suspicion: 'Was seen holding Julian’s personal laptop 10 minutes before the crime.',
          alibi: 'Claims they were taking selfies in the corner lounge.',
        },
        {
          alias: 'The Private Sommelier',
          bio: 'The wine connoisseur managing the penthouse bar.',
          secret:
            'YOU ARE A PRIME SUSPECT. You dropped a tray of glasses when thunder struck and got red wine all over your sleeve. People think it’s blood! Prove your innocence!',
          suspicion: 'Has dark red stains on their sleeves.',
          alibi: 'Claims they were restocking ice in the pantry.',
        },
        {
          alias: 'The Tech Rival',
          bio: 'A competitor whose startup Julian bankrupted last year.',
          secret:
            'YOU ARE A PRIME SUSPECT. You showed up uninvited to confront Julian. You were cooling off on the fire escape when the lights cut out. Clear your name!',
          suspicion: 'Arrived uninvited with a known public grudge against Julian.',
          alibi: 'Claims they stepped outside for fresh air.',
        },
      ],
      killerSecret: (w) =>
        `YOU ARE THE KILLER. You grabbed the ${w} and shoved Julian into the terrace pool. If asked, claim you were getting soda in the kitchen. Point suspicion at anyone asking too many questions!`,
      detSecret:
        'YOU ARE THE DETECTIVE. You found wet sneaker prints leading from the pool terrace to the kitchen bar. Ask everyone where they were when the terrace lights flickered!',
      witSecret:
        'YOU ARE THE WITNESS. Right before the lights flickered, you saw someone slipping out through the patio curtains wearing dark clothes. Share this clue when the time is right!',
    },
    {
      title: 'The Snowed-In Ski Chalet',
      setting: 'A cozy luxury mountain chalet in Aspen cut off by a sudden midnight blizzard.',
      victim: 'Victor Stone, wealthy lodge owner and retired poker champion',
      weapon: 'Heavy cast-iron fireplace poker',
      motive: 'Victor caught a guest stealing a rare diamond heirloom from his safe',
      solutionTemplate: (k) =>
        `${k} ambushed Victor in the study at 11:35 PM with the iron poker, stashed the stolen ring behind the ski rack, and pretended to be asleep by the fireplace.`,
      initialClue: {
        title: 'Open Wall Safe & Muddy Hearth',
        content:
          'Victor Stone was discovered in the mountain lodge study at 11:35 PM with the cast-iron fireplace poker beside him. The wall safe stood ajar, and damp boot prints led toward the ski rack hallway.',
      },
      redHerrings: [
        'A guest’s silver lighter was found on Victor’s poker table.',
        'Someone was seen rushing down the loft stairs with a heavy black backpack.',
      ],
      killerBio: 'The guest who kept pacing near the fireplace.',
      detBio: 'The observant guest who noticed the study door was unlocked.',
      witBio: 'The night owl who was reading in the loft.',
      suspectPool: [
        {
          alias: 'The Poker Rival',
          bio: 'A veteran player who lost a $50,000 hand to Victor last night.',
          secret:
            'YOU ARE A PRIME SUSPECT. You accused Victor of cheating at cards earlier tonight. You were pacing the halls cooling off, but you didn’t kill him. Defend your innocence!',
          suspicion: 'Threatened Victor in front of everyone over a disputed poker pot.',
          alibi: 'Claims they were resting in the upstairs bunk.',
        },
        {
          alias: 'The Mountain Guide',
          bio: 'The local guide who led the group up the mountain.',
          secret:
            'YOU ARE A PRIME SUSPECT. Victor refused to pay your emergency winter fee. You had a heated argument by the mudroom, but you are innocent. Help find the killer!',
          suspicion: 'Was seen arguing with Victor over unpaid wages.',
          alibi: 'Claims they were checking the backup generator.',
        },
        {
          alias: 'The Antiques Dealer',
          bio: 'A collector interested in Victor’s mountain lodge art.',
          secret:
            'YOU ARE A PRIME SUSPECT. You were caught examining Victor’s wall safe earlier today. You are innocent, but look deeply suspicious. Clear your name!',
          suspicion: 'Knew the location of Victor’s hidden study safe.',
          alibi: 'Claims they were reading by the hearth.',
        },
        {
          alias: 'The Stranded Traveler',
          bio: 'A motorist whose car broke down near the lodge.',
          secret:
            'YOU ARE A PRIME SUSPECT. You have fresh mud and snow on your boots from checking your car. People think you were snooping near the shed. Prove your innocence!',
          suspicion: 'Had wet boots matching the tread found by the back door.',
          alibi: 'Claims they were trying to jumpstart their car.',
        },
      ],
      killerSecret: (w) =>
        `YOU ARE THE KILLER. You took the ${w} from the hearth and struck Victor in the study. Your alibi: you were heating water in the kitchen. Blame whoever was acting nervous!`,
      detSecret:
        'YOU ARE THE DETECTIVE. You noticed the study safe was wide open and a fresh scrape mark was near the fireplace. Press everyone on who knew the safe code!',
      witSecret:
        'YOU ARE THE WITNESS. At 11:32 PM, you heard a loud thud followed by footsteps rushing toward the ski racks. Watch how people react when the ski racks are mentioned!',
    },
    {
      title: 'The Streamer Mansion Scandal',
      setting: 'A lavish Hollywood creator mansion during a live 24-hour party broadcast.',
      victim: 'Chad Vance, superstar gaming creator and channel owner',
      weapon: 'Solid gold esports championship trophy',
      motive: 'Chad took all the channel sponsorship money and fired his crew',
      solutionTemplate: (k) =>
        `${k} struck Chad behind the streaming setup during a 5-minute internet outage, wiped the trophy, and put it back on the prize shelf.`,
      initialClue: {
        title: 'Cut Router Cable & Smashed Display',
        content:
          'Chad Vance was struck behind his broadcasting station during an unexpected 5-minute Wi-Fi blackout at 11:41 PM. The championship trophy was wiped clean, and the master router cable was cleanly severed.',
      },
      redHerrings: [
        'An innocent creator was overheard threatening to delete the streaming channel.',
        'A dropped smartphone near the router showed a failed network reset attempt.',
      ],
      killerBio: 'The top editor who was arguing with Chad on the live chat.',
      detBio: 'The co-host checking timestamp logs on the router.',
      witBio: 'The friend who was snacking in the pantry during the outage.',
      suspectPool: [
        {
          alias: 'The Video Editor',
          bio: 'The channel editor who hadn’t been paid in three months.',
          secret:
            'YOU ARE A PRIME SUSPECT. You threatened to wipe the channel hard drives an hour before the murder. You were in the editing bay, but you didn’t kill Chad. Prove it!',
          suspicion: 'Publicly argued with Chad about unpaid editing royalties.',
          alibi: 'Claims they were rendering video files in the side booth.',
        },
        {
          alias: 'The Co-Host',
          bio: 'Chad’s on-camera streaming partner.',
          secret:
            'YOU ARE A PRIME SUSPECT. Chad secretly told you he was kicking you off the show next week. You threw a drink on the balcony, but you are innocent. Help catch the real culprit!',
          suspicion: 'Had a major dispute about channel ownership on stream.',
          alibi: 'Claims they were testing headsets in the green room.',
        },
        {
          alias: 'The VIP Sponsor',
          bio: 'The brand manager who funded tonight’s tournament.',
          secret:
            'YOU ARE A PRIME SUSPECT. You demanded an immediate $50,000 refund from Chad 20 minutes before the outage. You were cooling off on the rooftop terrace. Defend your innocence!',
          suspicion: 'Was seen confronting Chad in his private office.',
          alibi: 'Claims they were on a business phone call.',
        },
        {
          alias: 'The Former Team Member',
          bio: 'A former crew member who crashed the broadcast.',
          secret:
            'YOU ARE A PRIME SUSPECT. You had access to the master server room and were seen holding cable cutters. You were just trying to play a prank, not commit murder!',
          suspicion: 'Was seen near the server room right before the blackout.',
          alibi: 'Claims they were grabbing an energy drink from the kitchen.',
        },
      ],
      killerSecret: (w) =>
        `YOU ARE THE KILLER. You pulled the router cable, grabbed the ${w}, and took out Chad. Tell everyone you were resetting your phone in the bathroom. Blame the person who owes Chad money!`,
      detSecret:
        'YOU ARE THE DETECTIVE. The router cable was deliberately cut at 11:41 PM. Someone in this room had access to the master setup. Interrogate the room and catch the liar!',
      witSecret:
        'YOU ARE THE WITNESS. Right when the Wi-Fi dropped, you saw someone sprinting past the hallway holding something heavy in a black towel. Share what you saw!',
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
  let suspCounter = 0;

  const playerRoles = players.map((p, idx) => {
    const role = shuffledRoles[idx];
    if (role === ROLES.KILLER) {
      killerName = p.name;
    }

    let secretInfo = '';
    let publicBio = '';
    let characterName = `Guest ${p.name}`;
    let suspicionHook = 'Was present when the crime occurred.';
    let alibi = 'Claims to have been nearby.';

    if (role === ROLES.KILLER) {
      secretInfo = theme.killerSecret(theme.weapon);
      publicBio = theme.killerBio;
      characterName = `VIP Guest ${p.name}`;
      suspicionHook = 'Was seen moving between rooms right before the blackout.';
      alibi = 'Claims they were getting a refill in the kitchen.';
    } else if (role === ROLES.DETECTIVE) {
      secretInfo = theme.detSecret;
      publicBio = theme.detBio;
      characterName = `Investigator ${p.name}`;
      suspicionHook = 'Arrived first at the crime scene.';
      alibi = 'Was inspecting the hallway.';
    } else if (role === ROLES.WITNESS) {
      secretInfo = theme.witSecret;
      publicBio = theme.witBio;
      characterName = `Witness ${p.name}`;
      suspicionHook = 'Was seen looking anxious near the doorway.';
      alibi = 'Was sitting near the balcony.';
    } else {
      const poolItem = theme.suspectPool[suspCounter % theme.suspectPool.length];
      suspCounter++;
      secretInfo = poolItem.secret;
      publicBio = poolItem.bio;
      characterName = `${poolItem.alias} (${p.name})`;
      suspicionHook = poolItem.suspicion;
      alibi = poolItem.alibi;
    }

    return {
      playerId: p.id,
      playerName: p.name,
      characterName,
      role,
      publicBio,
      secretInfo,
      suspicionHook,
      alibi,
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
    initialClue: theme.initialClue,
    redHerrings: theme.redHerrings,
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
    secretInfo: cleanDuplicateArticles(
      killerLore.secretInfo ||
      `YOU ARE THE KILLER. You committed the crime using ${scenario.weapon ? (/^[aeiou]/i.test(scenario.weapon) ? 'an ' : 'a ') + scenario.weapon.replace(/^(a|an|the)\s+/i, '') : 'the murder weapon'}. Cover your tracks, say you were grabbing a drink in the kitchen, and point fingers at someone else!`
    ),
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
      suspicionHook: suspLore.suspicionHook || 'Had tension with the victim earlier.',
      alibi: suspLore.alibi || 'Claims they were in the adjoining lounge.',
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
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timed out after 12s')), 12000)
      );
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      const responseText = result.response.text();

      const cleanedJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      if (parsed.weapon) parsed.weapon = cleanDuplicateArticles(parsed.weapon);
      if (parsed.intro) parsed.intro = cleanDuplicateArticles(parsed.intro);
      if (parsed.solution) parsed.solution = cleanDuplicateArticles(parsed.solution);

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

// Generate round clue using Google Gemini with dynamic red herrings and anti-repetition guards
export async function generateRoundClue(scenario, round, existingClues = []) {
  const defaultFallback = generateDynamicFallbackClue(scenario, round, existingClues);

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
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI generation timed out after 8s')), 8000)
      );
      const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
      const responseText = result.response.text();

      const cleanedJson = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      if (parsed.title) parsed.title = cleanDuplicateArticles(parsed.title);
      if (parsed.content) parsed.content = cleanDuplicateArticles(parsed.content);
      if (parsed.narratorComment) parsed.narratorComment = cleanDuplicateArticles(parsed.narratorComment);

      const sanitized = sanitizeClueSuspects(parsed, scenario, round, existingClues);
      return clueSchema.parse(sanitized);
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
      if (parsed.narratorReaction) parsed.narratorReaction = cleanDuplicateArticles(parsed.narratorReaction);
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
      if (parsed.narratorMonologue) parsed.narratorMonologue = cleanDuplicateArticles(parsed.narratorMonologue);
      if (parsed.verdictSummary) parsed.verdictSummary = cleanDuplicateArticles(parsed.verdictSummary);
      return revealSchema.parse(parsed);
    } catch (err) {
      console.warn(`Reveal monologue generation with ${modelName} failed (${err.message}). Trying next...`);
    }
  }

  return defaultFallback;
}


