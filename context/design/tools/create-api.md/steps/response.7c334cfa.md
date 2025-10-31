---
timestamp: 'Fri Oct 24 2025 19:48:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_194833.5ffe9980.md]]'
content_id: 7c334cfaf789462bbd8d2855fbe5aa6085a28f10a26572f6473253bfd772edb2
---

# response:

To implement the `FocusStats` concept, we will create a TypeScript class `FocusStatsConcept`. This class will manage two MongoDB collections corresponding to `FocusSessions` and `FocusStats` as defined in the concept's state.

We will adhere to the concept design principles:

* **Independence**: No external concept imports.
* **Modularity**: Actions and queries are self-contained.
* **API Structure**: Actions and queries accept/return single dictionary objects (or an array of dictionary objects for queries).
* **Error Handling**: Normal errors are returned as `{ error: string }`.
* **Persistence**: MongoDB collections are used for state.
* **Documentation**: Inline comments capture the purpose, requirements, and effects of each method.

**Generic Type and Internal Entity Mappings:**

* `User`, `Document`, `Library` are external IDs, so they map to `ID`.
* `FocusSession` and `FocusStats` are entities managed by this concept, so we define interfaces for their MongoDB document structure and use `ID` for their references.

```typescript
// file: src/concepts/FocusStats/FocusStatsConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Define the prefix for MongoDB collection names to ensure concept isolation
const PREFIX = "FocusStats" + ".";

// Generic types from the concept specification, treated as opaque IDs
type User = ID;
type Document = ID;
type Library = ID; // Although not a type parameter in the concept name, it's used in preconditions

// Internal entity IDs managed by this concept
type FocusSessionID = ID;
type FocusStatsID = ID;

/**
 * Interface representing a FocusSession document in the database.
 * Corresponds to:
 * a set of FocusSessions with:
 *   a user User
 *   a document Document
 *   a startTime Datetime
 *   an optional endTime Datetime
 */
interface FocusSessionDocument {
  _id: FocusSessionID;
  user: User;
  document: Document;
  startTime: Date;
  endTime: Date | null;
}

/**
 * Interface representing a FocusStats document in the database.
 * Corresponds to:
 * a set of FocusStats with:
 *   a user User
 *   a set of FocusSessions (represented as an array of FocusSession IDs)
 */
interface FocusStatsDocument {
  _id: FocusStatsID;
  user: User;
  focusSessionIds: FocusSessionID[]; // Stores references to FocusSession documents
}

/**
 * **concept** FocusStats
 *
 * **purpose** track and aggregate users' reading statistics
 *
 * **principle** When users read a document, the system automatically tracks the times and lengths of their reading sessions.
 *              Users can see statistics on their reading behavior.
 */
export default class FocusStatsConcept {
  private focusSessionsCollection: Collection<FocusSessionDocument>;
  private focusStatsCollection: Collection<FocusStatsDocument>;

  constructor(private readonly db: Db) {
    this.focusSessionsCollection = this.db.collection(PREFIX + "focusSessions");
    this.focusStatsCollection = this.db.collection(PREFIX + "focusStats");
  }

  /**
   * initUser(user: User): (focusStats: FocusStatsID)
   *
   * **requires** user exists (external ID, validity assumed) and does not yet have a FocusStats object.
   *
   * **effects** Creates a new FocusStats document for the given user with an empty set of FocusSession IDs.
   *            Returns the ID of the newly created FocusStats object.
   */
  async initUser(input: { user: User }): Promise<{ focusStats: FocusStatsID } | { error: string }> {
    const { user } = input;

    // Precondition: user does not have a focusStats object
    const existingFocusStats = await this.focusStatsCollection.findOne({ user });
    if (existingFocusStats) {
      return { error: `User ${user} already has FocusStats initialized.` };
    }

    const newFocusStatsId = freshID();
    const newFocusStats: FocusStatsDocument = {
      _id: newFocusStatsId,
      user: user,
      focusSessionIds: [], // Start with an empty array of session references
    };

    await this.focusStatsCollection.insertOne(newFocusStats);

    return { focusStats: newFocusStatsId };
  }

  /**
   * startSession(user: User, document: Document, library: Library): (focusSession: FocusSessionID)
   *
   * **requires** user has document in their library (external check, assumed true for this concept's scope).
   *            User has a FocusStats object initialized.
   *
   * **effects** Creates a new FocusSession document with the provided user and document,
   *            setting startTime to the current time and endTime to null.
   *            Returns the ID of the newly created FocusSession.
   */
  async startSession(
    input: { user: User; document: Document; library: Library },
  ): Promise<{ focusSession: FocusSessionID } | { error: string }> {
    const { user, document } = input;
    // 'library' parameter is for external precondition checking; not stored in this concept's state.

    // Precondition: user has a focusStats object initialized
    const userFocusStats = await this.focusStatsCollection.findOne({ user });
    if (!userFocusStats) {
      return { error: `User ${user} does not have FocusStats initialized.` };
    }

    const newFocusSessionId = freshID();
    const newSession: FocusSessionDocument = {
      _id: newFocusSessionId,
      user: user,
      document: document,
      startTime: new Date(),
      endTime: null, // Session has just started
    };

    await this.focusSessionsCollection.insertOne(newSession);

    return { focusSession: newFocusSessionId };
  }

  /**
   * endSession(focusSession: FocusSessionID): (focusSession: FocusSessionID)
   *
   * **requires** The specified focusSession exists and its endTime is currently null.
   *
   * **effects** Sets the focusSession's endTime to the current time.
   *            Adds the ID of the ended focusSession to the corresponding user's FocusStats object.
   *            Returns the ID of the updated FocusSession.
   */
  async endSession(
    input: { focusSession: FocusSessionID },
  ): Promise<{ focusSession: FocusSessionID } | { error: string }> {
    const { focusSession: sessionId } = input;

    // Precondition: focusSession exists and has endTime of null
    const session = await this.focusSessionsCollection.findOne({
      _id: sessionId,
    });
    if (!session) {
      return { error: `FocusSession ${sessionId} not found.` };
    }
    if (session.endTime !== null) {
      return { error: `FocusSession ${sessionId} has already ended.` };
    }

    const updatedEndTime = new Date();

    // Effect 1: Update the session document in the focusSessionsCollection
    await this.focusSessionsCollection.updateOne(
      { _id: sessionId },
      { $set: { endTime: updatedEndTime } },
    );

    // Effect 2: Add the session ID to the user's FocusStats focusSessionIds array
    const user = session.user;
    await this.focusStatsCollection.updateOne(
      { user: user },
      { $addToSet: { focusSessionIds: sessionId } }, // $addToSet prevents adding duplicates if already present
    );

    return { focusSession: sessionId };
  }

  /**
   * removeSession(focusSession: FocusSessionID): Empty
   *
   * **effects** Removes the specified focusSession document from the FocusSessions collection.
   *            Removes the reference to this focusSession ID from the user's FocusStats object.
   */
  async removeSession(
    input: { focusSession: FocusSessionID },
  ): Promise<Empty | { error: string }> {
    const { focusSession: sessionId } = input;

    const session = await this.focusSessionsCollection.findOne({
      _id: sessionId,
    });
    if (!session) {
      // It's often good practice for removal to be idempotent.
      // However, if the caller strictly requires the session to exist prior to removal,
      // returning an error is appropriate. Let's return an error for explicit preconditions.
      return { error: `FocusSession ${sessionId} not found.` };
    }

    // Effect 1: Remove the session document
    await this.focusSessionsCollection.deleteOne({ _id: sessionId });

    // Effect 2: Remove the session ID reference from the user's FocusStats
    const user = session.user;
    await this.focusStatsCollection.updateOne(
      { user: user },
      { $pull: { focusSessionIds: sessionId } }, // $pull removes all occurrences of the value
    );

    return {};
  }

  /**
   * _viewStats(user: User): (focusStats: { id: FocusStatsID; user: User; focusSessionIds: FocusSessionID[] })[]
   *
   * **requires** User is associated with a FocusStats object.
   *
   * **effects** Returns an array containing the FocusStats object for the given user,
   *            including its ID, user ID, and an array of referenced FocusSession IDs.
   *            Queries always return an array of dictionaries.
   */
  async _viewStats(
    input: { user: User },
  ): Promise<
    Array<{
      focusStats: Omit<FocusStatsDocument, "_id"> & { id: FocusStatsID };
    }> | { error: string }
  > {
    const { user } = input;

    // Precondition: user is associated with a focusStats object
    const userFocusStats = await this.focusStatsCollection.findOne({ user });

    if (!userFocusStats) {
      return { error: `FocusStats not found for user ${user}.` };
    }

    // Transform _id to id as per typical API response patterns for clarity and consistency
    const resultStats = {
      id: userFocusStats._id,
      user: userFocusStats.user,
      focusSessionIds: userFocusStats.focusSessionIds,
    };

    return [{ focusStats: resultStats }];
  }

  /**
   * _getSessions(user: User): (focusSession: FocusSessionDocument)[]
   *
   * **requires** User is associated with a FocusStats object (implying valid user for sessions).
   *
   * **effects** Returns an array containing all FocusSession documents belonging to the given user.
   *            Queries always return an array of dictionaries.
   *            This query provides the full details of the sessions, complementing _viewStats which returns only IDs.
   */
  async _getSessions(
    input: { user: User },
  ): Promise<Array<{ focusSession: FocusSessionDocument }> | { error: string }> {
    const { user } = input;

    // Precondition: Check if the user has FocusStats initialized, to ensure they are a valid user
    const userFocusStats = await this.focusStatsCollection.findOne({ user });
    if (!userFocusStats) {
      return { error: `FocusStats not found for user ${user}. Cannot retrieve sessions.` };
    }

    // Retrieve all focus session documents for this user
    const sessions = await this.focusSessionsCollection.find({ user }).toArray();

    // Map the results to the expected output format (array of dictionaries, each with a 'focusSession' key)
    return sessions.map((session) => ({ focusSession: session }));
  }
}
```
