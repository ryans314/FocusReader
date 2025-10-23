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
3. Storing plaintext passwords
	- [Context](context/design/concepts/Profile/implementation.md/20251023_023448.abcfdcb0.md)
	- What happened:
		- I used the LLM to implement the Profile concept, which has a username and password, and it stored plaintext passwords in the database. Additionally, it stated multiple times that this should never be done in production code, as it is very dangerous
	- Why it's interesting
		- Although a direct transliteration of the concept would dictate the LLM to store plaintext passwords (it seems mongo doesn't have an inherent account/user/password system like django), the fact that it acknowledged the danger but decided to do it anyway was interesting. I'm not sure what it thinks it's doing, if not generating production code. 
4.  Deno.test.beforeEach()
	- [Context](context/design/concepts/Profile/implementation.md/20251023_025632.16ad8892.md)
	- What happened: 
		- The LLM INSISTED (many, many times) that Deno.test.beforeEach(fn) runs before each test.step(), which is just objectively not true. 
		- Even after telling it that it may be wrong, linking to the appropriate deno documentation, it insisted that it was right. 
	- Why it's interesting