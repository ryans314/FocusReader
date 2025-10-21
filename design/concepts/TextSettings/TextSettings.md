# concept: TextSettings

[@concept-design-overview](/design/background/concept-design-overview.md) 

[@concept-specifications](/design/background/concept-specifications.md)

[@concept-state](/design/background/detailed/concept-state.md)

[@concept-rubric](/design/background/detailed/concept-rubric.md)

**concept** TextSettings \[User, Document, Font\]

**purpose** allow users to customize and set different text/display settings for each of their documents

**principle** When setting up an account, users can create default text display preferences for their account. When opening a new document, users will have their default display settings loaded in. Users can also change their text settings for each documents, which change how the document is displayed and be remembered between sessions. 

**state**  
a set of TextSettings with:  
- a font Font
- a fontSize number  
- a lineHeight number 
- a locale User | Document

a set of Users with:
- a default TextSettings

a set of Documents with:
- a current TextSettings

**actions**  

createSettings(font: Font, fontSize: Number, lineHeight: Number, locale: User | Document): (settings: TextSettings)  
- **requires** there is not already a TextSettings with locale, and font is a valid font
- **effects** 
	- creates settings with font, fontSize, lineHeight, and locale
	- If locale is a User, set's user's default to settings
	- if locale is a Document, set document's current to settings

editSettings(textSettings: TextSettings, font: Font, fontSize: Number, lineHeight: Number): (settings: TextSettings)  
- **requires** textSettings exists  
- **effects** changes textSettings to have fontSize, lineHeight, and font
