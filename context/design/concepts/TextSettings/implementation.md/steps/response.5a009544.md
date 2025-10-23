---
timestamp: 'Thu Oct 23 2025 04:08:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_040820.eb404c74.md]]'
content_id: 5a00954415e5fc6f9c4fcdaf33fb78d99d5c6d83ce774ef5c2c6daba526283e1
---

# response:

```typescript
// file: src/concepts/TextSettings/TextSettingsConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "TextSettings" + ".";

// Generic types of this concept
type User = ID;
type Document = ID;
type Font = ID;
type TextSettings = ID;

/**
 * a set of TextSettings with:
 * a font Font
 * a fontSize number
 * a lineHeight number
 */
interface TextSettingsDoc {
  _id: TextSettings;
  font: Font;
  fontSize: number;
  lineHeight: number;
}

/**
 * a set of Users with:
 * a default TextSettings
 */
interface UserDoc {
  _id: User;
  defaultTextSettings?: TextSettings; // Optional, as it might not be set initially
}

/**
 * a set of Documents with:
 * a current TextSettings
 */
interface DocumentDoc {
  _id: Document;
  currentTextSettings?: TextSettings; // Optional, as it might not be set initially
}

/**
 * **concept** TextSettings [User, Document, Font]
 *
 * **purpose** allow users to customize and set different text/display settings for each of their documents
 *
 * **principle** When setting up an account, users can create default text display preferences for their account.
 * When opening a new document, users will have their default display settings loaded in.
 * Users can also change their text settings for each documents, which change how the document is displayed
 * and be remembered between sessions.
 */
export default class TextSettingsConcept {
  private textSettingsCollection: Collection<TextSettingsDoc>;
  private usersCollection: Collection<UserDoc>;
  private documentsCollection: Collection<DocumentDoc>;

  constructor(private readonly db: Db) {
    this.textSettingsCollection = this.db.collection(PREFIX + "textSettings");
    this.usersCollection = this.db.collection(PREFIX + "users");
    this.documentsCollection = this.db.collection(PREFIX + "documents");
  }

  /**
   * createSettings(font: Font, fontSize: Number, lineHeight: Number, locale: User | Document): (settings: TextSettings)
   *
   * **requires**
   * - there is not already a TextSettings associated with the provided `locale` (either a User's default or a Document's current settings).
   * - `font` is a valid font (validation for font existence/validity is assumed to be handled externally or by a separate Font concept).
   *
   * **effects**
   * - creates a new `TextSettings` document `s` with the given `font`, `fontSize`, and `lineHeight`.
   * - If `locale` is a `User`, sets that user's `defaultTextSettings` to `s`.
   * - If `locale` is a `Document`, sets that document's `currentTextSettings` to `s`.
   * - Returns the ID of the newly created `TextSettings` document.
   */
  async createSettings(
    {
      font,
      fontSize,
      lineHeight,
      locale,
    }: {
      font: Font;
      fontSize: number;
      lineHeight: number;
      locale: User | Document;
    },
  ): Promise<{ settings: TextSettings } | { error: string }> {
    // Check if locale already has associated TextSettings
    if (typeof locale === "string" && locale.startsWith("user:")) {
      const userHasSettings = await this.usersCollection.findOne({
        _id: locale as User,
        defaultTextSettings: { $exists: true },
      });
      if (userHasSettings) {
        return { error: `User ${locale} already has default TextSettings.` };
      }
    } else if (typeof locale === "string" && locale.startsWith("document:")) {
      const documentHasSettings = await this.documentsCollection.findOne({
        _id: locale as Document,
        currentTextSettings: { $exists: true },
      });
      if (documentHasSettings) {
        return { error: `Document ${locale} already has current TextSettings.` };
      }
    } else {
      // This case handles if the locale ID doesn't have a known prefix or is not a string
      // In a real system, more robust type checking or validation would be needed.
      return { error: "Invalid locale type provided." };
    }

    // Create new TextSettings
    const newSettingsId = freshID() as TextSettings;
    await this.textSettingsCollection.insertOne({
      _id: newSettingsId,
      font,
      fontSize,
      lineHeight,
    });

    // Link the new settings to the locale
    if (typeof locale === "string" && locale.startsWith("user:")) {
      await this.usersCollection.updateOne(
        { _id: locale as User },
        { $set: { defaultTextSettings: newSettingsId } },
        { upsert: true }, // Create user entry if it doesn't exist in this concept's collection
      );
    } else { // Assuming it must be a Document based on the prior check
      await this.documentsCollection.updateOne(
        { _id: locale as Document },
        { $set: { currentTextSettings: newSettingsId } },
        { upsert: true }, // Create document entry if it doesn't exist in this concept's collection
      );
    }

    return { settings: newSettingsId };
  }

  /**
   * editSettings(textSettings: TextSettings, font: Font, fontSize: Number, lineHeight: Number): (settings: TextSettings)
   *
   * **requires** `textSettings` exists
   *
   * **effects**
   * - changes the `TextSettings` document identified by `textSettings` to have the new `font`, `fontSize`, and `lineHeight`.
   * - Returns the ID of the updated `TextSettings` document.
   */
  async editSettings(
    { textSettings, font, fontSize, lineHeight }: {
      textSettings: TextSettings;
      font: Font;
      fontSize: number;
      lineHeight: number;
    },
  ): Promise<{ settings: TextSettings } | { error: string }> {
    // Check if textSettings exists
    const existingSettings = await this.textSettingsCollection.findOne({
      _id: textSettings,
    });
    if (!existingSettings) {
      return { error: `TextSettings with ID ${textSettings} not found.` };
    }

    // Update textSettings
    await this.textSettingsCollection.updateOne(
      { _id: textSettings },
      { $set: { font, fontSize, lineHeight } },
    );

    return { settings: textSettings };
  }

  /**
   * _getTextSettings(textSettings: TextSettings): (font: Font, fontSize: Number, lineHeight: Number)
   *
   * **requires** `textSettings` exists
   *
   * **effects** returns the font, fontSize, and lineHeight of the specified TextSettings.
   */
  async _getTextSettings(
    { textSettings }: { textSettings: TextSettings },
  ): Promise<
    Array<{ font: Font; fontSize: number; lineHeight: number }> | {
      error: string;
    }
  > {
    const settings = await this.textSettingsCollection.findOne({
      _id: textSettings,
    });
    if (!settings) {
      return { error: `TextSettings with ID ${textSettings} not found.` };
    }
    return [{
      font: settings.font,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
    }];
  }

  /**
   * _getDefaultTextSettingsForUser(user: User): (settings: TextSettings)
   *
   * **requires** `user` exists and has default TextSettings
   *
   * **effects** returns the ID of the default TextSettings for the specified user.
   */
  async _getDefaultTextSettingsForUser(
    { user }: { user: User },
  ): Promise<Array<{ settings: TextSettings }> | { error: string }> {
    const userDoc = await this.usersCollection.findOne({ _id: user });
    if (!userDoc || !userDoc.defaultTextSettings) {
      return { error: `User ${user} does not have default TextSettings.` };
    }
    return [{ settings: userDoc.defaultTextSettings }];
  }

  /**
   * _getCurrentTextSettingsForDocument(document: Document): (settings: TextSettings)
   *
   * **requires** `document` exists and has current TextSettings
   *
   * **effects** returns the ID of the current TextSettings for the specified document.
   */
  async _getCurrentTextSettingsForDocument(
    { document }: { document: Document },
  ): Promise<Array<{ settings: TextSettings }> | { error: string }> {
    const documentDoc = await this.documentsCollection.findOne({ _id: document });
    if (!documentDoc || !documentDoc.currentTextSettings) {
      return { error: `Document ${document} does not have current TextSettings.` };
    }
    return [{ settings: documentDoc.currentTextSettings }];
  }
}
```
