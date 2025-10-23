---
timestamp: 'Thu Oct 23 2025 04:29:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_042901.e6691e23.md]]'
content_id: cd530d2cbaa0e5cd41635dfa535d919ce052d112d574c366a7a68475d790466e
---

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
