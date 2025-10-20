# Journal

## Interesting Moments

1. Using object/document identifiers in concepts
	- [Context](context/design/concepts/Library/Library.md/20251019_235426.997b6c79.md)
	- Why it's interesting: 
		- Gemini's advice directly contradicts numerous in class examples about concept design (namely, that it is okay to reference imported/generic types directly in the state, like including a User generic type)
		- Gemini says that these types must be represented by identifiers, not the actual types themselves (e.g. UserID instead of User). This is not something we talked about in class, but does seem to be represented in [the resources given to it](design/background/concept-design-overview.md)
		- Actually, after fighting back a bit and looking into concept-state, I was able to correct it and [change its mind](context/design/concepts/Library/Library.md/20251020_000823.9205d2ec.md). It is kind of crazy the degree to which it stuck with the incorrect belief. To be fair though, the problem statement and resources given in background/detailed do conflict as to when composite objects can be used, so it's somewhat the course staff's fault. 
-