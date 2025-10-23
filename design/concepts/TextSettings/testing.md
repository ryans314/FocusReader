[@TextSettings](TextSettings.md)

[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@chosen-testing-implementation](/context/design/concepts/Profile/testing.md/steps/response.8e1ca84d.md)

# Test: TextSettings
# response:

# file: src/TextSettings/TextSettingsConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "TextSettings" + ".";

// Generic types of this concept
type User = ID;
type Document = ID; // Assuming Document is also an external ID type

// --- State Interfaces ---

/**
 * a set of TextSettings with:
 *   a font String
 *   a fontSize number
 *   a lineHeight number
 */
interface TextSettingsData {
  _id: ID; // Represents the ID of a specific TextSettings configuration
  font: string;
  fontSize: number;
  lineHeight: number;
}

/**
 * a set of Users with:
 *   a default TextSettings (represented by its ID)
 *
 * This collection maps a User ID to their default TextSettings ID.
 */
interface UserDefaultSettings {
  _id: User; // User ID
  defaultTextSettingsId: ID; // ID of the TextSettingsData document
}

/**
 * a set of Documents with:
 *   a current TextSettings (represented by its ID)
 *
 * This collection maps a Document ID to its currently applied TextSettings ID.
 */
interface DocumentCurrentSettings {
  _id: Document; // Document ID
  currentTextSettingsId: ID; // ID of the TextSettingsData document
}

/**
 * TextSettings Concept
 *
 * **purpose** allow users to customize and set different text/display settings
 * for each of their documents.
 *
 * **principle** When setting up an account, users can create default text display preferences
 * for their account. When opening a new document, users will have their default
 * display settings loaded in. Users can also change their text settings for
 * each document, which change how the document is displayed and be remembered
 * between sessions.
 */
export default class TextSettingsConcept {
  private textSettingsCollection: Collection<TextSettingsData>;
  private userDefaultsCollection: Collection<UserDefaultSettings>;
  private documentCurrentsCollection: Collection<DocumentCurrentSettings>;

  constructor(private readonly db: Db) {
    this.textSettingsCollection = this.db.collection(PREFIX + "textSettings");
    this.userDefaultsCollection = this.db.collection(PREFIX + "userDefaults");
    this.documentCurrentsCollection = this.db.collection(PREFIX + "documentCurrents");
  }

  /**
   * Clears all collections managed by the TextSettingsConcept.
   * This is primarily for testing purposes to ensure a clean state before each test step.
   */
  async clearCollections(): Promise<void> {
    await this.textSettingsCollection.deleteMany({});
    await this.userDefaultsCollection.deleteMany({});
    await this.documentCurrentsCollection.deleteMany({});
  }

  // --- Helper for validation ---
  private isValidFont(font: string): boolean {
    // A basic check for valid HTML font strings.
    // In a real application, this would be more robust (e.g., checking against a list of safe fonts).
    return typeof font === 'string' && font.length > 0;
  }

  private isValidFontSize(fontSize: number): boolean {
    return typeof fontSize === 'number' && fontSize > 0;
  }

  private isValidLineHeight(lineHeight: number, fontSize: number): boolean {
    return typeof lineHeight === 'number' && lineHeight >= fontSize;
  }

  // --- Actions ---

  /**
   * createUserSettings(font: String, fontSize: Number, lineHeight: Number, user: User): (settings: ID | {error: string})
   *
   * **requires**
   *   - user exists (implicitly handled by external concept providing User ID)
   *   - there is not already a default TextSettings for this user
   *   - font is a valid HTML font string
   *   - fontSize > 0
   *   - lineHeight >= fontSize
   * **effects**
   *   - Creates a new TextSettings configuration with the given font, fontSize, and lineHeight.
   *   - Associates this new configuration as the default for the specified user.
   *   - Returns the ID of the created TextSettings configuration.
   *
   * Note on the original spec: The effect "if locale is a Document, set document's current to settings"
   * is omitted here. This is because directly modifying another concept's state (`Document`'s `current TextSettings`)
   * from within `TextSettingsConcept` violates the principle of Concept Independence.
   * Such interactions should be handled by external synchronizations (syncs).
   */
  async createUserSettings(
    { font, fontSize, lineHeight, user }: {
      font: string;
      fontSize: number;
      lineHeight: number;
      user: User;
    },
  ): Promise<{ settings: ID } | { error: string }> {
    // Requires checks
    if (!this.isValidFont(font)) {
      return { error: "Invalid font string." };
    }
    if (!this.isValidFontSize(fontSize)) {
      return { error: "Font size must be a positive number." };
    }
    if (!this.isValidLineHeight(lineHeight, fontSize)) {
      return { error: "Line height must be greater than or equal to font size." };
    }

    const existingDefault = await this.userDefaultsCollection.findOne({ _id: user });
    if (existingDefault) {
      return { error: `User ${user} already has default text settings.` };
    }

    // Effects
    const newSettingsId = freshID();
    const newSettings: TextSettingsData = {
      _id: newSettingsId,
      font,
      fontSize,
      lineHeight,
    };

    try {
      await this.textSettingsCollection.insertOne(newSettings);
      await this.userDefaultsCollection.insertOne({
        _id: user,
        defaultTextSettingsId: newSettingsId,
      });
      return { settings: newSettingsId };
    } catch (e) {
      console.error("Error creating user settings:", e);
      return { error: "Failed to create user settings due to database error." };
    }
  }

  /**
   * createDocumentSettings(font: String, fontSize: Number, lineHeight: Number, document: Document): (settings: ID | {error: string})
   *
   * **requires**
   *   - document exists (implicitly handled by external concept providing Document ID)
   *   - there is not already a current TextSettings for this document
   *   - font is a valid HTML font string
   *   - fontSize > 0
   *   - lineHeight >= fontSize
   * **effects**
   *   - Creates a new TextSettings configuration with the given font, fontSize, and lineHeight.
   *   - Associates this new configuration as the current settings for the specified document.
   *   - Returns the ID of the created TextSettings configuration.
   */
  async createDocumentSettings(
    { font, fontSize, lineHeight, document }: {
      font: string;
      fontSize: number;
      lineHeight: number;
      document: Document;
    },
  ): Promise<{ settings: ID } | { error: string }> {
    // Requires checks
    if (!this.isValidFont(font)) {
      return { error: "Invalid font string." };
    }
    if (!this.isValidFontSize(fontSize)) {
      return { error: "Font size must be a positive number." };
    }
    if (!this.isValidLineHeight(lineHeight, fontSize)) {
      return { error: "Line height must be greater than or equal to font size." };
    }

    const existingCurrent = await this.documentCurrentsCollection.findOne({ _id: document });
    if (existingCurrent) {
      return { error: `Document ${document} already has current text settings.` };
    }

    // Effects
    const newSettingsId = freshID();
    const newSettings: TextSettingsData = {
      _id: newSettingsId,
      font,
      fontSize,
      lineHeight,
    };

    try {
      await this.textSettingsCollection.insertOne(newSettings);
      await this.documentCurrentsCollection.insertOne({
        _id: document,
        currentTextSettingsId: newSettingsId,
      });
      return { settings: newSettingsId };
    } catch (e) {
      console.error("Error creating document settings:", e);
      return { error: "Failed to create document settings due to database error." };
    }
  }

  /**
   * editSettings(textSettings: ID, font: String, fontSize: Number, lineHeight: Number): Empty | {error: string}
   *
   * **requires**
   *   - textSettings exists (identified by textSettingsId)
   *   - font is a valid HTML font string
   *   - fontSize > 0
   *   - lineHeight >= fontSize
   * **effects**
   *   - Modifies the TextSettings configuration identified by textSettingsId to have the new font, fontSize, and lineHeight.
   */
  async editSettings(
    { textSettings: textSettingsId, font, fontSize, lineHeight }: {
      textSettings: ID; // Renamed from textSettings to textSettingsId for clarity in TS
      font: string;
      fontSize: number;
      lineHeight: number;
    },
  ): Promise<Empty | { error: string }> {
    // Requires checks
    const existingSettings = await this.textSettingsCollection.findOne({ _id: textSettingsId });
    if (!existingSettings) {
      return { error: `TextSettings with ID ${textSettingsId} not found.` };
    }
    if (!this.isValidFont(font)) {
      return { error: "Invalid font string." };
    }
    if (!this.isValidFontSize(fontSize)) {
      return { error: "Font size must be a positive number." };
    }
    if (!this.isValidLineHeight(lineHeight, fontSize)) {
      return { error: "Line height must be greater than or equal to font size." };
    }

    // Effects
    try {
      await this.textSettingsCollection.updateOne(
        { _id: textSettingsId },
        { $set: { font, fontSize, lineHeight } },
      );
      return {};
    } catch (e) {
      console.error("Error editing settings:", e);
      return { error: "Failed to edit settings due to database error." };
    }
  }

  // --- Queries ---

  /**
   * _getUserDefaultSettings(user: User): (settings: TextSettingsData)[] | {error: string}
   *
   * **requires**
   *   - user exists (implicitly handled)
   * **effects**
   *   - Returns the default TextSettings configuration for the given user, if one exists.
   *   - Returns an empty array if no default settings are found for the user.
   */
  async _getUserDefaultSettings(
    { user }: { user: User },
  ): Promise<{ settings: TextSettingsData }[] | { error: string }> {
    try {
      const userDefault = await this.userDefaultsCollection.findOne({ _id: user });
      if (userDefault) {
        const settings = await this.textSettingsCollection.findOne({ _id: userDefault.defaultTextSettingsId });
        if (settings) {
          return [{ settings }];
        }
      }
      return []; // No default settings found, return empty array
    } catch (e) {
      console.error("Error getting user default settings:", e);
      return { error: "Failed to retrieve user default settings." };
    }
  }

  /**
   * _getDocumentCurrentSettings(document: Document): (settings: TextSettingsData)[] | {error: string}
   *
   * **requires**
   *   - document exists (implicitly handled)
   * **effects**
   *   - Returns the current TextSettings configuration for the given document, if one exists.
   *   - Returns an empty array if no current settings are found for the document.
   */
  async _getDocumentCurrentSettings(
    { document }: { document: Document },
  ): Promise<{ settings: TextSettingsData }[] | { error: string }> {
    try {
      const docCurrent = await this.documentCurrentsCollection.findOne({ _id: document });
      if (docCurrent) {
        const settings = await this.textSettingsCollection.findOne({ _id: docCurrent.currentTextSettingsId });
        if (settings) {
          return [{ settings }];
        }
      }
      return []; // No current settings found, return empty array
    } catch (e) {
      console.error("Error getting document current settings:", e);
      return { error: "Failed to retrieve document current settings." };
    }
  }

  /**
   * _getTextSettings(textSettingsId: ID): (settings: TextSettingsData)[] | {error: string}
   *
   * **requires**
   *   - textSettingsId exists
   * **effects**
   *   - Returns the TextSettings configuration identified by the given ID.
   *   - Returns an empty array if the TextSettings configuration is not found.
   */
  async _getTextSettings(
    { textSettingsId }: { textSettingsId: ID },
  ): Promise<{ settings: TextSettingsData }[] | { error: string }> {
    try {
      const settings = await this.textSettingsCollection.findOne({ _id: textSettingsId });
      if (settings) {
        return [{ settings }];
      }
      return []; // Settings not found
    } catch (e) {
      console.error("Error getting text settings:", e);
      return { error: "Failed to retrieve text settings." };
    }
  }
}
```

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

# trace:

**Principle Trace: Default settings loaded for new document, then customized**

This trace demonstrates the core principle of the `TextSettings` concept: a user sets up default preferences, a new document picks them up, and then the user can customize those settings specifically for that document, with the changes being remembered.

1.  **Action: `createUserSettings`** (for `user:PrincipleUser`)
    *   **Input:** `user: "user:PrincipleUser"`, `font: "DefaultFont"`, `fontSize: 10`, `lineHeight: 15`
    *   **Requires:** User "user:PrincipleUser" exists (assumed by external concept), no default settings yet for this user, valid font/size/height. (All met)
    *   **Effects:** A new `TextSettings` document is created in `textSettingsCollection` with the provided font, size, and height. An entry in `userDefaultsCollection` is created linking "user:PrincipleUser" to this new `TextSettings` ID. The ID of the new settings is returned.
    *   **Verification:** Query `_getUserDefaultSettings("user:PrincipleUser")` to confirm that the default settings are correctly stored and match the input values.

2.  **Simulated Sync Action: `createDocumentSettings`** (for `doc:PrincipleDoc`)
    *   *(Note: This step simulates the behavior that would typically be orchestrated by a `sync` that triggers when a `Document` is created by a `User`, and retrieves that `User`'s default settings from this `TextSettings` concept.)*
    *   **Input:** `document: "doc:PrincipleDoc"`, `font: "DefaultFont"`, `fontSize: 10`, `lineHeight: 15` (These are the values fetched from the user's default settings via the hypothetical sync).
    *   **Requires:** Document "doc:PrincipleDoc" exists (assumed by external concept), no current settings yet for this document, valid font/size/height. (All met)
    *   **Effects:** A new `TextSettings` document is created in `textSettingsCollection` (if a distinct one is needed for the document, or possibly reusing the user's default `TextSettings` ID if the concept allows direct reuse). An entry in `documentCurrentsCollection` is created linking "doc:PrincipleDoc" to the `TextSettings` ID, reflecting the user's default settings. The ID of the new settings is returned.
    *   **Verification:** Query `_getDocumentCurrentSettings("doc:PrincipleDoc")` to confirm that the document's current settings are set and match the user's default values.

3.  **Action: `editSettings`** (to customize `doc:PrincipleDoc`)
    *   **Input:** `textSettings: <documentCurrentSettingsId>`, `font: "CustomFont"`, `fontSize: 12`, `lineHeight: 18`
    *   **Requires:** `documentCurrentSettingsId` exists, valid font/size/height. (All met)
    *   **Effects:** The `TextSettings` document identified by `documentCurrentSettingsId` in `textSettingsCollection` is updated to have `font: "CustomFont"`, `fontSize: 12`, `lineHeight: 18`. An empty object `{}` is returned on success.
    *   **Verification:** Query `_getDocumentCurrentSettings("doc:PrincipleDoc")` again to confirm that the document's current settings now reflect the `CustomFont`, `customFontSize`, and `customLineHeight`.

This trace confirms that:
*   Users can establish personal default text settings.
*   Documents can be initialized with these defaults (via an external trigger).
*   Document-specific settings can then be modified and are persisted, overriding the user's default for that particular document.
# Prompt: I'm getting some typescript errors, for example on line 73 of the testing file, userDefaults.length throws an error because Property 'length' does not exist on type '\{ settings: TextSettingsData; \}\[\] | \{ error: string; \}'.
# response:

You are absolutely right to point out that TypeScript error! My apologies for that oversight. The issue is indeed that the return types of the actions and queries in `TextSettingsConcept` are union types (e.g., `Promise<{ settings: ID } | { error: string }>`) and need proper type narrowing before accessing properties like `length` or `settings`.

The previous implementation of the test file used `(result as { type: T })` casts, which suppresses TypeScript errors but doesn't provide actual type safety. A more robust approach involves using type guards or helper assertions to safely narrow the type before accessing its properties.

Here's the corrected `TextSettingsConcept.test.ts` file, incorporating `isError` and `assertSuccessfulResult` helper functions for safer type handling:

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

// --- Type Guards and Helper Assertions for robust testing ---
type ResultWithError = { error: string };

function isError(response: any): response is ResultWithError {
  return typeof response === 'object' && response !== null && 'error' in response && typeof response.error === 'string';
}

function assertSuccessfulAction<T>(
  result: T | ResultWithError,
  message?: string,
): asserts result is T {
  if (isError(result)) {
    throw new Error(message || `Expected successful action, but got error: ${result.error}`);
  }
}

function assertSuccessfulSettingsQuery(
  result: { settings: TextSettingsData }[] | ResultWithError,
  message?: string,
): asserts result is { settings: TextSettingsData }[] {
  if (isError(result)) {
    throw new Error(message || `Expected successful settings query, but got error: ${result.error}`);
  }
}

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

    assertSuccessfulAction(result, "Expected successful creation of user settings.");
    assertExists(result.settings, "Settings ID should be returned on successful creation.");
    const settingsId = result.settings; // settingsId is now correctly typed as ID

    const userDefaultsResult = await textSettingsConcept._getUserDefaultSettings({ user });
    console.log(`  User's default settings: ${JSON.stringify(userDefaultsResult)}`);
    assertSuccessfulSettingsQuery(userDefaultsResult, "Expected successful retrieval of user defaults.");
    assertEquals(userDefaultsResult.length, 1, "There should be one default setting for the user.");
    assertEquals(userDefaultsResult[0].settings._id, settingsId, "The linked settings ID should match.");
    assertEquals(userDefaultsResult[0].settings.font, font, "Font should match.");
    assertEquals(userDefaultsResult[0].settings.fontSize, fontSize, "Font size should match.");
    assertEquals(userDefaultsResult[0].settings.lineHeight, lineHeight, "Line height should match.");
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

    if (!isError(result)) {
      throw new Error("Expected an error for duplicate default settings, but got success.");
    }
    assertEquals(result.error, `User ${user} already has default text settings.`, "Error message should indicate duplicate default.");
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
      if (!isError(result)) {
        throw new Error(`Expected an error for invalid input, but got success for: ${JSON.stringify(tc)}`);
      }
      assertEquals(result.error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
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

    assertSuccessfulAction(result, "Expected successful creation of document settings.");
    assertExists(result.settings, "Settings ID should be returned on successful creation.");
    const settingsId = result.settings;

    const docCurrentsResult = await textSettingsConcept._getDocumentCurrentSettings({ document });
    console.log(`  Document's current settings: ${JSON.stringify(docCurrentsResult)}`);
    assertSuccessfulSettingsQuery(docCurrentsResult, "Expected successful retrieval of document current settings.");
    assertEquals(docCurrentsResult.length, 1, "There should be one current setting for the document.");
    assertEquals(docCurrentsResult[0].settings._id, settingsId, "The linked settings ID should match.");
    assertEquals(docCurrentsResult[0].settings.font, font, "Font should match.");
    assertEquals(docCurrentsResult[0].settings.fontSize, fontSize, "Font size should match.");
    assertEquals(docCurrentsResult[0].settings.lineHeight, lineHeight, "Line height should match.");
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

    if (!isError(result)) {
      throw new Error("Expected an error for duplicate current settings, but got success.");
    }
    assertEquals(result.error, `Document ${document} already has current text settings.`, "Error message should indicate duplicate current.");
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
      if (!isError(result)) {
        throw new Error(`Expected an error for invalid input, but got success for: ${JSON.stringify(tc)}`);
      }
      assertEquals(result.error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings.");
    const settingsId = createResult.settings;
    console.log(`  Created initial settings ${settingsId} for ${user}.`);

    const newFont = "Monospace";
    const newFontSize = 15;
    const newLineHeight = 22;

    const editResult = await textSettingsConcept.editSettings({ textSettings: settingsId, font: newFont, fontSize: newFontSize, lineHeight: newLineHeight });
    console.log(`  Attempted to edit settings ${settingsId}. Result: ${JSON.stringify(editResult)}`);
    assertSuccessfulAction(editResult, "Expected successful edit of settings.");
    assertEquals(editResult, {}, "Empty object should be returned on successful edit.");

    const updatedSettingsResult = await textSettingsConcept._getTextSettings({ textSettingsId: settingsId });
    console.log(`  Updated settings details: ${JSON.stringify(updatedSettingsResult)}`);
    assertSuccessfulSettingsQuery(updatedSettingsResult, "Expected successful retrieval of updated settings.");
    assertEquals(updatedSettingsResult.length, 1, "Settings should still exist.");
    assertEquals(updatedSettingsResult[0].settings.font, newFont, "Font should be updated.");
    assertEquals(updatedSettingsResult[0].settings.fontSize, newFontSize, "Font size should be updated.");
    assertEquals(updatedSettingsResult[0].settings.lineHeight, newLineHeight, "Line height should be updated.");
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

    if (!isError(result)) {
      throw new Error("Expected an error for non-existent settings, but got success.");
    }
    assertEquals(result.error, `TextSettings with ID ${nonExistentSettings} not found.`, "Error message should indicate not found.");
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings for test setup.");
    const settingsId = createResult.settings;
    console.log(`  Created initial settings ${settingsId} for ${user}.`);

    const testCases = [
      { font: "", fontSize: 16, lineHeight: 24, expectedError: "Invalid font string." },
      { font: "Arial", fontSize: 0, lineHeight: 24, expectedError: "Font size must be a positive number." },
      { font: "Arial", fontSize: 16, lineHeight: 10, expectedError: "Line height must be greater than or equal to font size." },
    ];

    for (const tc of testCases) {
      const result = await textSettingsConcept.editSettings({ textSettings: settingsId, ...tc });
      console.log(`  Test case (font: ${tc.font}, fontSize: ${tc.fontSize}, lineHeight: ${tc.lineHeight}). Result: ${JSON.stringify(result)}`);
      if (!isError(result)) {
        throw new Error(`Expected an error for invalid input, but got success for: ${JSON.stringify(tc)}`);
      }
      assertEquals(result.error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings.");
    const settingsId = createResult.settings;
    console.log(`  Created default settings for ${userWithDefaults}.`);

    const defaultsForFrank = await textSettingsConcept._getUserDefaultSettings({ user: userWithDefaults });
    console.log(`  Defaults for ${userWithDefaults}: ${JSON.stringify(defaultsForFrank)}`);
    assertSuccessfulSettingsQuery(defaultsForFrank, "Expected successful retrieval of defaults for Frank.");
    assertEquals(defaultsForFrank.length, 1, "Should find default settings for Frank.");
    assertEquals(defaultsForFrank[0].settings._id, settingsId, "Settings ID should match.");

    const defaultsForGrace = await textSettingsConcept._getUserDefaultSettings({ user: userWithoutDefaults });
    console.log(`  Defaults for ${userWithoutDefaults}: ${JSON.stringify(defaultsForGrace)}`);
    assertSuccessfulSettingsQuery(defaultsForGrace, "Expected successful retrieval for Grace (could be empty).");
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
    assertSuccessfulAction(createResult, "Expected successful creation of document settings.");
    const settingsId = createResult.settings;
    console.log(`  Created current settings for ${docWithCurrents}.`);

    const currentsForProject = await textSettingsConcept._getDocumentCurrentSettings({ document: docWithCurrents });
    console.log(`  Currents for ${docWithCurrents}: ${JSON.stringify(currentsForProject)}`);
    assertSuccessfulSettingsQuery(currentsForProject, "Expected successful retrieval of current settings for Project.");
    assertEquals(currentsForProject.length, 1, "Should find current settings for Project.");
    assertEquals(currentsForProject[0].settings._id, settingsId, "Settings ID should match.");

    const currentsForIdea = await textSettingsConcept._getDocumentCurrentSettings({ document: docWithoutCurrents });
    console.log(`  Currents for ${docWithoutCurrents}: ${JSON.stringify(currentsForIdea)}`);
    assertSuccessfulSettingsQuery(currentsForIdea, "Expected successful retrieval for Idea (could be empty).");
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings.");
    const existingSettingsId = createResult.settings;
    console.log(`  Created settings with ID: ${existingSettingsId}.`);

    const foundSettingsResult = await textSettingsConcept._getTextSettings({ textSettingsId: existingSettingsId });
    console.log(`  Found settings for ${existingSettingsId}: ${JSON.stringify(foundSettingsResult)}`);
    assertSuccessfulSettingsQuery(foundSettingsResult, "Expected successful retrieval of existing settings.");
    assertEquals(foundSettingsResult.length, 1, "Should find the existing settings.");
    assertEquals(foundSettingsResult[0].settings.font, font, "Font should match.");

    const nonExistentSettingsId = "settings:anotherNonExistent" as ID;
    const notFoundSettingsResult = await textSettingsConcept._getTextSettings({ textSettingsId: nonExistentSettingsId });
    console.log(`  Found settings for ${nonExistentSettingsId}: ${JSON.stringify(notFoundSettingsResult)}`);
    assertSuccessfulSettingsQuery(notFoundSettingsResult, "Expected successful retrieval for non-existent settings (should be empty).");
    assertEquals(notFoundSettingsResult.length, 0, "Should find no settings for non-existent ID.");
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
    assertSuccessfulAction(createUserSettingsResult, "User default settings should be created.");
    const userDefaultSettingsId = createUserSettingsResult.settings;
    console.log(`   Effect: User ${user} now has default TextSettings ID: ${userDefaultSettingsId}`);

    const verifiedUserDefaultResult = await textSettingsConcept._getUserDefaultSettings({ user });
    assertSuccessfulSettingsQuery(verifiedUserDefaultResult, "Expected successful retrieval of user defaults for verification.");
    assertEquals(verifiedUserDefaultResult[0].settings.font, defaultFont, "User default font should be set.");

    console.log(`2. Action: simulate 'opening a new document' by directly calling createDocumentSettings.`);
    // In a real app, this would be triggered by a sync from a Document concept upon document creation.
    // For this test, we directly call the TextSettings action that sync would invoke.
    const createDocSettingsResult = await textSettingsConcept.createDocumentSettings({
      document,
      font: defaultFont, // Assuming sync applies default values here
      fontSize: defaultFontSize,
      lineHeight: defaultLineHeight,
    });
    assertSuccessfulAction(createDocSettingsResult, "Document settings should be created.");
    const documentCurrentSettingsId = createDocSettingsResult.settings;
    console.log(`   Effect: Document ${document} now has current TextSettings ID: ${documentCurrentSettingsId}, initialized with user defaults.`);
    
    const verifiedDocCurrentResult = await textSettingsConcept._getDocumentCurrentSettings({ document });
    assertSuccessfulSettingsQuery(verifiedDocCurrentResult, "Expected successful retrieval of document current settings for verification.");
    assertEquals(verifiedDocCurrentResult[0].settings.font, defaultFont, "Document current font should be initialized from default.");

    console.log(`3. Action: editSettings to customize document settings for ${document}`);
    const editSettingsResult = await textSettingsConcept.editSettings({
      textSettings: documentCurrentSettingsId,
      font: customFont,
      fontSize: customFontSize,
      lineHeight: customLineHeight,
    });
    assertSuccessfulAction(editSettingsResult, "Editing document settings should succeed.");
    assertEquals(editSettingsResult, {}, "Empty object should be returned on successful edit.");
    console.log(`   Effect: Document ${document}'s settings (ID: ${documentCurrentSettingsId}) updated to custom values.`);

    console.log(`4. Verification: Check that document settings are now customized.`);
    const finalDocSettingsResult = await textSettingsConcept._getDocumentCurrentSettings({ document });
    assertSuccessfulSettingsQuery(finalDocSettingsResult, "Expected successful retrieval of final document settings.");
    assertEquals(finalDocSettingsResult.length, 1, "Document should still have current settings.");
    assertEquals(finalDocSettingsResult[0].settings.font, customFont, "Document font should be customized.");
    assertEquals(finalDocSettingsResult[0].settings.fontSize, customFontSize, "Document font size should be customized.");
    assertEquals(finalDocSettingsResult[0].settings.lineHeight, customLineHeight, "Document line height should be customized.");
    console.log(`   Result: Document ${document} settings are now: ${JSON.stringify(finalDocSettingsResult[0].settings)}`);

    console.log("\nPrinciple fulfilled: User created default settings, new document loaded them, and then document-specific settings were customized and remembered.");
  });
});
```


# Prompt: Works (with a few of my own fixes)! Can you go through and explain what each test does?
# response:

Okay, let's break down each test step in the `src/TextSettings/TextSettingsConcept.test.ts` file.

First, let's understand the helper functions and global hooks:

### Global Hooks

*   **`Deno.test.beforeAll`**: This hook runs **once** before any tests in this file start. It's responsible for:
    *   Calling `testDb()` to initialize a MongoDB database connection. This `testDb()` function itself creates a unique database for the test run and drops any previous version of it, ensuring a clean slate for the entire test file.
    *   Storing the `Db` and `MongoClient` instances in `dbInstance` and `clientInstance` respectively, so they can be reused across all individual test steps.
*   **`Deno.test.afterAll`**: This hook runs **once** after all tests in this file have completed. It ensures that the MongoDB client connection (`clientInstance`) is properly closed, releasing database resources.

### Type Guards and Helper Assertions

These helper functions are crucial for robust TypeScript testing, especially when dealing with union return types (like `ID | { error: string }`) from concept actions.

*   **`isError(response: any): response is ResultWithError`**:
    *   **Purpose**: This is a TypeScript [type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates). It checks if a given `response` object structurally looks like an error object (i.e., has an `error` property of type `string`).
    *   **Benefit**: When this function returns `true`, TypeScript *narrows* the type of `response` to `ResultWithError` within that scope, allowing safe access to `response.error`.
*   **`assertSuccessfulAction<T>(result: T | ResultWithError, message?: string): asserts result is T`**:
    *   **Purpose**: This is a custom assertion function for actions that return either a successful result `T` or an `error` object. It uses an `asserts` return type.
    *   **Benefit**: If `isError(result)` is true, it throws an `Error` indicating the failure. If it *doesn't* throw, TypeScript *narrows* the type of `result` to `T` (the successful type) after the call, allowing safe access to successful properties (e.g., `result.settings`).
*   **`assertSuccessfulSettingsQuery(result: { settings: TextSettingsData }[] | ResultWithError, message?: string): asserts result is { settings: TextSettingsData }[]`**:
    *   **Purpose**: Similar to `assertSuccessfulAction`, but specifically tailored for queries that return an *array* of settings or an `error` object.
    *   **Benefit**: Narrows the type to `TextSettingsData[]` on success, allowing safe access to `.length` and array elements.

Now, let's go through the test steps:

---

### `Deno.test("TextSettings Concept Tests Suite", ...)`

This is the main test suite that groups all individual test steps for the `TextSettings` concept.

### 1. `Action: createUserSettings - Successful creation`

*   **Purpose**: To verify that a user can successfully create their default text settings with valid inputs.
*   **Setup**:
    *   A new `TextSettingsConcept` instance is created.
    *   `textSettingsConcept.clearCollections()` is called to ensure a completely clean state *just for this test step*, preventing interference from previous steps.
*   **Action(s) Performed**:
    *   `textSettingsConcept.createUserSettings(...)` is called with a `user` ID, a `font`, `fontSize`, and `lineHeight`.
*   **`requires` Check**:
    *   Implicitly checks that the `user` does not already have default settings (as this is the first call for "user:Alice").
    *   Checks for valid `font` string, `fontSize > 0`, and `lineHeight >= fontSize`.
*   **`effects` Verification**:
    *   `assertSuccessfulAction` confirms no error was returned.
    *   `assertExists(result.settings)` checks that a `settings` ID was returned.
    *   `textSettingsConcept._getUserDefaultSettings({ user })` is called to retrieve the *actual* stored default settings for the user.
    *   `assertSuccessfulSettingsQuery` and `assertEquals` calls then verify:
        *   Exactly one default setting exists for the user.
        *   The returned `settings._id` matches the ID from `createUserSettings`.
        *   The `font`, `fontSize`, and `lineHeight` values match the inputs.

### 2. `Action: createUserSettings - Duplicate default settings for user`

*   **Purpose**: To verify that a user cannot create *multiple* default text settings.
*   **Setup**:
    *   Cleans collections.
    *   Calls `createUserSettings` once for "user:Bob" to establish initial default settings.
*   **Action(s) Performed**:
    *   `textSettingsConcept.createUserSettings(...)` is called *again* for the same "user:Bob" with different settings.
*   **`requires` Check**:
    *   Tests the `there is not already a default TextSettings with user` precondition.
*   **`effects` Verification**:
    *   `!isError(result)` checks that the call *fails*.
    *   `assertEquals(result.error, ...)` verifies the specific error message, confirming it's a duplicate settings error.

### 3. `Action: createUserSettings - Invalid inputs`

*   **Purpose**: To verify that `createUserSettings` correctly rejects invalid `font`, `fontSize`, or `lineHeight` values.
*   **Setup**:
    *   Cleans collections.
*   **Action(s) Performed**:
    *   Iterates through `testCases`, each containing an invalid input combination and its `expectedError`.
    *   Calls `createUserSettings` for each test case.
*   **`requires` Check**:
    *   Tests the `font is a valid HTML font string`, `fontSize > 0`, and `lineHeight >= fontSize` preconditions.
*   **`effects` Verification**:
    *   `!isError(result)` checks that each call *fails*.
    *   `assertEquals(result.error, tc.expectedError)` verifies that the correct error message is returned for each invalid input.

### 4. `Action: createDocumentSettings - Successful creation`

*   **Purpose**: To verify that current text settings can be successfully created for a document with valid inputs.
*   **Setup**:
    *   Cleans collections.
*   **Action(s) Performed**:
    *   `textSettingsConcept.createDocumentSettings(...)` is called with a `document` ID, `font`, `fontSize`, and `lineHeight`.
*   **`requires` Check**:
    *   Implicitly checks that the `document` does not already have current settings.
    *   Checks for valid `font` string, `fontSize > 0`, and `lineHeight >= fontSize`.
*   **`effects` Verification**:
    *   `assertSuccessfulAction` confirms no error.
    *   `assertExists(result.settings)` checks a `settings` ID was returned.
    *   `textSettingsConcept._getDocumentCurrentSettings({ document })` retrieves the stored current settings.
    *   `assertSuccessfulSettingsQuery` and `assertEquals` verify:
        *   Exactly one current setting exists for the document.
        *   The `settings._id` matches.
        *   The `font`, `fontSize`, and `lineHeight` match the inputs.

### 5. `Action: createDocumentSettings - Duplicate current settings for document`

*   **Purpose**: To verify that a document cannot have *multiple* current text settings simultaneously.
*   **Setup**:
    *   Cleans collections.
    *   Calls `createDocumentSettings` once for "doc:Draft" to establish initial current settings.
*   **Action(s) Performed**:
    *   `textSettingsConcept.createDocumentSettings(...)` is called *again* for the same "doc:Draft".
*   **`requires` Check**:
    *   Tests the `there is not already a current TextSettings with document` precondition.
*   **`effects` Verification**:
    *   `!isError(result)` checks the call *fails*.
    *   `assertEquals(result.error, ...)` verifies the specific error message indicating a duplicate current setting.

### 6. `Action: createDocumentSettings - Invalid inputs`

*   **Purpose**: To verify that `createDocumentSettings` correctly rejects invalid `font`, `fontSize`, or `lineHeight`.
*   **Setup**:
    *   Cleans collections.
*   **Action(s) Performed**:
    *   Iterates through `testCases` with invalid inputs.
    *   Calls `createDocumentSettings` for each.
*   **`requires` Check**:
    *   Tests the input validation preconditions.
*   **`effects` Verification**:
    *   `!isError(result)` checks each call *fails*.
    *   `assertEquals(result.error, tc.expectedError)` verifies the correct error message.

### 7. `Action: editSettings - Successful modification`

*   **Purpose**: To verify that existing text settings can be successfully modified.
*   **Setup**:
    *   Cleans collections.
    *   Creates initial user settings for "user:Dave" to get a `settingsId` to modify.
*   **Action(s) Performed**:
    *   `textSettingsConcept.editSettings(...)` is called with the `settingsId` and new `font`, `fontSize`, `lineHeight`.
*   **`requires` Check**:
    *   Checks that `textSettingsId` exists and that new inputs are valid.
*   **`effects` Verification**:
    *   `assertSuccessfulAction` confirms success (empty object `({})` returned).
    *   `textSettingsConcept._getTextSettings({ textSettingsId: settingsId })` retrieves the *updated* settings.
    *   `assertSuccessfulSettingsQuery` and `assertEquals` verify:
        *   The settings still exist.
        *   The `font`, `fontSize`, and `lineHeight` have been updated to the new values.

### 8. `Action: editSettings - Non-existent textSettings ID`

*   **Purpose**: To verify that `editSettings` fails when attempting to modify a `TextSettings` configuration that does not exist.
*   **Setup**:
    *   Cleans collections.
*   **Action(s) Performed**:
    *   `textSettingsConcept.editSettings(...)` is called with a fabricated `nonExistentSettings` ID.
*   **`requires` Check**:
    *   Tests the `textSettings exists` precondition.
*   **`effects` Verification**:
    *   `!isError(result)` checks the call *fails*.
    *   `assertEquals(result.error, ...)` verifies the specific "not found" error message.

### 9. `Action: editSettings - Invalid inputs`

*   **Purpose**: To verify that `editSettings` rejects invalid `font`, `fontSize`, or `lineHeight` inputs, even when the `textSettingsId` is valid.
*   **Setup**:
    *   Cleans collections.
    *   Creates initial user settings for "user:Eve" to get a valid `settingsId` to use in the edit attempts.
*   **Action(s) Performed**:
    *   Iterates through `testCases` with invalid input combinations for `font`, `fontSize`, `lineHeight`.
    *   Calls `editSettings` for each using the valid `settingsId`.
*   **`requires` Check**:
    *   Tests the input validation preconditions.
*   **`effects` Verification**:
    *   `!isError(result)` checks each call *fails*.
    *   `assertEquals(result.error, tc.expectedError)` verifies the correct error message.

### 10. `Query: _getUserDefaultSettings - User with and without default settings`

*   **Purpose**: To verify the behavior of retrieving default settings for users who have them and those who don't.
*   **Setup**:
    *   Cleans collections.
    *   Creates default settings for `user:Frank`.
*   **Action(s) Performed**:
    *   Calls `textSettingsConcept._getUserDefaultSettings()` for `user:Frank` (who has defaults).
    *   Calls `textSettingsConcept._getUserDefaultSettings()` for `user:Grace` (who does not).
*   **`requires` Check**:
    *   No explicit `requires` for queries in the spec, but implicitly assumes the `user` ID is valid (polymorphic `ID`).
*   **`effects` Verification**:
    *   For `user:Frank`: `assertSuccessfulSettingsQuery` and `assertEquals` verify one setting is returned, and its properties match the created defaults.
    *   For `user:Grace`: `assertSuccessfulSettingsQuery` verifies no error, and `assertEquals(defaultsForGrace.length, 0)` confirms an empty array is returned.

### 11. `Query: _getDocumentCurrentSettings - Document with and without current settings`

*   **Purpose**: To verify the behavior of retrieving current settings for documents that have them and those that don't.
*   **Setup**:
    *   Cleans collections.
    *   Creates current settings for `doc:Project`.
*   **Action(s) Performed**:
    *   Calls `textSettingsConcept._getDocumentCurrentSettings()` for `doc:Project` (which has current settings).
    *   Calls `textSettingsConcept._getDocumentCurrentSettings()` for `doc:Idea` (which does not).
*   **`requires` Check**:
    *   No explicit `requires` for queries.
*   **`effects` Verification**:
    *   For `doc:Project`: `assertSuccessfulSettingsQuery` and `assertEquals` verify one setting is returned, matching the created current settings.
    *   For `doc:Idea`: `assertSuccessfulSettingsQuery` verifies no error, and `assertEquals(currentsForIdea.length, 0)` confirms an empty array.

### 12. `Query: _getTextSettings - Existing and non-existent settings ID`

*   **Purpose**: To verify the behavior of retrieving a specific `TextSettings` configuration by its ID, both when it exists and when it doesn't.
*   **Setup**:
    *   Cleans collections.
    *   Creates user settings for `user:Harry` to get an `existingSettingsId`.
*   **Action(s) Performed**:
    *   Calls `textSettingsConcept._getTextSettings()` with the `existingSettingsId`.
    *   Calls `textSettingsConcept._getTextSettings()` with a fabricated `nonExistentSettingsId`.
*   **`requires` Check**:
    *   No explicit `requires` for queries.
*   **`effects` Verification**:
    *   For `existingSettingsId`: `assertSuccessfulSettingsQuery` and `assertEquals` verify one setting is returned, and its font matches.
    *   For `nonExistentSettingsId`: `assertSuccessfulSettingsQuery` verifies no error, and `assertEquals(notFoundSettingsResult.length, 0)` confirms an empty array.

### 13. `Principle Trace: Default settings loaded for new document, then customized`

*   **Purpose**: This is the most important test, demonstrating the full end-to-end user journey described in the concept's **principle**. It string-tests the core functionality.
*   **Setup**:
    *   Cleans collections.
    *   Defines `user`, `document`, and values for `defaultFont`/`size`/`height` and `customFont`/`size`/`height`.
*   **Trace Steps & Verification**:
    1.  **`createUserSettings`**: Creates default settings for `user:PrincipleUser`.
        *   **Verification**: `_getUserDefaultSettings` confirms defaults are set.
    2.  **Simulated `createDocumentSettings`**: Simulates the *sync* that would happen when a new document is created, applying the user's default settings to `doc:PrincipleDoc`.
        *   **Verification**: `_getDocumentCurrentSettings` confirms the document's current settings now match the user's defaults.
    3.  **`editSettings`**: Modifies the `doc:PrincipleDoc`'s current settings with `customFont`, `customFontSize`, `customLineHeight`.
        *   **Verification**: `_getDocumentCurrentSettings` confirms the document's settings are now updated to the custom values.
*   **Overall `principle` fulfillment**: The console logs at each step and the final assertion confirm that the user experience described in the principle ("When setting up an account, users can create default text display preferences for their account. When opening a new document, users will have their default display settings loaded in. Users can also change their text settings for each document, which change how the document is displayed and be remembered between sessions.") is achieved by the sequence of actions and state changes.

This comprehensive set of tests covers the actions' individual requirements and effects, validates error handling, and most importantly, provides an end-to-end trace to ensure the concept fulfills its stated purpose and principle.


# Prompt: Please update the above testing suite to use check and x emojis when each test passes or fails
# response:

Okay, let's update the testing suite to include `✅` for passing checks and `❌` for expected errors (when they are correctly caught and asserted). When an *unexpected* error occurs, Deno's test runner will mark the step as failed, so we don't need an explicit `❌` there.

Here's the modified test file:

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

// --- Type Guards and Helper Assertions for robust testing ---
type ResultWithError = { error: string };

function isError(response: any): response is ResultWithError {
  return typeof response === 'object' && response !== null && 'error' in response && typeof response.error === 'string';
}

function assertSuccessfulAction<T>(
  result: T | ResultWithError,
  message?: string,
): asserts result is T {
  if (isError(result)) {
    throw new Error(message || `Expected successful action, but got error: ${result.error}`);
  }
}

function assertSuccessfulSettingsQuery(
  result: { settings: TextSettingsData }[] | ResultWithError,
  message?: string,
): asserts result is { settings: TextSettingsData }[] {
  if (isError(result)) {
    throw new Error(message || `Expected successful settings query, but got error: ${result.error}`);
  }
}

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

    assertSuccessfulAction(result, "Expected successful creation of user settings.");
    console.log("    ✅ Action returned successfully.");
    assertExists(result.settings, "Settings ID should be returned on successful creation.");
    console.log("    ✅ Settings ID exists in result.");
    const settingsId = result.settings;

    const userDefaultsResult = await textSettingsConcept._getUserDefaultSettings({ user });
    console.log(`  User's default settings: ${JSON.stringify(userDefaultsResult)}`);
    assertSuccessfulSettingsQuery(userDefaultsResult, "Expected successful retrieval of user defaults.");
    console.log("    ✅ User defaults query returned successfully.");
    assertEquals(userDefaultsResult.length, 1, "There should be one default setting for the user.");
    console.log("    ✅ Correct number of default settings found.");
    assertEquals(userDefaultsResult[0].settings._id, settingsId, "The linked settings ID should match.");
    console.log("    ✅ Linked settings ID matches.");
    assertEquals(userDefaultsResult[0].settings.font, font, "Font should match.");
    console.log("    ✅ Font matches.");
    assertEquals(userDefaultsResult[0].settings.fontSize, fontSize, "Font size should match.");
    console.log("    ✅ Font size matches.");
    assertEquals(userDefaultsResult[0].settings.lineHeight, lineHeight, "Line height should match.");
    console.log("    ✅ Line height matches.");
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

    if (!isError(result)) {
      throw new Error("❌ Expected an error for duplicate default settings, but got success.");
    }
    assertEquals(result.error, `User ${user} already has default text settings.`, "Error message should indicate duplicate default.");
    console.log("    ✅ Expected error returned for duplicate default settings.");
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
      if (!isError(result)) {
        throw new Error(`❌ Expected an error for invalid input, but got success for: ${JSON.stringify(tc)}`);
      }
      assertEquals(result.error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
      console.log(`    ✅ Expected error '${tc.expectedError}' returned.`);
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

    assertSuccessfulAction(result, "Expected successful creation of document settings.");
    console.log("    ✅ Action returned successfully.");
    assertExists(result.settings, "Settings ID should be returned on successful creation.");
    console.log("    ✅ Settings ID exists in result.");
    const settingsId = result.settings;

    const docCurrentsResult = await textSettingsConcept._getDocumentCurrentSettings({ document });
    console.log(`  Document's current settings: ${JSON.stringify(docCurrentsResult)}`);
    assertSuccessfulSettingsQuery(docCurrentsResult, "Expected successful retrieval of document current settings.");
    console.log("    ✅ Document current settings query returned successfully.");
    assertEquals(docCurrentsResult.length, 1, "There should be one current setting for the document.");
    console.log("    ✅ Correct number of current settings found.");
    assertEquals(docCurrentsResult[0].settings._id, settingsId, "The linked settings ID should match.");
    console.log("    ✅ Linked settings ID matches.");
    assertEquals(docCurrentsResult[0].settings.font, font, "Font should match.");
    console.log("    ✅ Font matches.");
    assertEquals(docCurrentsResult[0].settings.fontSize, fontSize, "Font size should match.");
    console.log("    ✅ Font size matches.");
    assertEquals(docCurrentsResult[0].settings.lineHeight, lineHeight, "Line height should match.");
    console.log("    ✅ Line height matches.");
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

    if (!isError(result)) {
      throw new Error("❌ Expected an error for duplicate current settings, but got success.");
    }
    assertEquals(result.error, `Document ${document} already has current text settings.`, "Error message should indicate duplicate current.");
    console.log("    ✅ Expected error returned for duplicate current settings.");
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
      if (!isError(result)) {
        throw new Error(`❌ Expected an error for invalid input, but got success for: ${JSON.stringify(tc)}`);
      }
      assertEquals(result.error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
      console.log(`    ✅ Expected error '${tc.expectedError}' returned.`);
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings.");
    console.log("    ✅ Initial user settings created successfully.");
    const settingsId = createResult.settings;
    console.log(`  Created initial settings ${settingsId} for ${user}.`);

    const newFont = "Monospace";
    const newFontSize = 15;
    const newLineHeight = 22;

    const editResult = await textSettingsConcept.editSettings({ textSettings: settingsId, font: newFont, fontSize: newFontSize, lineHeight: newLineHeight });
    console.log(`  Attempted to edit settings ${settingsId}. Result: ${JSON.stringify(editResult)}`);
    assertSuccessfulAction(editResult, "Expected successful edit of settings.");
    console.log("    ✅ Edit action returned successfully.");
    assertEquals(editResult, {}, "Empty object should be returned on successful edit.");
    console.log("    ✅ Empty object returned on successful edit.");

    const updatedSettingsResult = await textSettingsConcept._getTextSettings({ textSettingsId: settingsId });
    console.log(`  Updated settings details: ${JSON.stringify(updatedSettingsResult)}`);
    assertSuccessfulSettingsQuery(updatedSettingsResult, "Expected successful retrieval of updated settings.");
    console.log("    ✅ Updated settings query returned successfully.");
    assertEquals(updatedSettingsResult.length, 1, "Settings should still exist.");
    console.log("    ✅ Settings still exist.");
    assertEquals(updatedSettingsResult[0].settings.font, newFont, "Font should be updated.");
    console.log("    ✅ Font updated correctly.");
    assertEquals(updatedSettingsResult[0].settings.fontSize, newFontSize, "Font size should be updated.");
    console.log("    ✅ Font size updated correctly.");
    assertEquals(updatedSettingsResult[0].settings.lineHeight, newLineHeight, "Line height should be updated.");
    console.log("    ✅ Line height updated correctly.");
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

    if (!isError(result)) {
      throw new Error("❌ Expected an error for non-existent settings, but got success.");
    }
    assertEquals(result.error, `TextSettings with ID ${nonExistentSettings} not found.`, "Error message should indicate not found.");
    console.log("    ✅ Expected error returned for non-existent settings.");
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings for test setup.");
    const settingsId = createResult.settings;
    console.log(`  Created initial settings ${settingsId} for ${user}.`);

    const testCases = [
      { font: "", fontSize: 16, lineHeight: 24, expectedError: "Invalid font string." },
      { font: "Arial", fontSize: 0, lineHeight: 24, expectedError: "Font size must be a positive number." },
      { font: "Arial", fontSize: 16, lineHeight: 10, expectedError: "Line height must be greater than or equal to font size." },
    ];

    for (const tc of testCases) {
      const result = await textSettingsConcept.editSettings({ textSettings: settingsId, ...tc });
      console.log(`  Test case (font: ${tc.font}, fontSize: ${tc.fontSize}, lineHeight: ${tc.lineHeight}). Result: ${JSON.stringify(result)}`);
      if (!isError(result)) {
        throw new Error(`❌ Expected an error for invalid input, but got success for: ${JSON.stringify(tc)}`);
      }
      assertEquals(result.error, tc.expectedError, `Error message should match for: ${tc.expectedError}`);
      console.log(`    ✅ Expected error '${tc.expectedError}' returned.`);
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings.");
    const settingsId = createResult.settings;
    console.log(`  Created default settings for ${userWithDefaults}.`);

    const defaultsForFrankResult = await textSettingsConcept._getUserDefaultSettings({ user: userWithDefaults });
    console.log(`  Defaults for ${userWithDefaults}: ${JSON.stringify(defaultsForFrankResult)}`);
    assertSuccessfulSettingsQuery(defaultsForFrankResult, "Expected successful retrieval of defaults for Frank.");
    console.log("    ✅ Query for Frank's defaults returned successfully.");
    assertEquals(defaultsForFrankResult.length, 1, "Should find default settings for Frank.");
    console.log("    ✅ Frank's default settings found.");
    assertEquals(defaultsForFrankResult[0].settings._id, settingsId, "Settings ID should match.");
    console.log("    ✅ Frank's settings ID matches.");

    const defaultsForGraceResult = await textSettingsConcept._getUserDefaultSettings({ user: userWithoutDefaults });
    console.log(`  Defaults for ${userWithoutDefaults}: ${JSON.stringify(defaultsForGraceResult)}`);
    assertSuccessfulSettingsQuery(defaultsForGraceResult, "Expected successful retrieval for Grace (could be empty).");
    console.log("    ✅ Query for Grace's defaults returned successfully.");
    assertEquals(defaultsForGraceResult.length, 0, "Should find no default settings for Grace.");
    console.log("    ✅ No default settings found for Grace, as expected.");
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
    assertSuccessfulAction(createResult, "Expected successful creation of document settings.");
    const settingsId = createResult.settings;
    console.log(`  Created current settings for ${docWithCurrents}.`);

    const currentsForProjectResult = await textSettingsConcept._getDocumentCurrentSettings({ document: docWithCurrents });
    console.log(`  Currents for ${docWithCurrents}: ${JSON.stringify(currentsForProjectResult)}`);
    assertSuccessfulSettingsQuery(currentsForProjectResult, "Expected successful retrieval of current settings for Project.");
    console.log("    ✅ Query for Project's current settings returned successfully.");
    assertEquals(currentsForProjectResult.length, 1, "Should find current settings for Project.");
    console.log("    ✅ Project's current settings found.");
    assertEquals(currentsForProjectResult[0].settings._id, settingsId, "Settings ID should match.");
    console.log("    ✅ Project's settings ID matches.");

    const currentsForIdeaResult = await textSettingsConcept._getDocumentCurrentSettings({ document: docWithoutCurrents });
    console.log(`  Currents for ${docWithoutCurrents}: ${JSON.stringify(currentsForIdeaResult)}`);
    assertSuccessfulSettingsQuery(currentsForIdeaResult, "Expected successful retrieval for Idea (could be empty).");
    console.log("    ✅ Query for Idea's current settings returned successfully.");
    assertEquals(currentsForIdeaResult.length, 0, "Should find no current settings for Idea.");
    console.log("    ✅ No current settings found for Idea, as expected.");
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
    assertSuccessfulAction(createResult, "Expected successful creation of user settings.");
    const existingSettingsId = createResult.settings;
    console.log(`  Created settings with ID: ${existingSettingsId}.`);

    const foundSettingsResult = await textSettingsConcept._getTextSettings({ textSettingsId: existingSettingsId });
    console.log(`  Found settings for ${existingSettingsId}: ${JSON.stringify(foundSettingsResult)}`);
    assertSuccessfulSettingsQuery(foundSettingsResult, "Expected successful retrieval of existing settings.");
    console.log("    ✅ Query for existing settings returned successfully.");
    assertEquals(foundSettingsResult.length, 1, "Should find the existing settings.");
    console.log("    ✅ Existing settings found.");
    assertEquals(foundSettingsResult[0].settings.font, font, "Font should match.");
    console.log("    ✅ Font matches.");

    const nonExistentSettingsId = "settings:anotherNonExistent" as ID;
    const notFoundSettingsResult = await textSettingsConcept._getTextSettings({ textSettingsId: nonExistentSettingsId });
    console.log(`  Found settings for ${nonExistentSettingsId}: ${JSON.stringify(notFoundSettingsResult)}`);
    assertSuccessfulSettingsQuery(notFoundSettingsResult, "Expected successful retrieval for non-existent settings (should be empty).");
    console.log("    ✅ Query for non-existent settings returned successfully.");
    assertEquals(notFoundSettingsResult.length, 0, "Should find no settings for non-existent ID.");
    console.log("    ✅ No settings found for non-existent ID, as expected.");
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
    assertSuccessfulAction(createUserSettingsResult, "User default settings should be created.");
    console.log("    ✅ User default settings created.");
    const userDefaultSettingsId = createUserSettingsResult.settings;
    console.log(`   Effect: User ${user} now has default TextSettings ID: ${userDefaultSettingsId}`);

    const verifiedUserDefaultResult = await textSettingsConcept._getUserDefaultSettings({ user });
    assertSuccessfulSettingsQuery(verifiedUserDefaultResult, "Expected successful retrieval of user defaults for verification.");
    assertEquals(verifiedUserDefaultResult[0].settings.font, defaultFont, "User default font should be set.");
    console.log("    ✅ Verified user default font matches.");

    console.log(`2. Action: simulate 'opening a new document' by directly calling createDocumentSettings.`);
    const createDocSettingsResult = await textSettingsConcept.createDocumentSettings({
      document,
      font: defaultFont,
      fontSize: defaultFontSize,
      lineHeight: defaultLineHeight,
    });
    assertSuccessfulAction(createDocSettingsResult, "Document settings should be created.");
    console.log("    ✅ Document settings created.");
    const documentCurrentSettingsId = createDocSettingsResult.settings;
    console.log(`   Effect: Document ${document} now has current TextSettings ID: ${documentCurrentSettingsId}, initialized with user defaults.`);
    
    const verifiedDocCurrentResult = await textSettingsConcept._getDocumentCurrentSettings({ document });
    assertSuccessfulSettingsQuery(verifiedDocCurrentResult, "Expected successful retrieval of document current settings for verification.");
    assertEquals(verifiedDocCurrentResult[0].settings.font, defaultFont, "Document current font should be initialized from default.");
    console.log("    ✅ Verified document current font initialized from user default.");

    console.log(`3. Action: editSettings to customize document settings for ${document}`);
    const editSettingsResult = await textSettingsConcept.editSettings({
      textSettings: documentCurrentSettingsId,
      font: customFont,
      fontSize: customFontSize,
      lineHeight: customLineHeight,
    });
    assertSuccessfulAction(editSettingsResult, "Editing document settings should succeed.");
    console.log("    ✅ Editing document settings succeeded.");
    assertEquals(editSettingsResult, {}, "Empty object should be returned on successful edit.");
    console.log("    ✅ Empty object returned on successful edit.");
    console.log(`   Effect: Document ${document}'s settings (ID: ${documentCurrentSettingsId}) updated to custom values.`);

    console.log(`4. Verification: Check that document settings are now customized.`);
    const finalDocSettingsResult = await textSettingsConcept._getDocumentCurrentSettings({ document });
    assertSuccessfulSettingsQuery(finalDocSettingsResult, "Expected successful retrieval of final document settings.");
    assertEquals(finalDocSettingsResult.length, 1, "Document should still have current settings.");
    assertEquals(finalDocSettingsResult[0].settings.font, customFont, "Document font should be customized.");
    assertEquals(finalDocSettingsResult[0].settings.fontSize, customFontSize, "Document font size should be customized.");
    assertEquals(finalDocSettingsResult[0].settings.lineHeight, customLineHeight, "Document line height should be customized.");
    console.log(`   Result: Document ${document} settings are now: ${JSON.stringify(finalDocSettingsResult[0].settings)}`);
    console.log("    ✅ All document settings are customized and verified.");

    console.log("\nPrinciple fulfilled: User created default settings, new document loaded them, and then document-specific settings were customized and remembered.");
  });
});
```