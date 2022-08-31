## Basic structure
- Split into three levels - Action, Mistake, RegisterEntry

### interface Action
The basic diff unit. Represents what action needs to be taken to convert the check essay into the correct essay

#### Members
- `string id` - UUIDv4
- `ActionType type` - "ADD" | "DEL" | "SUB"
- `ActionSubtype subtype` - "PUNCT" | "ORTHO" | "SUB"
- `number indexCheck` -  The index of the character in the check essay.  If `type=ADD`, the value is the same as the previous action with `type!=ADD`
- `number indexCorrect` -The index of the character in the correct essay. If `type=DEL`, the valuie is the same as the previous action with `type!=DEL`
- `number indexDiff` - The index of the character in the diff
- `string char` - The character to delete, to add, or to substitute with, depending on the action type
- `string? charBefore` - Defined only for `type=SUB`; the character which needs to be replaced
- `string hash` - an XXHash32 of the action. Hashes an object of `{type, indexCorrect, char}`

### class Mistake
A container class for Actions. May contain one or more actions that are part of the same mistake. This replaces the old `Word` interface. Represents a single mistake. A mistake can be a a set of punctuation, a word, or a sentence, i.e. whatever is penalized as just a single mistake.

#### Members
- `Action[] actions` -  The array of actions that the Mistake instance contains
- `MistakeType type` - "ADD" | "DEL" | "MIXED" - `type=ADD` if the mistake is a missing set of punctuation or a missing word, i.e. all actions are `type=ADD` surrounded by word delimiters; `type=DEL` if the mistake is an unnecessary set of punctuation or an unnecessary word, i.e. all actions are `type=DEL` surrounded by word delimiters; `type=MIXED` if the mistake has actions with different types.
- `string? registerId` - To allow for multiple variations of the same registered mistake, each mistake is linked to a registered mistake with a UUIDv4 (Or Mongo ObjectID?).
- `Bounds boundsCorrect` - The bounds of the mistake in the correct essay
- `Bounds boundsCheck` - The bounds of the mistake in the check essay
- `Bounds boundsDiff` - The bounds of the mistake in the diff

### interface RegisterEntry
To allow for multiple variations of the same mistake, the register entry is separate from a Mistake instance.

#### Members
- `string id` - UUIDv4 (or Mongo ObjectID?)
- `string description` - The description of the Mistake instance
- `bool ignore` - Default: `false` - If the mistakes linked to the RegisterEntry should not be penalized or counted as an error

## Initialization and other runtime notes
- Initially all `type=ORTHO` actions are split into word-level Mistakes where possible. Other actions get their own Mistake instance.
- Recognize the errors by Mistake instance, get description and other inter-variation common metadata through the RegisterEntry object.