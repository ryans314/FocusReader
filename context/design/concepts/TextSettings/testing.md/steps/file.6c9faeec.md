---
timestamp: 'Thu Oct 23 2025 04:32:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_043246.f4380e77.md]]'
content_id: 6c9faeec98437a168d2d8ecccac129ef025142026837e4cdf1c9652b4272eaf7
---

# file: src/TextSettings/TextSettingsConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import TextSettingsConcept from "./TextSettingsConcept.ts";
import { ID } from "@utils/types.ts";
import { Db, MongoClient } from "npm:mongodb";

// Declare shared variables for the database and client.
let dbInstance: Db;
let clientInstance: MongoClient;

// --- Global Hooks for the entire test file ---
Deno.test.beforeAll(async () => {
  [dbInstance, clientInstance] = await testDb();
  console.log("--- Initialized test database for TextSettings Concept Tests ---");
});

Deno.test.afterAll(async () => {
  if (clientInstance) {
    console.log("--- Closing MongoDB client after TextSettings Concept Tests ---");
    await clientInstance.close();
  }
});

// --- Main Test Suite ---
Deno.test("TextSettings Concept Tests Suite", {
  sanitizeResources: false, // Often useful for DB tests that manage external resources
  sanitizeOps: false,       // Often useful for DB tests with async DB operations
}, async (test) => {

  await test.step("Action: createUserSettings - Successful creation", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createUserSettings - Successful creation ---");
    const user = "user:Alice" as ID;
    const font = "Arial";
    const fontSize = 16;
    const lineHeight = 24;

    const result = await textSettingsConcept.createUserSettings({ user, font, fontSize, lineHeight });
    console.log(`  Attempted to create user settings for ${user}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { settings: ID }).settings, "Settings ID should be returned on successful creation.");
    const settingsId = (result as { settings: ID }).settings;

    const userDefaults = await textSettingsConcept._getUserDefaultSettings({ user });
    console.log(`  User's default settings: ${JSON.stringify(userDefaults)}`);
    assertEquals(userDefaults.length, 1, "There should be one default setting for the user.");
    assertEquals(userDefaults[0].settings._id, settingsId, "The linked settings ID should match.");
    assertEquals(userDefaults[0].settings.font, font, "Font should match.");
    assertEquals(userDefaults[0].settings.fontSize, fontSize, "Font size should match.");
    assertEquals(userDefaults[0].settings.lineHeight, lineHeight, "Line height should match.");
  });

  await test.step("Action: createUserSettings - Duplicate default settings for user", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createUserSettings - Duplicate default settings for user ---");
    const user = "user:Bob" as ID;
    await textSettingsConcept.createUserSettings({ user, font: "Verdana", fontSize: 14, lineHeight: 20 });
    console.log(`  Created initial default settings for ${user}.`);

    const result = await textSettingsConcept.createUserSettings({ user, font: "Times New Roman", fontSize: 12, lineHeight: 18 });
    console.log(`  Attempted duplicate creation for ${user}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for duplicate default settings.");
    assertEquals((result as { error: string }).error, `User ${user} already has default text settings.`, "Error message should indicate duplicate default.");
  });

  await test.step("Action: createUserSettings - Invalid inputs", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createUserSettings - Invalid inputs ---");
    const user = "user:Charlie" as ID;

    const testCases = [
      { font: "", fontSize: 16, lineHeight: 24, expectedError: "Invalid font string." },
      { font: "Arial", fontSize: 0, lineHeight: 24, expectedError: "Font size must be a positive number." },
      { font: "Arial", fontSize: 16, lineHeight: 10, expectedError: "Line height must be greater than or equal to font size." },
    ];

    for (const tc of testCases) {
      const result = await textSettingsConcept.createUserSettings({ user, ...tc });
      console.log(`  Test case (font: ${tc.font}, fontSize: ${tc.fontSize}, lineHeight: ${tc.lineHeight}). Result: ${JSON.stringify(result)}`);
      assertExists((result as { error: string }).error, `Expected an error for: ${tc.expectedError}`);
      assertEquals((result as { error: string }).error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
    }
  });

  await test.step("Action: createDocumentSettings - Successful creation", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createDocumentSettings - Successful creation ---");
    const document = "doc:Report" as ID;
    const font = "Helvetica";
    const fontSize = 18;
    const lineHeight = 28;

    const result = await textSettingsConcept.createDocumentSettings({ document, font, fontSize, lineHeight });
    console.log(`  Attempted to create document settings for ${document}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { settings: ID }).settings, "Settings ID should be returned on successful creation.");
    const settingsId = (result as { settings: ID }).settings;

    const docCurrents = await textSettingsConcept._getDocumentCurrentSettings({ document });
    console.log(`  Document's current settings: ${JSON.stringify(docCurrents)}`);
    assertEquals(docCurrents.length, 1, "There should be one current setting for the document.");
    assertEquals(docCurrents[0].settings._id, settingsId, "The linked settings ID should match.");
    assertEquals(docCurrents[0].settings.font, font, "Font should match.");
    assertEquals(docCurrents[0].settings.fontSize, fontSize, "Font size should match.");
    assertEquals(docCurrents[0].settings.lineHeight, lineHeight, "Line height should match.");
  });

  await test.step("Action: createDocumentSettings - Duplicate current settings for document", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createDocumentSettings - Duplicate current settings for document ---");
    const document = "doc:Draft" as ID;
    await textSettingsConcept.createDocumentSettings({ document, font: "Courier New", fontSize: 10, lineHeight: 15 });
    console.log(`  Created initial current settings for ${document}.`);

    const result = await textSettingsConcept.createDocumentSettings({ document, font: "Arial", fontSize: 12, lineHeight: 18 });
    console.log(`  Attempted duplicate creation for ${document}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for duplicate current settings.");
    assertEquals((result as { error: string }).error, `Document ${document} already has current text settings.`, "Error message should indicate duplicate current.");
  });

  await test.step("Action: createDocumentSettings - Invalid inputs", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createDocumentSettings - Invalid inputs ---");
    const document = "doc:Article" as ID;

    const testCases = [
      { font: "", fontSize: 16, lineHeight: 24, expectedError: "Invalid font string." },
      { font: "Arial", fontSize: 0, lineHeight: 24, expectedError: "Font size must be a positive number." },
      { font: "Arial", fontSize: 16, lineHeight: 10, expectedError: "Line height must be greater than or equal to font size." },
    ];

    for (const tc of testCases) {
      const result = await textSettingsConcept.createDocumentSettings({ document, ...tc });
      console.log(`  Test case (font: ${tc.font}, fontSize: ${tc.fontSize}, lineHeight: ${tc.lineHeight}). Result: ${JSON.stringify(result)}`);
      assertExists((result as { error: string }).error, `Expected an error for: ${tc.expectedError}`);
      assertEquals((result as { error: string }).error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
    }
  });

  await test.step("Action: editSettings - Successful modification", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: editSettings - Successful modification ---");
    const user = "user:Dave" as ID;
    const initialFont = "Sans-serif";
    const initialFontSize = 14;
    const initialLineHeight = 20;

    const createResult = await textSettingsConcept.createUserSettings({ user, font: initialFont, fontSize: initialFontSize, lineHeight: initialLineHeight });
    const settingsId = (createResult as { settings: ID }).settings;
    console.log(`  Created initial settings ${settingsId} for ${user}.`);

    const newFont = "Monospace";
    const newFontSize = 15;
    const newLineHeight = 22;

    const editResult = await textSettingsConcept.editSettings({ textSettings: settingsId, font: newFont, fontSize: newFontSize, lineHeight: newLineHeight });
    console.log(`  Attempted to edit settings ${settingsId}. Result: ${JSON.stringify(editResult)}`);
    assertEquals(editResult, {}, "Empty object should be returned on successful edit.");

    const updatedSettings = await textSettingsConcept._getTextSettings({ textSettingsId: settingsId });
    console.log(`  Updated settings details: ${JSON.stringify(updatedSettings)}`);
    assertEquals(updatedSettings.length, 1, "Settings should still exist.");
    assertEquals(updatedSettings[0].settings.font, newFont, "Font should be updated.");
    assertEquals(updatedSettings[0].settings.fontSize, newFontSize, "Font size should be updated.");
    assertEquals(updatedSettings[0].settings.lineHeight, newLineHeight, "Line height should be updated.");
  });

  await test.step("Action: editSettings - Non-existent textSettings ID", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: editSettings - Non-existent textSettings ID ---");
    const nonExistentSettings = "settings:nonExistent" as ID;
    const font = "Arial";
    const fontSize = 16;
    const lineHeight = 24;

    const result = await textSettingsConcept.editSettings({ textSettings: nonExistentSettings, font, fontSize, lineHeight });
    console.log(`  Attempted to edit non-existent settings. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for non-existent settings.");
    assertEquals((result as { error: string }).error, `TextSettings with ID ${nonExistentSettings} not found.`, "Error message should indicate not found.");
  });

  await test.step("Action: editSettings - Invalid inputs", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: editSettings - Invalid inputs ---");
    const user = "user:Eve" as ID;
    const createResult = await textSettingsConcept.createUserSettings({ user, font: "Initial", fontSize: 10, lineHeight: 15 });
    const settingsId = (createResult as { settings: ID }).settings;
    console.log(`  Created initial settings ${settingsId} for ${user}.`);

    const testCases = [
      { font: "", fontSize: 16, lineHeight: 24, expectedError: "Invalid font string." },
      { font: "Arial", fontSize: 0, lineHeight: 24, expectedError: "Font size must be a positive number." },
      { font: "Arial", fontSize: 16, lineHeight: 10, expectedError: "Line height must be greater than or equal to font size." },
    ];

    for (const tc of testCases) {
      const result = await textSettingsConcept.editSettings({ textSettings: settingsId, ...tc });
      console.log(`  Test case (font: ${tc.font}, fontSize: ${tc.fontSize}, lineHeight: ${tc.lineHeight}). Result: ${JSON.stringify(result)}`);
      assertExists((result as { error: string }).error, `Expected an error for: ${tc.expectedError}`);
      assertEquals((result as { error: string }).error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
    }
  });

  await test.step("Query: _getUserDefaultSettings - User with and without default settings", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: _getUserDefaultSettings - User with and without default settings ---");
    const userWithDefaults = "user:Frank" as ID;
    const userWithoutDefaults = "user:Grace" as ID;
    const font = "Open Sans";
    const fontSize = 13;
    const lineHeight = 19;

    const createResult = await textSettingsConcept.createUserSettings({ user: userWithDefaults, font, fontSize, lineHeight });
    const settingsId = (createResult as { settings: ID }).settings;
    console.log(`  Created default settings for ${userWithDefaults}.`);

    const defaultsForFrank = await textSettingsConcept._getUserDefaultSettings({ user: userWithDefaults });
    console.log(`  Defaults for ${userWithDefaults}: ${JSON.stringify(defaultsForFrank)}`);
    assertEquals(defaultsForFrank.length, 1, "Should find default settings for Frank.");
    assertEquals(defaultsForFrank[0].settings._id, settingsId, "Settings ID should match.");

    const defaultsForGrace = await textSettingsConcept._getUserDefaultSettings({ user: userWithoutDefaults });
    console.log(`  Defaults for ${userWithoutDefaults}: ${JSON.stringify(defaultsForGrace)}`);
    assertEquals(defaultsForGrace.length, 0, "Should find no default settings for Grace.");
  });

  await test.step("Query: _getDocumentCurrentSettings - Document with and without current settings", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: _getDocumentCurrentSettings - Document with and without current settings ---");
    const docWithCurrents = "doc:Project" as ID;
    const docWithoutCurrents = "doc:Idea" as ID;
    const font = "Roboto";
    const fontSize = 11;
    const lineHeight = 16;

    const createResult = await textSettingsConcept.createDocumentSettings({ document: docWithCurrents, font, fontSize, lineHeight });
    const settingsId = (createResult as { settings: ID }).settings;
    console.log(`  Created current settings for ${docWithCurrents}.`);

    const currentsForProject = await textSettingsConcept._getDocumentCurrentSettings({ document: docWithCurrents });
    console.log(`  Currents for ${docWithCurrents}: ${JSON.stringify(currentsForProject)}`);
    assertEquals(currentsForProject.length, 1, "Should find current settings for Project.");
    assertEquals(currentsForProject[0].settings._id, settingsId, "Settings ID should match.");

    const currentsForIdea = await textSettingsConcept._getDocumentCurrentSettings({ document: docWithoutCurrents });
    console.log(`  Currents for ${docWithoutCurrents}: ${JSON.stringify(currentsForIdea)}`);
    assertEquals(currentsForIdea.length, 0, "Should find no current settings for Idea.");
  });

  await test.step("Query: _getTextSettings - Existing and non-existent settings ID", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: _getTextSettings - Existing and non-existent settings ID ---");
    const user = "user:Harry" as ID;
    const font = "Inconsolata";
    const fontSize = 12;
    const lineHeight = 18;

    const createResult = await textSettingsConcept.createUserSettings({ user, font, fontSize, lineHeight });
    const existingSettingsId = (createResult as { settings: ID }).settings;
    console.log(`  Created settings with ID: ${existingSettingsId}.`);

    const foundSettings = await textSettingsConcept._getTextSettings({ textSettingsId: existingSettingsId });
    console.log(`  Found settings for ${existingSettingsId}: ${JSON.stringify(foundSettings)}`);
    assertEquals(foundSettings.length, 1, "Should find the existing settings.");
    assertEquals(foundSettings[0].settings.font, font, "Font should match.");

    const nonExistentSettingsId = "settings:anotherNonExistent" as ID;
    const notFoundSettings = await textSettingsConcept._getTextSettings({ textSettingsId: nonExistentSettingsId });
    console.log(`  Found settings for ${nonExistentSettingsId}: ${JSON.stringify(notFoundSettings)}`);
    assertEquals(notFoundSettings.length, 0, "Should find no settings for non-existent ID.");
  });

  await test.step("Principle Trace: Default settings loaded for new document, then customized", async () => {
    // --- Per-step setup for isolation ---
    const textSettingsConcept = new TextSettingsConcept(dbInstance);
    await textSettingsConcept.clearCollections();
    console.log("  Clearing TextSettingsConcept collections before test step...");
    // --- End per-step setup ---

    console.log("\n--- Principle Trace: Default settings loaded for new document, then customized ---");

    const user = "user:PrincipleUser" as ID;
    const document = "doc:PrincipleDoc" as ID;

    // Default settings for the user
    const defaultFont = "DefaultFont";
    const defaultFontSize = 10;
    const defaultLineHeight = 15;

    // Customized settings for the document
    const customFont = "CustomFont";
    const customFontSize = 12;
    const customLineHeight = 18;

    console.log(`1. Action: createUserSettings for ${user}`);
    const createUserSettingsResult = await textSettingsConcept.createUserSettings({
      user,
      font: defaultFont,
      fontSize: defaultFontSize,
      lineHeight: defaultLineHeight,
    });
    assertExists((createUserSettingsResult as { settings: ID }).settings, "User default settings should be created.");
    const userDefaultSettingsId = (createUserSettingsResult as { settings: ID }).settings;
    console.log(`   Effect: User ${user} now has default TextSettings ID: ${userDefaultSettingsId}`);
    const verifiedUserDefault = await textSettingsConcept._getUserDefaultSettings({ user });
    assertEquals(verifiedUserDefault[0].settings.font, defaultFont);

    console.log(`2. Action: simulate 'opening a new document' by directly calling createDocumentSettings.`);
    // In a real app, this would be triggered by a sync from a Document concept upon document creation.
    // For this test, we directly call the TextSettings action that sync would invoke.
    const createDocSettingsResult = await textSettingsConcept.createDocumentSettings({
      document,
      font: defaultFont, // Assuming sync applies default values here
      fontSize: defaultFontSize,
      lineHeight: defaultLineHeight,
    });
    assertExists((createDocSettingsResult as { settings: ID }).settings, "Document settings should be created.");
    const documentCurrentSettingsId = (createDocSettingsResult as { settings: ID }).settings;
    console.log(`   Effect: Document ${document} now has current TextSettings ID: ${documentCurrentSettingsId}, initialized with user defaults.`);
    const verifiedDocCurrent = await textSettingsConcept._getDocumentCurrentSettings({ document });
    assertEquals(verifiedDocCurrent[0].settings.font, defaultFont);

    console.log(`3. Action: editSettings to customize document settings for ${document}`);
    const editSettingsResult = await textSettingsConcept.editSettings({
      textSettings: documentCurrentSettingsId,
      font: customFont,
      fontSize: customFontSize,
      lineHeight: customLineHeight,
    });
    assertEquals(editSettingsResult, {}, "Editing document settings should succeed.");
    console.log(`   Effect: Document ${document}'s settings (ID: ${documentCurrentSettingsId}) updated to custom values.`);

    console.log(`4. Verification: Check that document settings are now customized.`);
    const finalDocSettings = await textSettingsConcept._getDocumentCurrentSettings({ document });
    assertEquals(finalDocSettings.length, 1, "Document should still have current settings.");
    assertEquals(finalDocSettings[0].settings.font, customFont, "Document font should be customized.");
    assertEquals(finalDocSettings[0].settings.fontSize, customFontSize, "Document font size should be customized.");
    assertEquals(finalDocSettings[0].settings.lineHeight, customLineHeight, "Document line height should be customized.");
    console.log(`   Result: Document ${document} settings are now: ${JSON.stringify(finalDocSettings[0].settings)}`);

    console.log("\nPrinciple fulfilled: User created default settings, new document loaded them, and then document-specific settings were customized and remembered.");
  });
});
```
