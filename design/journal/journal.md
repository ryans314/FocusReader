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
		- Very firm hallucination, usually after telling it to double check, providing direct evidence of it's incorrectness, the llm "realizes" that it's wrong, and adapts to what I say. 
5. Applying bug fixes broadly
	- [Context]()
	- What happened:
		- There were many instances of me attempting to generate a test suite, and the LLM having issues with type checking. For example calling obj.message, when obj has type { message: String } | { error: String }
		- However, when I gave the LLM an example of the bug and explained the issue, it not only fixed the bug on the same line, or even bugs with the same variable, but it would fix all instances of that type of bug
	- Why it's interesting
		- Applying conceptual fixes broadly, rather than just fixing specific given instances of a bug, is something that I associate with a high level of skill/thinking, since it requires abstracting the problem and identifying other occurrences of it that may not be obvious. I'm surprised the llm did it so well. 

## Application Changes
- Removed many features:
	- Bionic Reading - removed because it seems difficult to implement, and time is a factor. Also studies show little effect on focus or reading speed, so may not actually be beneficial in the first place
	- Removed ai augmented search - also done because of time. I'd like to add this back in at some point, but depends on how much time I have to work on the project.
- Limited application to Ebooks (.epub)
	- A lot of the application will rely on making changes to text, and it's much, much easier to do with epubs than with pdfs. Frequently, PDFs will essentially be images, with no actual documentation of text. Epubs however have the information about text built in, and are easily able to identify text location and modulate elements of the text (e.g. color, font size, font, etc)
- Removed annotation search - the searching functionality wasn't terribly necessary or in-line with the Focus theme, and was cut for time. 
- Added Cursor Focus feature - when reading an ebook, users can blur out all text outside a circle around the cursor. Users can set the radius of the circle. This is to help users focus/not get overwhelmed or distracted by other lines of text. (No backend changes necessary for this feature).
- Backend changes - added a couple API routes for temporary front-end synchronizations, namely the registerDocument route. Will likely be removed after syncs are implemented. 