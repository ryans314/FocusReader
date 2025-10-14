# concept: TextSettings

**concept** TextSettings \[User, Document\]

**purpose** store text display settings for documents

**principle** When setting up an account, users can create text display preferences for their account. When reading a document, users can also set text settings for individual documents, which will change how the document is displayed 

**state**  
a set of TextSettings with:  
&emsp;a font Font
&emsp;a fontSize number  
&emsp;a lineHeight number  
&emsp;a bionicEnabled bool  
&emsp;a locale User | Document

**actions**  
createSettings(font: Font, fontSize: Number, lineHeight: Number, bionicEnabled: bool, user: User): (settings: TextSettings)  
&emsp;**requires** there is not already a TextSettings with user  
&emsp;**effects** creates a TextSettings with fontSize, lineHeight, bionicEnabled, and locale=user

editSettings(textSettings: TextSettings, font: Font, fontSize: Number, lineHeight: Number, bionicEnabled: bool): (settings: TextSettings)  
&emsp;**requires** textSettings exists  
&emsp;**effects** changes textSettings to have fontSize, lineHeight, and Number
