# Design Changes - A2 to A4C

In this document, we'll summarize the design changes this project underwent from Assignment 2 to Assignment 4C. 
## Concept Design
#### A2 Design:
[A2 concept design document](https://github.com/ryans314/61040-portfolio/blob/main/assignments/assignment2/concept_design.md)

The initial design, at a high level, is as follows:
- **Library** - A concept for storing and displaying documents - this would allow the user to store, edit, and access PDFs and EPUBs
- **Annotation** - A concept for creating annotations on documents - this would allow the user to make annotations anywhere on the page, using a vague/undefined notion of a "location." Users could also apply tags to their annotations and search amongst them. 
- **TextSettings** - A concept for storing and applying sets of display settings to documents - this would allow the user to change many features of the text, including font, font size/weight/spacing, and color, as well as different "focus" features, such as bionic text (dynamic bolding of words to make reading easier)
- **Profile** - A concept for user sign in and data - this mainly just existed to allow users to differentiate themselves and have personal data, as well as to allow users to "store" preferences on their profile. 
- **FocusStats** - A concept for storing users' reading stats - this allowed the application to automatically collect users' reading data, which could be used to generate different visualizations of usage patterns. 
Thoughts on the initial design:
- The initial concepts are, at a high level, very similar to those in the final product. Each concept's purpose remained largely the same, with some narrowing of scope along the way. 
- One major shortcoming of the initial design was a lack of isolation between concepts. Initially, many of the concepts relied on each other, being "connected" through the Library concept. This was changed along the way by adding syncs and limiting connections between concepts via state. 
- Another shortcoming of the initial design was underspecification. Many of the concept actions relied on nonexistent types (like "Location"), which had to be specified later. 
#### A4C Design:
- **[Library](/design/concepts/Library/Library.md)** - still stores/edits/accesses documents, but only EPUBs
- **[Annotation](/design/concepts/Annotation/Annotation.md)** - still allows users to make annotations, but only on existing text, and without the use of tags. 
- **[TextSettings](/design/concepts/TextSettings/TextSettings.md)** - remained largely the same, but limited to font, font size, and line height; also replaced bionic text with a dynamic text blurring feature ("cursor focus")
- **[Profile](/design/concepts/Profile/Profile.md)** - still existed to differentiate users, but no "storing" preferences
- **[FocusStats](/design/concepts/FocusStats/FocusStats.md)** - largely the same, but not too many visualizations were implemented
- **[Sessioning](/design/concepts/Sessioning/Sessioning.md)** - a new concept, for better authenticating and verifying users
Thoughts on the new design:
- Mostly scope-limited and better organized versions of the original concepts
- Much better syncs and security considerations - for example, profile was updated to use hashes rather than plaintext passwords.

## Visual Design

### Changes from Assignment 2 - UI Sketches

[A2 UI Sketches](https://github.com/ryans314/61040-portfolio/blob/main/assignments/assignment2/ui_sketches.md)

The design has changed considerably from the original UI Sketches in A2. Some notable examples include: 
- The vertical sidebar was turned into a horizontal navbar 
- Annotations were changed to appear only on hover, rather than in perpetuity 
- The analytics dashboard lacks most of the original visualizations
- The reading history page no longer exists, and was integrated into the analytics page

However, many of the original principles persisted throughout the design process. For instance:
- The library is still organized into cards of documents, with an add document button + popup
- Navigation and page organization is largely the same
- The vertical scroll in the reading history page is present in that section of the FocusStats page. 

### Changes from Assignment 4b - Visual Study

[Color study](https://github.com/ryans314/FocusReaderFrontEnd/blob/main/visual-study/color-study.png) and [Typography study](https://github.com/ryans314/FocusReaderFrontEnd/blob/main/visual-study/typography-study.png)

With respect to the color study, the final product matches pretty well. The color scheme was derived from the top-left picture, and matches the beige/light academia vibe (the darker color scheme in the middle was quickly found to be too dark and unwelcoming for the app)

For the Typography study, a lot of the ideas went unused. However, the main header font was chosen to be Special Elite, and the main body font was chosen to be Baskerville, both of which are from the typography study. 

