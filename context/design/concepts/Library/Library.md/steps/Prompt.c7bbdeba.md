---
timestamp: 'Mon Oct 20 2025 00:18:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_001855.89bfbbb3.md]]'
content_id: c7bbdeba5a056ee513c34ebcf8f866ee3920d28a300e59a3c55e8733c0c4afba
---

# Prompt: Thank you. I am a little concerned about separation of concerns. In my mind, there are three partial places that could hold functionality, but only 1 currently exists. There is the Library, whose purpose is to store a list of documents. This purpose is essentially a glorified List, which goes against a guideline in the assignment: "A concept that is nothing more than a data structure without any interesting behavior is suspect, and is usually a sign that the data structure should have been incorporated into another concept." The uniqueness of the Library comes from the fact that it "implements" the Document. However, I am not sure if Document would warrant its own concept. Similarly, you divide Document and EpubFile into two separate concepts, where EpubFile is a concept that essentially represents a .epub file. I'm not sure how to divide the three of them, which should or shouldn't exist, and how they should be defined. Do you have thoughts?
