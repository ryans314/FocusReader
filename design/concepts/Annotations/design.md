# Annotation Changes

1. Added search and searchLLM actions
	1. Done in Assignment 3
	2. Changed because searching is a very useful feature that many users may want to do
2. Changed color from a generic to a String
	1. Since I'm not implementing a concept for generic, it is changed in the state to just be a String. When referenced in actions, it must be a valid HTML color string. 
3. Added an updateAnnotation action
	1. Very important piece of functionality that I missed in Assignment 2. Users often want to edit their annotations, change the colors, move the highlight, add a tag, etc. This allows them to do that without having to delete and recreate the annotation. 
4. Added a set of Documents with a set of Annotations and creator User
	1. Better separation of concerns to move annotations out of the Library concept and into the Annotation concept 