# Thoughts while working on the assignment

- Where the heck is everything? "a specification file (in markdown, using our structured specification notation);" WHERE IS THE STRUCTURED SPECIFICATION NOTATION???
	- Answer: There is an [example in Assignment-3](design/background/examples/specification-notation)
- Wow, it's going to take forever to manually `ctx save` every single file I may want to mention
- I feel like I'm spending a lot of overhead time just trying to figure out a good workflow to use the ctx tool
- Working on the Profile concept, if the implementation is just meant to be a transliteration of the concept, how should security be represented? Do I need to actually think through the principles of basic cybersecurity, salting and hashing, etc, or is the abstraction of "User with a username and password" good enough?
- IDEA: could add email to Profile concept, would be useful for resetting password
- QUESTION: is it better to have a generic color type/concept, or to have a color String in a concept? I don't want to make another concept for colors when they're so straightforward, and HTML already has a complex set of representations, but my understanding is that it's better to genericize concepts to be more broadly applicable. However, (my understanding is that) generic types need to be passed in during syncs, which implies that I need to have created a concept for them, no? 