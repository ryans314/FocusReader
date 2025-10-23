---
timestamp: 'Thu Oct 23 2025 02:13:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_021327.98b236fe.md]]'
content_id: ccccc4f470c7f7d140cf3aea3c4a9b6716603d877fe91adcb8db4c9404ae49b8
---

# file: src/concepts/Library/LibraryConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Library" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;

/**
 * a set of LibraryItems with
 *   title: String
 *   author: String
 *   available: Boolean
 *   borrowedBy: Optional User // null if available
 */
interface LibraryItem {
  _id: Item;
  title: string;
  author: string;
  available: boolean;
  borrowedBy: User | null;
}

/**
 * a set of LibraryUsers with
 *   name: String
 *   borrowedItemIds: set of Item // IDs of items currently borrowed by this user
 */
interface LibraryUser {
  _id: User;
  name: string;
  borrowedItemIds: Item[]; // Storing only IDs for consistency and reduced redundancy
}

/**
 * LibraryConcept
 *
 * purpose: To enable users to borrow and return items, managing their availability.
 */
export default class LibraryConcept {
  items: Collection<LibraryItem>;
  users: Collection<LibraryUser>;

  constructor(private readonly db: Db) {
    this.items = this.db.collection(PREFIX + "items");
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * registerUser (name: String): (user: User)
   *
   * **requires** true (allows multiple users with the same name, as _id is the unique identifier)
   *
   * **effects** creates a new LibraryUser `u`; sets the name of `u` to `name`;
   *             initializes `u.borrowedItemIds` as an empty array; returns `u._id` as `user`
   */
  async registerUser({ name }: { name: string }): Promise<{ user: User }> {
    const newUser: LibraryUser = {
      _id: freshID() as User, // Generate a fresh ID for the new user
      name,
      borrowedItemIds: [],
    };
    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * createItem (title: String, author: String): (item: Item)
   *
   * **requires** true (allows multiple items with the same title/author, as _id is the unique identifier for each copy)
   *
   * **effects** creates a new LibraryItem `i`; sets its title, author;
   *             sets `i.available` to true; sets `i.borrowedBy` to null; returns `i._id` as `item`
   */
  async createItem({
    title,
    author,
  }: {
    title: string;
    author: string;
  }): Promise<{ item: Item }> {
    const newItem: LibraryItem = {
      _id: freshID() as Item, // Generate a fresh ID for the new item
      title,
      author,
      available: true,
      borrowedBy: null,
    };
    await this.items.insertOne(newItem);
    return { item: newItem._id };
  }

  /**
   * borrowItem (user: User, item: Item): (error: String)
   *
   * **requires** user exists, item exists, item is available, and user has not already borrowed this specific item
   *
   * **effects** sets `item.available` to false; sets `item.borrowedBy` to `user`;
   *             adds `item` to `user.borrowedItemIds`
   */
  async borrowItem({
    user,
    item,
  }: {
    user: User;
    item: Item;
  }): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: "User not found" };
    }

    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: "Item not found" };
    }

    if (!existingItem.available) {
      return { error: "Item is not available for borrowing" };
    }

    // Check if the user has already borrowed this specific item.
    // This provides a more specific error than just letting $addToSet handle it.
    if (existingItem.borrowedBy === user || existingUser.borrowedItemIds.includes(item)) {
        return { error: "User has already borrowed this item" };
    }

    // Update item: set to unavailable and assign to borrower
    await this.items.updateOne(
      { _id: item },
      { $set: { available: false, borrowedBy: user } },
    );

    // Update user: add item ID to their list of borrowed items
    await this.users.updateOne(
      { _id: user },
      { $addToSet: { borrowedItemIds: item } }, // $addToSet prevents duplicate entries in the array
    );

    return {}; // Return empty object for successful completion
  }

  /**
   * returnItem (user: User, item: Item): (error: String)
   *
   * **requires** user exists, item exists, item is not available, and `item.borrowedBy` is `user`
   *
   * **effects** sets `item.available` to true; sets `item.borrowedBy` to null;
   *             removes `item` from `user.borrowedItemIds`
   */
  async returnItem({
    user,
    item,
  }: {
    user: User;
    item: Item;
  }): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: "User not found" };
    }

    const existingItem = await this.items.findOne({ _id: item });
    if (!existingItem) {
      return { error: "Item not found" };
    }

    if (existingItem.available) {
      return { error: "Item is already available (not currently borrowed)" };
    }

    if (existingItem.borrowedBy !== user) {
      return { error: "Item was not borrowed by this user" };
    }

    // Update item: set to available and remove borrower
    await this.items.updateOne(
      { _id: item },
      { $set: { available: true, borrowedBy: null } },
    );

    // Update user: remove item ID from their list of borrowed items
    await this.users.updateOne(
      { _id: user },
      { $pull: { borrowedItemIds: item } },
    );

    return {}; // Return empty object for successful completion
  }

  /**
   * _getAvailableItems (): (item: Item, title: String, author: String)[]
   *
   * **requires** true
   *
   * **effects** returns an array of all items that are currently available,
   *             including their ID, title, and author
   */
  async _getAvailableItems(): Promise<
    { item: Item; title: string; author: string }[]
  > {
    const availableItems = await this.items
      .find({ available: true })
      .project({ _id: 1, title: 1, author: 1 }) // Project only necessary fields
      .toArray();
    return availableItems.map((doc) => ({
      item: doc._id,
      title: doc.title,
      author: doc.author,
    }));
  }

  /**
   * _getBorrowedItemsByUser (user: User): (item: Item, title: String, author: String)[]
   *
   * **requires** user exists
   *
   * **effects** returns an array of all items borrowed by the specified user,
   *             including their ID, title, and author
   */
  async _getBorrowedItemsByUser({
    user,
  }: {
    user: User;
  }): Promise<{ item: Item; title: string; author: string }[] | { error: string }[]> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      // Queries return arrays, so wrap error in an array.
      return [{ error: "User not found" }];
    }

    const borrowedItems = await this.items
      .find({ borrowedBy: user })
      .project({ _id: 1, title: 1, author: 1 }) // Project only necessary fields
      .toArray();

    return borrowedItems.map((doc) => ({
      item: doc._id,
      title: doc.title,
      author: doc.author,
    }));
  }

  /**
   * _getUserBorrowCount (user: User): (count: Number)[]
   *
   * **requires** user exists
   *
   * **effects** returns an array containing a single object with the count of items borrowed by the specified user
   */
  async _getUserBorrowCount({ user }: { user: User }): Promise<{ count: number }[] | { error: string }[]> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return [{ error: "User not found" }]; // Queries return arrays, so wrap error in an array.
    }

    // Count directly from the items collection where borrowedBy matches the user ID
    const count = await this.items.countDocuments({ borrowedBy: user });

    return [{ count }]; // Return as an array of a single object
  }
}
```
