# Question bank: how to write a question set

The quiz screen (`components/Quiz.tsx`) and the Question Bank page (`components/QuestionBank.tsx`) are finished.
Adding a practical only needs a question file and one line in the registry. `esr.ts` is the reference set:
match its style exactly.

## Files

1. `questions/<practical>.ts` exporting `MCQ[]` (type in `types.ts`). Name the export like `HB_QUESTIONS`.
2. Register it in `questions/index.ts` (`id` must equal the module's view id in `App.tsx`, e.g. `hb-estimation`,
   `specific-gravity`, `osmotic-fragility`, `wbc-count`, `twitch`; `section` is `Hematology`, `Amphibian` or
   `Microscope`).
3. Add a "Test yourself (MCQs)" button to the practical's panel, exactly as in `components/ESR.tsx` (imports `Quiz`
   and `questionSetFor`, a `quizOpen` state, the button below Reset, and `<Quiz>` rendered after `</main>`).

## Content

- 20 to 25 questions per practical, covering: principle, apparatus, procedure, precautions and sources of error,
  normal values, physiological and pathological variations, clinical significance. Viva level, with a few harder
  application questions (e.g. a calculation or "what happens if").
- Facts only from the user's books in `C:\Users\windows\Desktop\Main practical books` (AK Jain, GK Pal, CL Ghai,
  Rashmi). Where books disagree on a value, use GK Pal and say so in the explanation if it matters.
- Write in your own words. Never copy sentences from the books.
- No duplicates within a set, and avoid repeating questions already in other sets.

## Each question

- `q`: a clear question or sentence stem ending in "?" or ":".
- `options`: exactly 4, one clearly correct, three plausible distractors of similar length and form.
  Never "all of the above" / "none of the above" (options are shuffled). Avoid "always/never" giveaways.
- `answer`: index of the correct option as written. Writing it first (0) is fine; the quiz shuffles.
- `explain`: one or two sentences saying why the answer is right (the mechanism, not just a restatement).
- `source`: book + edition + printed page, using the constants in `questions/books.ts`:
  `` `${PAL}, p. 94; ${JAIN}, p. 47` ``. Cite every book that supports the fact (one or two).

## Page numbers

Use the page number printed in the book, not the PDF page index. Find it with PyMuPDF, e.g.:

```python
import fitz, sys
sys.stdout.reconfigure(encoding='utf-8')
d = fitz.open(r'C:\Users\windows\Desktop\Main practical books\G K Pal Practical Physiology, 5th Ed .pdf')
hits = [i + 1 for i, p in enumerate(d) if 'westergren' in p.get_text().lower()]   # PDF pages
print(d[108].get_text()[:300])  # the printed page number is in the page header or footer text
```

In the ESR chapters the offsets were: GK Pal printed = PDF − 16, CL Ghai printed = PDF − 22, AK Jain printed =
PDF − 4. Offsets can change between chapters, so check the printed number on the actual page.
AK Jain's copy has no edition printed, so its references give title and page only.

## Before finishing

- Every fact traceable to the cited page.
- Answers checked medically; anything uncertain flagged to the user rather than guessed.
- Type-check, build (`npx vite build --outDir <scratch dir>`), open the quiz from the Question Bank and from the
  practical, and run through a few questions.
- Show the user the questions in a readable list (question, options with ✓, explanation, source) for review.
  Commit only when the user asks.
