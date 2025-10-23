```
--- Initialized test database for TextSettings Concept Tests ---
  Clearing TextSettingsConcept collections before test step...
--- Test: createUserSettings - Successful creation ---
  Attempted to create user settings for user:Alice. Result: {"settings":"019a10c0-0dd1-795b-8801-fbcb2cb38be2"}
    ✅ Action returned successfully.
    ✅ Settings ID exists in result.
  User's default settings: [{"settings":{"_id":"019a10c0-0dd1-795b-8801-fbcb2cb38be2","font":"Arial","fontSize":16,"lineHeight":24}}]
    ✅ User defaults query returned successfully.
    ✅ Correct number of default settings found.
    ✅ Linked settings ID matches.
    ✅ Font matches.
    ✅ Font size matches.
    ✅ Line height matches.
  Clearing TextSettingsConcept collections before test step...
--- Test: createUserSettings - Duplicate default settings for user ---
  Created initial default settings for user:Bob.
  Attempted duplicate creation for user:Bob. Result: {"error":"User user:Bob already has default text settings."}
    ✅ Expected error returned for duplicate default settings.
  Clearing TextSettingsConcept collections before test step...
--- Test: createUserSettings - Invalid inputs ---
  Test case (font: , fontSize: 16, lineHeight: 24). Result: {"error":"Invalid font string."}
    ✅ Expected error 'Invalid font string.' returned.
  Test case (font: Arial, fontSize: 0, lineHeight: 24). Result: {"error":"Font size must be a positive number."}
    ✅ Expected error 'Font size must be a positive number.' returned.
  Test case (font: Arial, fontSize: 16, lineHeight: 10). Result: {"error":"Line height must be greater than or equal to font size."}
    ✅ Expected error 'Line height must be greater than or equal to font size.' returned.
  Clearing TextSettingsConcept collections before test step...
--- Test: createDocumentSettings - Successful creation ---
  Attempted to create document settings for doc:Report. Result: {"settings":"019a10c0-0f6f-7300-8d6a-71e484e12f29"}
    ✅ Action returned successfully.
    ✅ Settings ID exists in result.
  Document's current settings: [{"settings":{"_id":"019a10c0-0f6f-7300-8d6a-71e484e12f29","font":"Helvetica","fontSize":18,"lineHeight":28}}]
    ✅ Document current settings query returned successfully.
    ✅ Correct number of current settings found.
    ✅ Linked settings ID matches.
    ✅ Font matches.
    ✅ Font size matches.
    ✅ Line height matches.
  Clearing TextSettingsConcept collections before test step...
--- Test: createDocumentSettings - Duplicate current settings for document ---
  Created initial current settings for doc:Draft.
  Attempted duplicate creation for doc:Draft. Result: {"error":"Document doc:Draft already has current text settings."}
    ✅ Expected error returned for duplicate current settings.
  Clearing TextSettingsConcept collections before test step...
--- Test: createDocumentSettings - Invalid inputs ---
  Test case (font: , fontSize: 16, lineHeight: 24). Result: {"error":"Invalid font string."}
    ✅ Expected error 'Invalid font string.' returned.
  Test case (font: Arial, fontSize: 0, lineHeight: 24). Result: {"error":"Font size must be a positive number."}
    ✅ Expected error 'Font size must be a positive number.' returned.
  Test case (font: Arial, fontSize: 16, lineHeight: 10). Result: {"error":"Line height must be greater than or equal to font size."}
    ✅ Expected error 'Line height must be greater than or equal to font size.' returned.
  Clearing TextSettingsConcept collections before test step...
--- Test: editSettings - Successful modification ---
    ✅ Initial user settings created successfully.
  Created initial settings 019a10c0-10ee-77b1-9381-787fd2f73333 for user:Dave.
  Attempted to edit settings 019a10c0-10ee-77b1-9381-787fd2f73333. Result: {}
    ✅ Edit action returned successfully.
    ✅ Empty object returned on successful edit.
  Updated settings details: [{"settings":{"_id":"019a10c0-10ee-77b1-9381-787fd2f73333","font":"Monospace","fontSize":15,"lineHeight":22}}]
    ✅ Updated settings query returned successfully.
    ✅ Settings still exist.
    ✅ Font updated correctly.
    ✅ Font size updated correctly.
    ✅ Line height updated correctly.
  Clearing TextSettingsConcept collections before test step...
--- Test: editSettings - Non-existent textSettings ID ---
  Attempted to edit non-existent settings. Result: {"error":"TextSettings with ID settings:nonExistent not found."}
    ✅ Expected error returned for non-existent settings.
  Clearing TextSettingsConcept collections before test step...
--- Test: editSettings - Invalid inputs ---
  Created initial settings 019a10c0-1201-7b6b-a118-ab94f15b34d8 for user:Eve.
  Test case (font: , fontSize: 16, lineHeight: 24). Result: {"error":"Invalid font string."}
    ✅ Expected error 'Invalid font string.' returned.
  Test case (font: Arial, fontSize: 0, lineHeight: 24). Result: {"error":"Font size must be a positive number."}
    ✅ Expected error 'Font size must be a positive number.' returned.
  Test case (font: Arial, fontSize: 16, lineHeight: 10). Result: {"error":"Line height must be greater than or equal to font size."}
    ✅ Expected error 'Line height must be greater than or equal to font size.' returned.
  Clearing TextSettingsConcept collections before test step...
--- Test: _getUserDefaultSettings - User with and without default settings ---
  Created default settings for user:Frank.
  Defaults for user:Frank: [{"settings":{"_id":"019a10c0-12c8-707b-8e6d-8a109b53f5d6","font":"Open Sans","fontSize":13,"lineHeight":19}}]
    ✅ Query for Frank's defaults returned successfully.
    ✅ Frank's default settings found.
    ✅ Frank's settings ID matches.
  Defaults for user:Grace: []
    ✅ Query for Grace's defaults returned successfully.
    ✅ No default settings found for Grace, as expected.
  Clearing TextSettingsConcept collections before test step...
--- Test: _getDocumentCurrentSettings - Document with and without current settings ---
  Created current settings for doc:Project.
  Currents for doc:Project: [{"settings":{"_id":"019a10c0-137d-7be7-94d6-656b564c981b","font":"Roboto","fontSize":11,"lineHeight":16}}]
    ✅ Query for Project's current settings returned successfully.
    ✅ Project's current settings found.
    ✅ Project's settings ID matches.
  Currents for doc:Idea: []
    ✅ Query for Idea's current settings returned successfully.
    ✅ No current settings found for Idea, as expected.
  Clearing TextSettingsConcept collections before test step...
--- Test: _getTextSettings - Existing and non-existent settings ID ---
  Created settings with ID: 019a10c0-1433-7391-bc74-38c3b6a7c024.
  Found settings for 019a10c0-1433-7391-bc74-38c3b6a7c024: [{"settings":{"_id":"019a10c0-1433-7391-bc74-38c3b6a7c024","font":"Inconsolata","fontSize":12,"lineHeight":18}}]
    ✅ Query for existing settings returned successfully.
    ✅ Existing settings found.
    ✅ Font matches.
  Found settings for settings:anotherNonExistent: []
    ✅ Query for non-existent settings returned successfully.
    ✅ No settings found for non-existent ID, as expected.
  Clearing TextSettingsConcept collections before test step...

--- Principle Trace: Default settings loaded for new document, then customized ---
1. Action: createUserSettings for user:PrincipleUser
    ✅ User default settings created.
   Effect: User user:PrincipleUser now has default TextSettings ID: 019a10c0-14f4-7a2e-ac08-f89402b3a353
    ✅ Verified user default font matches.
2. Action: simulate 'opening a new document' by directly calling createDocumentSettings.
    ✅ Document settings created.
   Effect: Document doc:PrincipleDoc now has current TextSettings ID: 019a10c0-1557-7980-90c6-bebf06e32f21, initialized with user defaults.
    ✅ Verified document current font initialized from user default.
3. Action: editSettings to customize document settings for doc:PrincipleDoc
    ✅ Editing document settings succeeded.
    ✅ Empty object returned on successful edit.
   Effect: Document doc:PrincipleDoc's settings (ID: 019a10c0-1557-7980-90c6-bebf06e32f21) updated to custom values.
4. Verification: Check that document settings are now customized.
   Result: Document doc:PrincipleDoc settings are now: {"_id":"019a10c0-1557-7980-90c6-bebf06e32f21","font":"CustomFont","fontSize":12,"lineHeight":18}
    ✅ All document settings are customized and verified.

Principle fulfilled: User created default settings, new document loaded them, and then document-specific settings were customized and remembered.
--- Closing MongoDB client after TextSettings Concept Tests ---

```