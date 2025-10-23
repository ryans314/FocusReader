---
timestamp: 'Thu Oct 23 2025 04:07:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_040711.f433e29d.md]]'
content_id: 4613ed8e033634eaface782ebe26287ae6819bb540ac793f135ad51eee7578e4
---

# response:

```typescript
// file: src/TextSettings/TextSettingsConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "TextSettings" + ".";

// Generic types as per the concept specification
type User = ID;
type Document = ID;
type Font = ID; // Font is treated polymorphically, just like User and Document
type TextSettingsID = ID; // The ID type for TextSettings instances themselves

/**
 * Interface representing a single document in the 'textSettings' collection.
 *
 * This structure extends the explicit state description to include `localeId` and `localeType`.
 * This is crucial for correctly implementing the `createSettings` action's requirement
 * ("there is not already a TextSettings with locale") and for ensuring `editSettings`
 * operates on locale-specific settings, aligning with the concept's principle of per-document/user customization.
 */
interface TextSettingsDoc {
  _id: TextSettingsID;
  font: Font;
  fontSize: number;
  lineHeight: number;
  localeId: User | Document;       // The ID of the user or document these settings apply to
  localeType: "User" | "Document"; // Helps distinguish which collection (users/documents) this locale ID belongs to
}

/**
 * Interface representing a document in the 'users' collection, holding a reference
 * to a default TextSettingsID.
 *
 * Corresponds to: `a set of Users with: a default TextSettings`
 */
interface UserDoc {
  _id: User;
  defaultSettings?: TextSettingsID; // Reference to a TextSettings document specific to this user
}

/**
 * Interface representing a document in the 'documents' collection, holding a reference
 * to a current TextSettingsID.
 *
 * Corresponds to: `a set of Documents with: a current TextSettings`
 */
interface DocumentDoc {
  _id: Document;
  currentSettings?: TextSettingsID; // Reference to a TextSettings document specific to this document
}

/**
 * TextSettings Concept
 *
 * purpose: allow users to customize and set different text/display settings for each of their documents
 *
 * principle: When setting up an account, users can create default text display preferences for their account.
 * When opening a new document, users will have their default display settings loaded in.
 * Users can also change their text settings for each documents, which change how the document is displayed and be remembered between sessions.
 */
export default class TextSettingsConcept {
  private textSettings: Collection<TextSettingsDoc>;
  private users: Collection<UserDoc>;
  private documents: Collection<DocumentDoc>;

  constructor(private readonly db: Db) {
    this.textSettings = this.db.collection(PREFIX + "textSettings");
    this.users = this.db.collection(PREFIX + "users");
    this.documents = this.db.collection(PREFIX + "documents");
  }

  /**
   * createSettings(font: Font, fontSize: Number, lineHeight: Number, locale: User | Document): (settings: TextSettings)
   *
   * **requires** there is not already a TextSettings associated with the given `locale`, and `font` is a valid font (validation of `Font` is external to this concept).
   *
   * **effects**
   *   - Creates a new TextSettings entity with the given `font`, `fontSize`, `lineHeight`, and explicitly associates it with the `locale` by storing `localeId` and `localeType`.
   *   - If `locale` is identified as a `User`, sets that user's `defaultSettings` to reference the newly created TextSettings. Creates the `User` entry if it doesn't exist.
   *   - If `locale` is identified as a `Document`, sets that document's `currentSettings` to reference the newly created TextSettings. Creates the `Document` entry if it doesn't exist.
   *   - Returns the ID of the newly created TextSettings.
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
  ): Promise<{ settings: TextSettingsID } | { error: string }> {
    // Check precondition: there is not already a TextSettings with locale.
    // This implies that each locale (User or Document) can only have ONE associated TextSettings document.
    const existingSettingsForLocale = await this.textSettings.findOne({ localeId: locale });
    if (existingSettingsForLocale) {
      return {
        error: `TextSettings already exist for locale: ${locale}. Cannot create new settings.`,
      };
    }

    // Precondition: "font is a valid font"
    // Since 'Font' is a generic ID, this concept cannot validate its existence or properties
    // without a separate 'Font' concept or external validation. We proceed assuming 'font' is valid.

    const newSettingsId = freshID() as TextSettingsID;
    let confirmedLocaleType: "User" | "Document" | null = null;

    // Attempt to link the settings to a User first
    try {
      // Upsert: ensures a User document exists for this locale ID in *this concept's* collection.
      const userUpdateResult = await this.users.updateOne(
        { _id: locale as User },
        { $setOnInsert: { _id: locale as User }, $set: { defaultSettings: newSettingsId } },
        { upsert: true },
      );

      // If a new user document was inserted, or an existing user document was updated
      // AND it didn't already have defaultSettings (checked above),
      // then this locale is confirmed as a User.
      // Or, if userUpdateResult.matchedCount > 0 and userUpdateResult.modifiedCount > 0
      // this means the update was applied, and thus it refers to a User.
      // We rely on the initial `existingSettingsForLocale` check to prevent overwriting existing links.
      if (userUpdateResult.upsertedCount > 0 || (userUpdateResult.matchedCount > 0 && userUpdateResult.modifiedCount > 0)) {
        confirmedLocaleType = "User";
      }
    } catch (e) {
      // Ignore potential database errors here as we'll try Document next,
      // or a comprehensive error will be returned at the end.
    }

    // If not confirmed as a User, attempt to link as a Document
    if (confirmedLocaleType === null) {
      try {
        const documentUpdateResult = await this.documents.updateOne(
          { _id: locale as Document },
          { $setOnInsert: { _id: locale as Document }, $set: { currentSettings: newSettingsId } },
          { upsert: true },
        );

        if (documentUpdateResult.upsertedCount > 0 || (documentUpdateResult.matchedCount > 0 && documentUpdateResult.modifiedCount > 0)) {
          confirmedLocaleType = "Document";
        }
      } catch (e) {
        // Ignore for now.
      }
    }

    // If after attempting both, we still can't determine or link the locale type
    if (confirmedLocaleType === null) {
      return {
        error: `Locale ID ${locale} could not be identified as an existing User or Document, nor could a new link be established.`,
      };
    }

    const newSettings: TextSettingsDoc = {
      _id: newSettingsId,
      font,
      fontSize,
      lineHeight,
      localeId: locale,
      localeType: confirmedLocaleType,
    };

    try {
      // Effect: creates settings with font, fontSize, lineHeight, and locale
      await this.textSettings.insertOne(newSettings);
      return { settings: newSettingsId };
    } catch (e) {
      // If `TextSettings` insertion fails, we need to roll back the `users` or `documents` update.
      if (confirmedLocaleType === "User") {
        await this.users.updateOne({ _id: locale as User }, { $unset: { defaultSettings: "" } });
      } else {
        await this.documents.updateOne({ _id: locale as Document }, { $unset: { currentSettings: "" } });
      }
      return { error: `Failed to create settings: ${e.message}` };
    }
  }

  /**
   * editSettings(textSettings: TextSettings, font: Font, fontSize: Number, lineHeight: Number): (settings: TextSettings)
   *
   * **requires** `textSettings` (the ID of a TextSettings entity) exists.
   *
   * **effects** Changes the specified TextSettings entity to have the new `font`, `fontSize`, and `lineHeight`.
   *   Returns the ID of the updated TextSettings.
   */
  async editSettings(
    {
      textSettings: textSettingsId, // Renamed for clarity to distinguish from the collection
      font,
      fontSize,
      lineHeight,
    }: {
      textSettings: TextSettingsID;
      font: Font;
      fontSize: number;
      lineHeight: number;
    },
  ): Promise<{ settings: TextSettingsID } | { error: string }> {
    // Check precondition: textSettings exists
    const existingSettings = await this.textSettings.findOne({ _id: textSettingsId });
    if (!existingSettings) {
      return { error: `TextSettings with ID ${textSettingsId} not found.` };
    }

    try {
      // Effect: changes textSettings to have fontSize, lineHeight, and font
      await this.textSettings.updateOne(
        { _id: textSettingsId },
        { $set: { font, fontSize, lineHeight } },
      );
      return { settings: textSettingsId }; // Return the ID of the updated settings
    } catch (e) {
      // Catch any unexpected database or other errors
      return { error: `Failed to edit settings: ${e.message}` };
    }
  }

  // --- Concept Queries ---
  // Queries are prefixed with an underscore '_' and return arrays of dictionaries.

  /**
   * _getSettingsByLocale({ localeId }): (settings: TextSettingsDoc)
   *
   * **requires** a TextSettings document associated with the given `localeId` exists.
   *
   * **effects** Returns the TextSettings document associated with the `localeId`.
   */
  async _getSettingsByLocale(
    { localeId }: { localeId: User | Document },
  ): Promise<TextSettingsDoc[] | { error: string }> {
    // Find settings that are directly associated with this locale ID, regardless of its specific type (User/Document)
    const settings = await this.textSettings.find({ localeId }).toArray();
    if (settings.length === 0) {
      return { error: `No TextSettings found directly associated with locale ID: ${localeId}` };
    }
    return settings;
  }

  /**
   * _getUserDefaultSettings(user: User): (settings: TextSettingsDoc)
   *
   * **requires** the `user` exists in this concept's collection and has a `defaultSettings` reference.
   *
   * **effects** Returns the TextSettings document that is referenced as the default for the specified `user`.
   */
  async _getUserDefaultSettings(
    { user }: { user: User },
  ): Promise<TextSettingsDoc[] | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc || !userDoc.defaultSettings) {
      return { error: `User ${user} not found or has no default settings linked.` };
    }
    // Fetch the actual TextSettings document using the reference ID
    const settings = await this.textSettings.find({ _id: userDoc.defaultSettings, localeId: user, localeType: "User" }).toArray();
    if (settings.length === 0) {
      // This indicates a broken reference or a mismatch in localeId/localeType within the TextSettings document itself.
      return { error: `Default settings ID ${userDoc.defaultSettings} for user ${user} not found or data mismatch.` };
    }
    return settings;
  }

  /**
   * _getDocumentCurrentSettings(document: Document): (settings: TextSettingsDoc)
   *
   * **requires** the `document` exists in this concept's collection and has a `currentSettings` reference.
   *
   * **effects** Returns the TextSettings document that is referenced as current for the specified `document`.
   */
  async _getDocumentCurrentSettings(
    { document }: { document: Document },
  ): Promise<TextSettingsDoc[] | { error: string }> {
    const documentDoc = await this.documents.findOne({ _id: document });
    if (!documentDoc || !documentDoc.currentSettings) {
      return { error: `Document ${document} not found or has no current settings linked.` };
    }
    // Fetch the actual TextSettings document using the reference ID
    const settings = await this.textSettings.find({ _id: documentDoc.currentSettings, localeId: document, localeType: "Document" }).toArray();
    if (settings.length === 0) {
      // This indicates a broken reference or a mismatch in localeId/localeType within the TextSettings document itself.
      return { error: `Current settings ID ${documentDoc.currentSettings} for document ${document} not found or data mismatch.` };
    }
    return settings;
  }

  /**
   * _getSettingsById(settingsId: TextSettingsID): (settings: TextSettingsDoc)
   *
   * **requires** the TextSettings document with the given `settingsId` exists.
   *
   * **effects** Returns the TextSettings document identified by `settingsId`.
   */
  async _getSettingsById(
    { settingsId }: { settingsId: TextSettingsID },
  ): Promise<TextSettingsDoc[] | { error: string }> {
    const settings = await this.textSettings.find({ _id: settingsId }).toArray();
    if (settings.length === 0) {
      return { error: `TextSettings with ID ${settingsId} not found.` };
    }
    return settings;
  }
}
```
