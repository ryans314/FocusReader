# concept: TextSettings

**concept** TextSettings \[User, Document\]

**purpose** store text display settings for documents

**principle** When setting up an account, users can create text display preferences for their account. When reading a document, users can also set text settings for individual documents, which will change how the document is displayed 

**state**  
a set of TextSettings with:  
- a font Font
- a fontSize number  
- a lineHeight number  
- a bionicEnabled bool  
- a locale User | Document

**actions**  
createSettings(font: Font, fontSize: Number, lineHeight: Number, bionicEnabled: bool, user: User): (settings: TextSettings)  
- **requires** there is not already a TextSettings with user  
- **effects** creates a TextSettings with fontSize, lineHeight, bionicEnabled, and locale=user

editSettings(textSettings: TextSettings, font: Font, fontSize: Number, lineHeight: Number, bionicEnabled: bool): (settings: TextSettings)  
- **requires** textSettings exists  
- **effects** changes textSettings to have fontSize, lineHeight, and Number
