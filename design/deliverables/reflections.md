# Reflections on the design process

## Questions:

**Q: What mistakes did you make, and how would you avoid making them in the future?**
- The main mistake I made was with a poor concept design. Initially, they were all heavily interconnected, and didn't make for very isolated app components. This definitely made the entire app development process more difficult, and would have been good to create after having a better understanding of concept design and syncs.

**Q: What skills did you acquire, and which do you feel you still need to develop further?**
- The main skill I acquired was understanding concepts and using the context and agentic tools to create. The skills I feel I should develop further are designing better syncs (especially with code, via the sync engine), and using context and agentic tools to understand. 

**Q: How did you use the Context tool? How did you use an agentic coding tool?**
- I largely used both to handle interactions with the sync engine, API calls between the front and back ends, and weird epub.js things. Although I used the context tool to help me with concept design, I generally avoided using the agentic tool to help *design* the website, especially with respect to graphic design. 

**Q: What conclusions would you draw about the appropriate role of LLMs in software development?**
- LLMs can be useful in order to produce lines of code, primarily when those lines of code are not critical or sensitive. 
- LLMs can introduce *many* issues into codebases, ranging from poor initial infrastructure (if underspecified), security vulnerabilities, style violations, inefficiencies, hidden bugs, etc. I would not really recommend it for anything important.  
- LLMs are also bad (at least for me) for learning software development. Generally, *doing* or *creating* is seen as a more efficient, higher level of learning than *seeing* or *assessing*, which are the primary ways that one would interact with agentic coding tools.
	- Even with non-agentic coding tools, *creating* something new and original implies and imparts much more than *applying* given information to the same scenario. 

## My Experience

Overall, this was a difficult but informative experience. In addition to learning Concept Design, it was my first experience with integrated and agentic coding tools. I can confidently say that I will avoid these tools for the remainder of my academic career, and will attempt to avoid them throughout my (at least early) professional career as well. Looking back, I haven't learned much, if anything, about mongo, vite, or deno. Similarly, there are entire swathes of my app that I almost certainly won't be able to explain in a couple days. I've found that when the AI writes the code for me, I don't actually learn how the code works.  Perhaps there is a way to balance agentic/AI coding with actual, human coding in such a way that speeds up the process and allows me to educate myself more effectively. However, I suspect I'll learn best if I just write the code by hand, perhaps consulting a non-agentic, non-integrated LLM for advice if I get stuck. However, even that has drawbacks, as debugging "the old fashioned way" (code tracing, stack overflow, reading the docs, etc) also imparts real, useful skills. 
