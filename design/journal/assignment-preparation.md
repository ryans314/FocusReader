# Tasks Breakdown

#### Tasks
- [x] Template repo
	- [x] Finish Prep
	- [x] Be familiar with ctx tool/workflow
		- `./ctx prompt design/path/file.md` to run a prompt, with the prompt in an H1
		- Each file must start with an H1
- [ ] Rework/improve Concepts
	- [x] Assess individual concepts for flaws, including:
		- Non-comprehensive action sets
		- Poorly defined state types
		- Dependency on another concept's state or actions
		- Conflated concerns between concepts
		- Concepts:
			- [x] Profile
			- [x] Library
			- [x] Annotations
			- [x] TextSettings
			- [x] FocusStats
	- [x] Document any concept changes/issues in \[concept\]-design.md
	- [ ] Assess application/syncs for flaws, including:
		- Feasibility of the system
		- Missing necessary syncs
	- [ ] Document any resulting concept changes in \[concept\]-design.md
	- [ ] Document any application-wide changes in application-design.md
- [x] Covert Concepts into Concept Specifications
- [ ] Implement concept backend
	- AI slop them into existence, as instructed
- [ ] Develop tests for each concept
	- [ ] Operational principle test
	- [ ] 3-5 interesting scenarios, with each action hit at least once
- [ ] Regular iteration over implementation + tests until tests are good and pass

#### Deliverables
1. Annotation Concept
	- [x] Spec file (markdown, specific notation)
	- [ ] Implementation (file)
	- [ ] Tests (file)
	- [ ] Copy of console output showing test cases run successfully (markdown)
	- [x] Design file (markdown, note concept changes since A2 and issues)
2. FocusStats Concept
	- [x] Spec file (markdown, specific notation)
	- [ ] Implementation (file)
	- [ ] Tests (file)
	- [ ] Copy of console output showing test cases run successfully (markdown)
	- [x] Design file (markdown, note concept changes since A2 and issues)
3. Library Concept
	- [x] Spec file (markdown, specific notation)
	- [ ] Implementation (file)
	- [ ] Tests (file)
	- [ ] Copy of console output showing test cases run successfully (markdown)
	- [x] Design file (markdown, note concept changes since A2 and issues)
4. Profile Concept
	- [x] Spec file (markdown, specific notation)
	- [ ] Implementation (file)
	- [ ] Tests (file)
	- [ ] Copy of console output showing test cases run successfully (markdown)
	- [x] Design file (markdown, note concept changes since A2 and issues)
5. TextSettings Concept
	- [x] Spec file (markdown, specific notation)
	- [ ] Implementation (file)
	- [ ] Tests (file)
	- [ ] Copy of console output showing test cases run successfully (markdown)
	- [x] Design file (markdown, note concept changes since A2 and issues)
6. Application as a whole
	- [ ] Design file (markdown)
		- [ ] Changes to whole application
		- [ ] 5-10 "interesting moments" + explanation

#### Notes:
- Save "interesting moments" by using ./ctx save and making a note in [the journal](design/journal/journal.md)