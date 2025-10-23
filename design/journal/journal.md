# Journal

## Interesting Moments

1. Using object/document identifiers in concepts
	- [Context](context/design/concepts/Library/Library.md/20251019_235426.997b6c79.md)
	- Why it's interesting: 
		- Gemini's advice directly contradicts numerous in class examples about concept design (namely, that it is okay to reference imported/generic types directly in the state, like including a User generic type)
		- Gemini says that these types must be represented by identifiers, not the actual types themselves (e.g. UserID instead of User). This is not something we talked about in class, but does seem to be represented in [the resources given to it](design/background/concept-design-overview.md)
		- Actually, after fighting back a bit and looking into concept-state, I was able to correct it and [change its mind](context/design/concepts/Library/Library.md/20251020_000823.9205d2ec.md). It is kind of crazy the degree to which it stuck with the incorrect belief. To be fair though, the problem statement and resources given in background/detailed do conflict as to when composite objects can be used, so it's somewhat the course staff's fault. 
2. Attempt at test first programming
	- [Context](/context/design/concepts/Library/testing.md/20251023_020154.3d22c995.md)
	- What happened:
		- I tried to use the LLM for test first programming, i.e. for the test step of "spec, test, implement"
		- The LLM kind of failed at it? It essentially cobbled together a dummy implementation in the test file, which it could use in it's test cases.
	- Why it's interesting:
		- I'm surprised it can't use the concept spec itself as enough of a spec that it can generate test cases off of that, and that it actually has to fake-implement the relevant classes and functions in order to generate code
		- Perhaps it's because of the way testing-concepts is written, or perhaps the ai doesn't want to write code that isn't immediately runnable
		- I suppose I could have drilled it harder on not implementing the thing, and using the concept as a spec, but eh that's slow.
	