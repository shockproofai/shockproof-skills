<!-- Fragment: narration-principles.md -->
<!-- Used by: slideSequenceGenerator, courseMapDeckFiller, refresherCourseCreator -->
<!--
  ⚠️  THIS IS A COPY — do NOT edit here.
  Source of truth: agents/courseassistant/shared/narration-principles.md (in shockproof-monorepo)
  To update: edit the source file, then re-copy it to this location.
-->

### Narration Generation Principles

**⚠️ CRITICAL REQUIREMENT: All archetypes require a narration field unless the archetype guidance specifies otherwise.** The narration field is REQUIRED by default for all slides. Only omit narration if the specific archetype's `aiGuidance` or metadata explicitly states that narration is optional or should be omitted. When in doubt, always include narration.

---

### 🚨 MANDATORY: Dollar Amount Formatting for TTS

**This rule is NON-NEGOTIABLE and must be applied EVERY TIME you write a dollar amount in narration.**

When writing ANY dollar amount in narration text, you MUST:
1. **REMOVE ALL COMMAS** from the number
2. Use dollar sign prefix for positive amounts
3. Use "negative X dollars" format for negative amounts

| Source Document Shows | You MUST Write in Narration |
|-----------------------|-----------------------------|
| $17,719 | $17719 |
| $182,213 | $182213 |
| $1,234,567 | $1234567 |
| ($204,000) or -$204,000 | negative 204000 dollars |
| $45.67 | $45.67 (decimals are OK) |

**WHY THIS MATTERS:** Commas in dollar figures cause TTS to misread "$17,719" as "seventeen dollars, seven hundred nineteen" instead of "seventeen thousand seven hundred nineteen dollars". This makes the audio incomprehensible.

**BEFORE FINALIZING ANY SLIDE:** Scan your narration for patterns like `$X,XXX` or `$XX,XXX` or `$XXX,XXX` and remove ALL commas from these figures.

---

### 🚨 MANDATORY: Company & Partnership Name Formatting for TTS

**This rule is NON-NEGOTIABLE and must be applied EVERY TIME you write a company or partnership name in narration.**

When writing company names, law firm names, partnership names, or any business entity names in narration text, you MUST:
1. **REMOVE ALL COMMAS** from the name
2. **Replace "&" with "and"** for natural speech
3. Keep the rest of the name intact

| Source Document Shows | You MUST Write in Narration |
|-----------------------|-----------------------------|
| Raley, Shaddock, Jones & Day, LLC | Raley Shaddock Jones and Day LLC |
| Smith, Johnson & Associates, LLP | Smith Johnson and Associates LLP |
| Baker, McKenzie & Co., Inc. | Baker McKenzie and Co. Inc. |
| Anderson, Brown, Clark, LLC | Anderson Brown Clark LLC |
| Jones & Smith, P.A. | Jones and Smith P.A. |

**WHY THIS MATTERS:** Commas in company names cause TTS to insert unnatural pauses between each name, making "Raley, Shaddock" sound like "Raley... Shaddock" with awkward hesitation. Removing commas ensures the name flows naturally as a single entity. The ampersand (&) can also cause TTS issues, so spelling out "and" produces cleaner audio.

**BEFORE FINALIZING ANY SLIDE:** Scan your narration for company/partnership names containing commas or ampersands and reformat them as shown above.

---

### 🚨 MANDATORY: Acronym Pronunciation for TTS

**This rule is NON-NEGOTIABLE and must be applied EVERY TIME you write an acronym in narration.**

Many financial and technical acronyms are pronounced as words rather than spelled out letter-by-letter. When writing these acronyms in narration text, you MUST use the phonetic spelling so TTS pronounces them correctly.

| Acronym | You MUST Write in Narration | Pronounced As |
|---------|-----------------------------| --------------|
| GAAP | Gap | "Gap" (not "G-A-A-P") |
| FASB | Fazz-bee | "Fazz-bee" (not "F-A-S-B") |
| IASB | Eye-az-bee | "Eye-az-bee" (not "I-A-S-B") |
| IFRS | Eye-furs | "Eye-furs" (not "I-F-R-S") |
| SaaS | Sass | "Sass" (not "S-A-A-S") |
| OSHA | Oh-sha | "Oh-sha" (not "O-S-H-A") |
| HIPAA | Hip-ah | "Hip-ah" (not "H-I-P-A-A") |
| FINRA | Fin-rah | "Fin-rah" (not "F-I-N-R-A") |
| ERISA | Eh-riss-ah | "Eh-riss-ah" (not "E-R-I-S-A") |
| FICA | Fye-kah | "Fye-kah" (not "F-I-C-A") |
| CECL | Cecil | "Cecil" (not "C-E-C-L") |
| COGS | Cogs | "Cogs" (not "C-O-G-S") |
| OPEX | Oh-pex | "Oh-pex" (not "O-P-E-X") |
| CAPEX | Cap-ex | "Cap-ex" (not "C-A-P-E-X") |

**Acronyms that SHOULD be spelled out (keep as-is):**
- IRS, SEC, FBI, CIA, USA - TTS handles these correctly as letter sequences
- CFO, CEO, CTO, CPA, CFA - Always spelled out in speech
- LLC, LLP, INC, S-Corp, C-Corp - Entity types spelled out
- ROI, ROE, ROA - Typically spelled out in finance contexts
- P&L, B/S, CF - Spelled out or say "profit and loss", "balance sheet", "cash flow"

**WHY THIS MATTERS:** TTS engines often mispronounce common acronyms that professionals say as words. "GAAP" becomes "G-A-A-P" instead of "Gap", making the narration sound robotic and unprofessional.

**BEFORE FINALIZING ANY SLIDE:** Scan your narration for acronyms from the table above and replace them with their phonetic spellings.

---

### 🚨 MANDATORY: Compound Terms Without Pauses

**This rule is NON-NEGOTIABLE and must be applied EVERY TIME you write these terms in narration.**

Some compound terms should be spoken as a single flowing phrase without pauses. When writing these terms in narration text, you MUST join them into one word.

| Source Document Shows | You MUST Write in Narration |
|-----------------------|-----------------------------|
| Cash Flow | cashflow |
| cash flow | cashflow |

**WHY THIS MATTERS:** TTS engines may insert a slight pause between "Cash" and "Flow" when written as two words, making it sound choppy. Writing "cashflow" as one word ensures smooth, natural pronunciation.

**BEFORE FINALIZING ANY SLIDE:** Scan your narration for "cash flow" (in any capitalization) and replace with "cashflow".

---

### 🚨 MANDATORY: Avoid Quoted Words and Phrases in Narration

**This rule is NON-NEGOTIABLE and must be applied EVERY TIME you write narration.**

When writing narration text, you MUST:
1. **NEVER use single quotes** around words or phrases
2. **NEVER use double quotes** around words or phrases
3. **NEVER use "scare quotes"** for emphasis, skepticism, or irony

| Don't Write | Write Instead |
|-------------|---------------|
| The term "liquidity" refers to... | The term liquidity refers to... |
| This is called 'cash flow' | This is called cash flow |
| What does "working capital" mean? | What does working capital mean? |
| It's not a 'normal' increase | It's not a typical increase |
| The so-called "growth" was minimal | The so-called growth was minimal |
| This isn't a "real" expense | This isn't a true expense |
| They claim it's for 'operations' | They claim it's for operations |

**Common scare-quote patterns to avoid:**
- Using quotes to express skepticism: `'normal'`, `'reasonable'`, `'expected'`
- Using quotes for emphasis: `"significant"`, `"major"`, `"key"`
- Using quotes for technical terms: `"EBITDA"`, `"working capital"`
- Using quotes for irony: `'improvement'`, `'growth'`, `'savings'`

**Alternatives to scare quotes:**
- For skepticism: Use words like "so-called", "supposed", "claimed", or rephrase entirely
- For emphasis: Rely on sentence structure and word choice (the narration will be spoken, not read)
- For technical terms: Just use the term directly without quotes
- For irony: Rephrase to make the meaning explicit

**WHY THIS MATTERS:** Single and double quotes cause TTS engines to insert awkward pauses before and after the quoted text, creating unnatural speech patterns like "It's not a... normal... increase" instead of smooth, flowing narration. Spoken language doesn't have "air quotes" - the meaning must come from word choice.

**BEFORE FINALIZING ANY SLIDE:** Scan your narration for any single or double quotes and remove them, rephrasing if necessary to maintain clarity.

---

### Approximate vs. Exact Numeric Values

When narrating slides that describe **tables of financial data**, use approximate values with descriptors like "over", "almost", and "about" to make the narration more natural and easier to follow.

| Source Data | Narration Style |
|-------------|-----------------|
| $280,581 | "over $280000" or "about $280000" |
| $99,847 | "almost $100000" |
| $1,247,329 | "over $1.2 million" or "about $1.25 million" |
| $45,112 | "about $45000" |

**EXCEPTION - Use exact values when describing specific calculations:**
When the slide shows a specific calculation being performed (addition, subtraction, multiplication, etc.), use the exact figures so the math is clear.

| Context | Use Exact Values |
|---------|------------------|
| "Subtracting operating expenses of $17,182..." | ✅ Exact |
| "...which equals net income of $6,285" | ✅ Exact |
| "Adding depreciation of $4,500 back..." | ✅ Exact |
| "The company had revenue of $847,293" (descriptive) | ❌ Use "about $850000" |

**WHY THIS MATTERS:** Listeners struggle to process long strings of precise digits. Approximations are easier to grasp and remember. However, when walking through calculations step-by-step, exact figures help learners verify the math.

---

Generate presenter scripts that:

1. **Sound Natural**: Write as spoken language, not academic prose. Use contractions, conversational transitions, rhetorical questions.
2. **Track with Visual Content**: The narration should closely follow the text and content visible on the slide. Learners read along while listening, so audio that diverges significantly from on-screen text can be disorienting. It's okay to read or closely paraphrase key text from the slide, then add brief context or explanation.
3. **Add Context After Alignment**: Once you've addressed what's on screen, briefly expand with the "why" behind concepts, real-world applications, or significance. Keep elaboration concise—learners will lose track if the narration wanders too far from the visual content.
4. **Maintain Engagement**: Vary sentence structure and length. Include questions to prompt thinking. Use analogies and examples.
5. **Respect Timing**: Aim for narration that takes 30-60 seconds per slide. For complex slides, extend to 90 seconds maximum. Title slides can be 15-20 seconds.
6. **Use Plain Text Formatting**: Write narration as plain text without unnecessary punctuation or markdown formatting that may interfere with text-to-speech processing. Avoid single quotes, double quotes, asterisks for emphasis, or other markdown directives in the narration text itself. These can have unintended meanings to Narakeet and disrupt audio flow. Use simple, clean text that reads naturally when spoken aloud.
7. **Use Pause Directives When Needed**: When narration requires a deliberate pause for emphasis, transition, or to let complex information sink in, insert a Narakeet pause directive directly into the narration string. Use the format `\n\n(pause: n)\n\n` where n is the pause duration in seconds (1 or 2). Place the pause directive on its own line with blank lines before and after for clarity. Example: `"First concept explained.\n\n(pause: 1)\n\nNow the second concept."` Use pauses sparingly - only when they genuinely enhance comprehension or natural speech rhythm.
8. **Final Slide Pause Before Thank-You (MANDATORY)**: The last slide of every deck MUST include a `(pause: 1)` directive immediately before the thank-you message. This gives learners a moment to absorb the final content before the sign-off. Example ending: `"...and that's what makes this approach so powerful.\n\n(pause: 1)\n\nThanks for watching, hope this was helpful!"` Never run the concluding statement directly into the thank-you without a pause.
9. **Address All Questions on the Slide**: When a slide presents a series of questions, the narration MUST address each question individually—do not summarize or skip any. Asking questions is a powerful pedagogical technique that frames subsequent explanations and engages learner curiosity. Read or paraphrase each question, then provide context or signal that answers will follow. Never condense multiple questions into a generic overview.
10. **Introduce Lists and Card Sets with Context First**: When a slide contains a bullet list, a numbered step sequence, or a set of cards each with bullet details, the narration MUST open by explaining WHY this information matters — what the learner will use it for, why it's relevant at this point in the course, or what problem it solves. Do NOT open by enumerating the items or announcing how many there are. The listener needs a reason to pay attention before hearing the detail. After the framing sentence, you may synthesize the key themes across the items — but do not recite them one by one.

    ❌ Avoid: "There are five steps here. Step one is Employment and Economy. Step two is Supply Pipeline..."
    ✅ Do this: "Before you walk into a borrower interview, you need to have done your market homework. These five areas form your baseline — miss any one of them and you'll be caught off guard when the borrower starts citing data you haven't seen."

    ❌ Avoid: "This slide covers four property-specific question categories: Physical and Operational, Tenant and Revenue, Regulatory and Environmental, and Valuation and Pricing."
    ✅ Do this: "Once you've established rapport, the interview shifts to the property itself. The questions are organized into four areas that together reveal whether the borrower truly understands what they own and what risks they're carrying."
