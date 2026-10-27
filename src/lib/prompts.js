// AI Narrator Prompt Templates — Tuned for unpredictable, thrilling party-game deduction

export function buildScenarioPrompt(players) {
  const playerNames = players.map((p) => p.name).join(', ');
  const count = players.length;

  return `You are the master mystery creator and game master of HiddenTruth, a live murder mystery party game played with friends.
The players in this game: ${playerNames} (Total: ${count} players).

Create an unpredictable, deeply engaging modern murder mystery where EVERY player feels like a credible suspect.

TONE & WRITING RULES (STRICT):
- Use clear, natural, everyday English that friends playing a party game can instantly understand.
- Keep sentences short, punchy, and conversational.
- NO robotic AI jargon, NO heavy forensic terms, NO dry industrial shift-work clichés.
- Relatable modern settings: A VIP rooftop penthouse party, a luxury yacht, a snowed-in mountain ski chalet, a high-stakes poker night, a private streamer mansion, or an exclusive celebrity gala.
- Recognizable physical weapons: A heavy marble bookend, a poisoned champagne flute, a silk curtain cord, a broken golf trophy, a vintage ice pick, heavy brass ice tongs.
- Relatable human drama motives: Blackmail, jealousy, a stolen lottery ticket or crypto wallet, unpaid debts, a betrayed business buyout, or revenge over a leaked secret.

MYSTERY DIVERSITY & RED HERRING RULES (CRITICAL):
- Do NOT make the crime an obvious one-person case.
- Give EVERY suspect (not just the killer!) a believable reason why they look suspicious or had friction with the victim (e.g. heard shouting, caught snooping in the study, owed money, or caught in an awkward lie).
- Provide 2 distinct "redHerrings": misleading circumstances or coincidences involving INNOCENT players that cast temporary suspicion on them (e.g. an innocent guest had red stains on their cuffs that looks like blood, or an innocent guest dropped their keycard near the scene).
- Include an "initialClue" for Round 1: A tangible physical clue discovered at the crime scene (e.g. time of death, signs of struggle, or a dropped object) that opens the investigation without naming or singling out the killer.

ROLE ASSIGNMENT RULES:
- EXACTLY 1 player MUST have "role": "killer" (The secret culprit).
- EXACTLY 1 player MUST have "role": "detective" (The lead investigator seeking the truth).
- EXACTLY 1 player MUST have "role": "witness" (Saw or heard a crucial moment right before the crime).
- The remaining players (${Math.max(0, count - 3)}) MUST have "role": "suspect" (Innocent, but have an awkward secret, friction with the victim, or weak alibi).
CRITICAL: There MUST be EXACTLY ONE "detective", ONE "killer", and ONE "witness", with any remaining players as "suspect".

SECRET INFORMATION RULES (Write in direct, second-person "YOU"):
- Killer: "YOU ARE THE KILLER. You [how you did it] using [weapon] and hid it [where]. Your cover alibi: tell everyone you were [relatable alibi]. Try to cast doubt on someone else!"
- Detective: "YOU ARE THE DETECTIVE. You found [one clear physical clue]. Ask everyone about their timeline around [time] and see who contradicts themselves."
- Witness: "YOU ARE THE WITNESS. Right before it happened, you saw [clear visual detail, e.g. someone in dark clothing heading toward the balcony]. Share this carefully when the time is right."
- Suspect: "YOU ARE A PRIME SUSPECT. You didn't do it, but you look suspicious because [embarrassing/secret reason you had friction or were nearby]. Defend your innocence and help spot the real culprit!"
- GRAMMAR RULE: Never output double articles such as "the a" or "the an". Name weapons directly (e.g. "Heavy brass ice tongs", not "A heavy brass ice tongs").

OUTPUT FORMAT:
Respond with raw JSON only (no markdown, no backticks):
{
  "title": "Catchy, fun case title (e.g. The Midnight Penthouse Poisoning)",
  "setting": "1-2 vivid sentences setting the scene",
  "victim": "Name and recognizable role (e.g. Julian Ross, tech mogul and host)",
  "intro": "2-3 punchy sentences announcing the crime, how the body was discovered, and that everyone is trapped until the truth comes out.",
  "killerName": "The exact playerName of who the killer is",
  "weapon": "The recognizable murder weapon (e.g. Heavy brass ice tongs)",
  "motive": "Clear, juicy human motive (e.g. Julian threatened to leak private photos)",
  "solution": "2 direct sentences explaining exactly how the killer pulled it off and what subtle mistake they made.",
  "redHerrings": [
    "Misleading detail 1 involving an innocent player",
    "Misleading detail 2 involving another innocent player"
  ],
  "initialClue": {
    "title": "Opening Crime Scene Clue (e.g. Broken Watch Stopped at 11:34 PM)",
    "content": "2 direct sentences describing the physical evidence and the mysterious circumstances without naming the killer."
  },
  "playerRoles": [
    {
      "playerName": "Exact player name from the list",
      "characterName": "Fun, memorable alias",
      "role": "killer" | "detective" | "witness" | "suspect",
      "publicBio": "1 short sentence of who this character is to the group",
      "secretInfo": "2-3 conversational sentences of confidential instructions",
      "suspicionHook": "Why this character looks suspicious to other players",
      "alibi": "Where this character claims they were at the time of the crime"
    }
  ]
}

Ensure all ${count} players are included in playerRoles with their exact names. Raw JSON only.`;
}

export function buildCluePrompt(scenario, round, existingClues = []) {
  const roles = Array.isArray(scenario.playerRoles) ? scenario.playerRoles : [];
  const killerName = scenario.killerName || 'The Killer';

  const allPlayerNames = roles.map((r) => r.playerName).filter(Boolean);
  const innocentPlayers = roles.filter(
    (r) => r.playerName && r.playerName.trim().toLowerCase() !== killerName.trim().toLowerCase()
  );
  const innocentNames = innocentPlayers.map((r) => r.playerName);

  // Parse names already mentioned in previous clues
  const previousCluesText = existingClues
    .map((c, i) => `[Clue ${i + 1}] ${typeof c === 'string' ? c : c.content || ''}`)
    .join('\n');

  const nameInText = (name, text) => {
    if (!name || !text) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i').test(text);
  };

  const namesMentionedSoFar = allPlayerNames.filter((name) =>
    existingClues.some((c) => {
      const text = typeof c === 'string' ? c : c.content || '';
      return nameInText(name, text);
    })
  );

  const innocentNamesNotYetMentioned = innocentNames.filter(
    (name) => !namesMentionedSoFar.some((m) => m.toLowerCase() === name.toLowerCase())
  );

  // Available suspects for this round
  const targetInnocents =
    innocentNamesNotYetMentioned.length > 0 ? innocentNamesNotYetMentioned : innocentNames;

  // Profiles of the suspects
  const suspectBriefing = roles
    .map((r) => {
      const isKiller = r.playerName.trim().toLowerCase() === killerName.trim().toLowerCase();
      return `- ${r.playerName} (${r.characterName || 'Guest'})${
        isKiller ? ' [SECRET KILLER]' : ' [INNOCENT]'
      }: ${r.publicBio || 'Guest'}. Suspected because: ${
        r.suspicionHook || 'Had tension with the victim.'
      } Claimed alibi: ${r.alibi || 'Was elsewhere.'}`;
    })
    .join('\n');

  // Red herrings from the scenario (if any)
  const redHerringsList = Array.isArray(scenario.redHerrings)
    ? scenario.redHerrings.map((rh) => `- ${rh}`).join('\n')
    : '';

  // Round-specific directives
  let roundSpecificGoal = '';
  if (round === 2) {
    roundSpecificGoal = `ROUND 2 GOAL: THE RED HERRING & CONFLICTING ALIBI (MANDATORY)
- CRITICAL: DO NOT NAME ${killerName} IN THIS CLUE! DO NOT make ${killerName} the focus.
- Instead, focus suspicion on ONE OR TWO INNOCENT PLAYERS (Choose from: ${
      targetInnocents.join(', ') || innocentNames.join(', ') || 'an innocent guest'
    }).
- Introduce a misleading piece of physical evidence (e.g. an unsent draft message, a misplaced accessory, a stained piece of clothing, an argument overheard by the stairs, or a disputed alibi).
- This creates intense debate among players and prevents the game from becoming an obvious pattern.`;
  } else if (round >= 3) {
    roundSpecificGoal = `ROUND 3 GOAL: THE SUBTLE BREAKTHROUGH & THE FINAL TWIST
- This is the final clue before the voting grand jury.
- DO NOT hand the answer on a silver platter or simply state "${killerName} did it". That ruins the mystery!
- Provide a subtle, clever physical detail (e.g. a specific timeline conflict, a stain from the scene, an item hidden in a specific room, or an environmental factor like wet shoes or a unique keycard swipe) that contradicts ${killerName}'s cover alibi.
- Crucially, also mention or implicate another innocent suspect (${
      targetInnocents[0] || innocentNames[0] || 'another guest'
    }) as a competing possibility, so players have to debate, think critically, and connect all 3 clues together before voting!`;
  } else {
    // Round 1
    roundSpecificGoal = `ROUND 1 GOAL: CRIME SCENE EVIDENCE & BROAD TIMELINE
- Describe tangible physical evidence found right at the scene.
- Establish the timeline and broad details (e.g. shoe size, clothing fabric, sounds heard, or broken item) that could apply to multiple people.
- DO NOT single out ${killerName}. Keep the field open and exciting.`;
  }

  return `You are the game master of HiddenTruth, a deduction mystery party game.
CASE SUMMARY:
Title: ${scenario.title}
Victim: ${scenario.victim}
Weapon: ${scenario.weapon}
Setting: ${scenario.setting}
Secret Killer: ${killerName}
How the killer pulled it off: ${scenario.solution}

ALL PLAYERS IN THE ROOM:
${suspectBriefing}

${redHerringsList ? `POSSIBLE RED HERRINGS TO DRAW FROM:\n${redHerringsList}\n` : ''}
PREVIOUS CLUES REVEALED SO FAR:
${previousCluesText || 'None so far.'}
${namesMentionedSoFar.length > 0 ? `Players already named in previous clues: ${namesMentionedSoFar.join(', ')}\n` : ''}

CURRENT ROUND: Round ${round} of 3.
${roundSpecificGoal}

CORE MYSTERY RULES (MUST FOLLOW STRICTLY):
1. AVOID OBVIOUS PATTERNS: Never repeatedly mention the same player's name across clues. If a player was featured in a previous clue, pick a DIFFERENT character.
2. SPREAD SUSPICION: In every mystery, multiple innocent characters must look guilty. Give players conflicting evidence and red herrings to debate.
3. CONCRETE PHYSICAL EVIDENCE: Clues must be tangible (e.g. cracked phone, torn receipt, muddy footwear, spilled wine, locked door log, torn glove).
4. LOGICAL COHERENCE: The evidence must remain logical so the final solution makes complete sense when the killer is unmasked.
5. CONVERSATIONAL ENGLISH: Keep it punchy, engaging, and easy to read aloud. No robotic AI jargon.
6. GRAMMAR: Never write "the a" or "the an".

OUTPUT FORMAT:
Respond with raw JSON only (no markdown, no backticks):
{
  "title": "Snappy, evocative clue name (e.g. Smudged Glass on the Terrace)",
  "content": "2 direct sentences describing the physical evidence and the question or suspicion it raises.",
  "narratorComment": "1 sharp, witty remark from the game master stirring the pot and prompting suspects to speak up."
}`;
}

export function buildAccusationPrompt(scenario, accuserName, accusedName, reason, round) {
  return `You are the game master of HiddenTruth.
Case: ${scenario.title}
Round: ${round} of 3

A player just called someone out live!
Accuser: ${accuserName}
Accused: ${accusedName}
Reason: "${reason}"

Give a 1-2 sentence witty, dramatic reaction to this face-off.
RULES:
- Do not reveal if the accused is guilty or innocent.
- React like a lively host at game night (e.g. "Things just got heated!", "Big words from ${accuserName}. Are they onto something, or are they throwing shade to protect themselves?").
- Natural, conversational tone.

OUTPUT FORMAT:
Respond with raw JSON only:
{
  "narratorReaction": "1-2 snappy sentences reacting to the accusation."
}`;
}

export function buildRevealPrompt(scenario, killerName, mostVotedName, groupWon) {
  return `You are the game master of HiddenTruth delivering the final dramatic unmasking.

CASE SUMMARY:
Title: ${scenario.title}
Victim: ${scenario.victim}
Weapon: ${scenario.weapon}
Motive: ${scenario.motive}
Actual Killer: ${killerName}
Group Accusation: ${mostVotedName || 'No majority reached'}
Result: ${groupWon ? 'THE INNOCENTS WON! The killer was identified.' : 'THE KILLER ESCAPED! An innocent was framed.'}

INSTRUCTIONS:
1. Deliver a fun, dramatic 3-sentence closing monologue explaining how the killer pulled it off, where the weapon was hidden, and how the game ended.
2. Provide a 1-sentence punchy verdict summary.
3. Keep the language natural, punchy, and engaging—like the end of a great Knives Out movie.

OUTPUT FORMAT:
Respond with raw JSON only:
{
  "narratorMonologue": "3 punchy sentences revealing how the killer committed the crime and celebrating the outcome.",
  "verdictSummary": "1 sentence summarizing the final verdict."
}`;
}
